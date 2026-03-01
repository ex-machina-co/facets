import path from 'node:path'
import yaml from 'js-yaml'
import { getCacheDir } from '../discovery/cache.ts'
import { localFacetsDir } from '../registry/files.ts'
import { loadManifest } from '../registry/loader.ts'
import { type FacetManifest, normalizeRequires, resolvePromptPath } from '../registry/schemas.ts'

// --- Prerequisite checking ---

const PREREQ_CONFIRMED_DIR = `${process.env.XDG_STATE_HOME ?? `${process.env.HOME}/.local/state`}/facets/prereqs`

interface PrereqSuccess {
  success: true
}

interface PrereqFailure {
  success: false
  command: string
  exitCode: number
  output: string
}

type PrereqResult = PrereqSuccess | PrereqFailure

function requiresHash(commands: string[]): string {
  const sorted = [...commands].sort()
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(sorted.join('\0'))
  return hasher.digest('hex')
}

async function isPrereqConfirmed(facetName: string, commands: string[]): Promise<boolean> {
  const file = Bun.file(`${PREREQ_CONFIRMED_DIR}/${facetName}`)
  if (!(await file.exists())) return false
  const stored = (await file.text()).trim()
  return stored === requiresHash(commands)
}

async function markPrereqConfirmed(facetName: string, commands: string[]): Promise<void> {
  await Bun.$`mkdir -p ${PREREQ_CONFIRMED_DIR}`
  await Bun.write(`${PREREQ_CONFIRMED_DIR}/${facetName}`, requiresHash(commands))
}

async function runPrereqChecks(commands: string[]): Promise<PrereqResult> {
  for (const command of commands) {
    const result = await Bun.$`${{ raw: command }}`.nothrow().quiet()
    if (result.exitCode !== 0) {
      return {
        success: false,
        command,
        exitCode: result.exitCode,
        output: (result.stderr.toString() + result.stdout.toString()).trim(),
      }
    }
  }
  return { success: true }
}

// --- Agent/Command frontmatter assembly ---

interface AgentFrontmatter {
  description?: string
  tools?: Record<string, boolean> | string[]
  [key: string]: unknown
}

function assembleAgentFile(promptBody: string, descriptor: NonNullable<FacetManifest['agents']>[string]): string {
  const fm: AgentFrontmatter = {}
  if (descriptor.description) fm.description = descriptor.description
  const opencode = descriptor.platforms?.opencode
  if (opencode?.tools) fm.tools = opencode.tools

  const frontmatter = yaml.dump(fm, { lineWidth: -1, noRefs: true }).trim()
  return `---\n${frontmatter}\n---\n\n${promptBody}`
}

function assembleCommandFile(promptBody: string, descriptor: NonNullable<FacetManifest['commands']>[string]): string {
  const fm: Record<string, unknown> = {}
  if (descriptor.description) fm.description = descriptor.description

  const frontmatter = yaml.dump(fm, { lineWidth: -1, noRefs: true }).trim()
  return `---\n${frontmatter}\n---\n\n${promptBody}`
}

// --- Result types ---

export interface InstallSuccess {
  success: true
  facet: string
  resources: { name: string; type: string }[]
}

export interface InstallNotFound {
  success: false
  facet: string
  reason: 'not_found'
}

export interface InstallPrereqFailure {
  success: false
  facet: string
  reason: 'prereq'
  failure: { command: string; exitCode: number; output: string }
}

export interface InstallCopyFailure {
  success: false
  facet: string
  reason: 'copy'
  error: string
}

export type InstallResult = InstallSuccess | InstallNotFound | InstallPrereqFailure | InstallCopyFailure

// --- Options ---

export interface InstallOptions {
  /** If true, skip interactive prereq approval (for programmatic use) */
  skipPrereqApproval?: boolean
  /** If true, force re-run prereq checks even if already confirmed */
  forcePrereqCheck?: boolean
  /** Callback to ask user for prereq approval. Returns true if approved. */
  onPrereqApproval?: (commands: string[]) => Promise<boolean>
}

/**
 * Resolve the facet directory — checks local first, then cache.
 */
