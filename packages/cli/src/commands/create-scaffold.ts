import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

// --- Types ---

export interface CreateOptions {
  name: string
  version: string
  description: string
  skills: string[]
  agents: string[]
  commands: string[]
}

// --- Validation ---

export const KEBAB_CASE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/
export const SEMVER = /^\d+\.\d+\.\d+$/

export function isValidKebabCase(value: string): boolean {
  return KEBAB_CASE.test(value)
}

export function isValidSemVer(value: string): boolean {
  return SEMVER.test(value)
}

// --- Template generation ---

function toTitleCase(kebab: string): string {
  return kebab
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function skillTemplate(name: string): string {
  return `# ${toTitleCase(name)}

<!-- This is a starter skill template. Replace this content with your skill's instructions. -->
<!-- Skills provide reusable knowledge and guidelines that agents and commands can reference. -->
<!-- A skill needs a description (required) and a prompt — the description helps consumers -->
<!-- decide whether to use this skill. -->

## Purpose

Describe what this skill teaches or what guidelines it provides.

## Guidelines

- Add your skill's guidelines here
- Each guideline should be clear and actionable
`
}

function agentTemplate(name: string): string {
  return `# ${toTitleCase(name)}

<!-- This is a starter agent template. Replace this content with your agent's prompt. -->
<!-- Agents are AI assistant personas with specific roles, behaviors, and tool access. -->

## Role

Describe this agent's role and responsibilities.

## Behavior

- Define how this agent should behave
- Specify what tools it should use
- Describe its communication style
`
}

function commandTemplate(name: string): string {
  return `# ${toTitleCase(name)}

<!-- This is a starter command template. Replace this content with your command's prompt. -->
<!-- Commands are user-invokable actions that perform specific tasks. -->

## Task

Describe what this command does when invoked.

## Steps

1. First step
2. Second step
3. Final step
`
}

// --- Manifest generation ---

export function generateManifestYaml(opts: CreateOptions): string {
  const lines: string[] = []
  lines.push(`name: ${opts.name}`)
  lines.push(`version: "${opts.version}"`)
  if (opts.description) {
    lines.push(`description: "${opts.description}"`)
  }
  lines.push('')

  if (opts.skills.length > 0) {
    lines.push('skills:')
    for (const skill of opts.skills) {
      lines.push(`  ${skill}:`)
      lines.push(`    description: "A ${toTitleCase(skill)} skill"`)
      lines.push(`    prompt: { file: skills/${skill}.md }`)
    }
    lines.push('')
  }

  if (opts.agents.length > 0) {
    lines.push('agents:')
    for (const agent of opts.agents) {
      lines.push(`  ${agent}:`)
      lines.push(`    description: "A ${toTitleCase(agent)} agent"`)
      lines.push(`    prompt: { file: agents/${agent}.md }`)
    }
    lines.push('')
  }

  if (opts.commands.length > 0) {
    lines.push('commands:')
    for (const command of opts.commands) {
      lines.push(`  ${command}:`)
      lines.push(`    description: "A ${toTitleCase(command)} command"`)
      lines.push(`    prompt: { file: commands/${command}.md }`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

// --- File listing preview ---

export function previewFiles(opts: CreateOptions): string[] {
  const files: string[] = ['facet.yaml']
  for (const skill of opts.skills) {
    files.push(`skills/${skill}.md`)
  }
  for (const agent of opts.agents) {
    files.push(`agents/${agent}.md`)
  }
  for (const command of opts.commands) {
    files.push(`commands/${command}.md`)
  }
  return files
}

// --- Scaffold writing ---

export async function writeScaffold(opts: CreateOptions, targetDir: string): Promise<string[]> {
  const files: string[] = []

  // Write manifest
  const manifestPath = join(targetDir, 'facet.yaml')
  await Bun.write(manifestPath, generateManifestYaml(opts))
  files.push('facet.yaml')

  // Write skill files
  for (const skill of opts.skills) {
    await mkdir(join(targetDir, 'skills'), { recursive: true })
    await Bun.write(join(targetDir, `skills/${skill}.md`), skillTemplate(skill))
    files.push(`skills/${skill}.md`)
  }

  // Write agent files
  for (const agent of opts.agents) {
    await mkdir(join(targetDir, 'agents'), { recursive: true })
    await Bun.write(join(targetDir, `agents/${agent}.md`), agentTemplate(agent))
    files.push(`agents/${agent}.md`)
  }

  // Write command files
  for (const command of opts.commands) {
    await mkdir(join(targetDir, 'commands'), { recursive: true })
    await Bun.write(join(targetDir, `commands/${command}.md`), commandTemplate(command))
    files.push(`commands/${command}.md`)
  }

  return files
}
