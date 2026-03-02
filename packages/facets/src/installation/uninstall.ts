import { rm } from 'node:fs/promises'
import { getCacheDir } from '../discovery/cache.ts'
import { localFacetsDir, readFacetsYaml, writeFacetsYaml } from '../registry/files.ts'
import { loadManifest } from '../registry/loader.ts'

export interface UninstallSuccess {
  success: true
  facet: string
  removed: { name: string; type: string }[]
}

export interface UninstallNotFound {
  success: false
  facet: string
  reason: 'not_found'
}

export interface UninstallError {
  success: false
  facet: string
  reason: 'error'
  error: string
}

export type UninstallResult = UninstallSuccess | UninstallNotFound | UninstallError

/**
 * Uninstall a facet: remove its installed resource files and remove
 * it from facets.yaml.
 */
export async function uninstallFacet(name: string, projectRoot: string): Promise<UninstallResult> {
  // Find the manifest (local or cached) to know what to remove
  const localDir = `${localFacetsDir(projectRoot)}/${name}`
  const cacheDir = getCacheDir(name)

  let manifestPath: string | null = null
  if (await Bun.file(`${localDir}/facet.yaml`).exists()) {
    manifestPath = `${localDir}/facet.yaml`
  } else if (await Bun.file(`${cacheDir}/facet.yaml`).exists()) {
    manifestPath = `${cacheDir}/facet.yaml`
  }

  if (!manifestPath) {
    return { success: false, facet: name, reason: 'not_found' }
  }

  const manifestResult = await loadManifest(manifestPath)
  if (!manifestResult.success) {
    return { success: false, facet: name, reason: 'error', error: manifestResult.error }
  }

  const manifest = manifestResult.manifest
  const base = `${projectRoot}/.opencode`
  const removed: { name: string; type: string }[] = []

  try {
    // Remove skills
    for (const skill of manifest.skills ?? []) {
      const skillDir = `${base}/skills/${skill}`
      try {
        await rm(skillDir, { recursive: true, force: true })
        removed.push({ name: skill, type: 'skill' })
      } catch {
        // Already gone
      }
    }

    // Remove agents
    for (const agentName of Object.keys(manifest.agents ?? {})) {
      const agentFile = `${base}/agents/${agentName}.md`
      try {
        await rm(agentFile, { force: true })
        removed.push({ name: agentName, type: 'agent' })
      } catch {
        // Already gone
      }
    }

    // Remove commands
    for (const cmdName of Object.keys(manifest.commands ?? {})) {
      const cmdFile = `${base}/commands/${cmdName}.md`
      try {
        await rm(cmdFile, { force: true })
        removed.push({ name: cmdName, type: 'command' })
      } catch {
        // Already gone
      }
    }

    // Remove platform tools
    for (const tool of manifest.platforms?.opencode?.tools ?? []) {
      const toolFile = `${base}/tools/${tool}.ts`
      try {
        await rm(toolFile, { force: true })
        removed.push({ name: tool, type: 'tool' })
      } catch {
        // Already gone
      }
    }
  } catch (err) {
    return { success: false, facet: name, reason: 'error', error: String(err) }
  }

  // Remove from facets.yaml
  const facetsYaml = await readFacetsYaml(projectRoot)
  if (facetsYaml.remote?.[name]) {
    delete facetsYaml.remote[name]
    await writeFacetsYaml(projectRoot, facetsYaml)
  }
  if (facetsYaml.local?.includes(name)) {
    facetsYaml.local = facetsYaml.local.filter((n) => n !== name)
    await writeFacetsYaml(projectRoot, facetsYaml)
  }

  return { success: true, facet: name, removed }
}