async function resolveFacetDir(name: string, projectRoot: string): Promise<string | null> {
  const localDir = `${localFacetsDir(projectRoot)}/${name}`
  const localManifest = `${localDir}/facet.yaml`
  if (await Bun.file(localManifest).exists()) return localDir

  const cacheDir = getCacheDir(name)
  const cacheManifest = `${cacheDir}/facet.yaml`
  if (await Bun.file(cacheManifest).exists()) return cacheDir

  return null
}

/**
 * Install a named facet, copying its resources to the active OpenCode directories.
 */
export async function installFacet(
  name: string,
  projectRoot: string,
  options: InstallOptions = {},
): Promise<InstallResult> {
  const facetDir = await resolveFacetDir(name, projectRoot)
  if (!facetDir) {
    return { success: false, facet: name, reason: 'not_found' }
  }

  const manifestResult = await loadManifest(`${facetDir}/facet.yaml`)
  if (!manifestResult.success) {
    return { success: false, facet: name, reason: 'not_found' }
  }

  const manifest = manifestResult.manifest
  const base = `${projectRoot}/.opencode`

  // Prerequisites
  const requires = normalizeRequires(manifest.requires)
  if (requires.length > 0) {
    const alreadyConfirmed = !options.forcePrereqCheck && (await isPrereqConfirmed(name, requires))

    if (!alreadyConfirmed) {
      // Ask for approval if handler is provided
      if (options.onPrereqApproval) {
        const approved = await options.onPrereqApproval(requires)
        if (!approved) {
          return {
            success: false,
            facet: name,
            reason: 'prereq',
            failure: { command: '(user declined)', exitCode: -1, output: 'Prerequisite approval declined' },
          }
        }
      }

      // Run checks
      const prereqResult = await runPrereqChecks(requires)
      if (!prereqResult.success) {
        return { success: false, facet: name, reason: 'prereq', failure: prereqResult }
      }

      // Mark confirmed
      await markPrereqConfirmed(name, requires)
    }
  }

  // Install resources
  const installed: { name: string; type: string }[] = []

  try {
    // Skills — copy entire directory
    for (const skill of manifest.skills ?? []) {
      const src = `${facetDir}/skills/${skill}/SKILL.md`
      const dst = `${base}/skills/${skill}/SKILL.md`
      await Bun.$`mkdir -p ${path.dirname(dst)}`
      await Bun.$`cp ${src} ${dst}`
      installed.push({ name: skill, type: 'skill' })
    }

    // Agents — read prompt body, assemble with frontmatter
    for (const [agentName, descriptor] of Object.entries(manifest.agents ?? {})) {
      const promptPath = resolvePromptPath(descriptor.prompt)
      if (!promptPath) continue
      const promptBody = await Bun.file(`${facetDir}/${promptPath}`).text()
      const assembled = assembleAgentFile(promptBody, descriptor)
      const dst = `${base}/agents/${agentName}.md`
      await Bun.$`mkdir -p ${path.dirname(dst)}`
      await Bun.write(dst, assembled)
      installed.push({ name: agentName, type: 'agent' })
    }

    // Commands — read prompt body, assemble with frontmatter
    for (const [cmdName, descriptor] of Object.entries(manifest.commands ?? {})) {
      const promptPath = resolvePromptPath(descriptor.prompt)
      if (!promptPath) continue
      const promptBody = await Bun.file(`${facetDir}/${promptPath}`).text()
      const assembled = assembleCommandFile(promptBody, descriptor)
      const dst = `${base}/commands/${cmdName}.md`
      await Bun.$`mkdir -p ${path.dirname(dst)}`
      await Bun.write(dst, assembled)
      installed.push({ name: cmdName, type: 'command' })
    }

    // Platform tools — copy directly
    for (const tool of manifest.platforms?.opencode?.tools ?? []) {
      const src = `${facetDir}/opencode/tools/${tool}.ts`
      const dst = `${base}/tools/${tool}.ts`
      await Bun.$`mkdir -p ${path.dirname(dst)}`
      await Bun.$`cp ${src} ${dst}`
      installed.push({ name: tool, type: 'tool' })
    }
  } catch (err) {
    return { success: false, facet: name, reason: 'copy', error: String(err) }
  }

  return { success: true, facet: name, resources: installed }
}
