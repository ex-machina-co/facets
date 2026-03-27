import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Command } from '../cli/commands.ts'

// --- Scaffold generation ---

interface CreateOptions {
  name: string
  version: string
  description: string
  skills: boolean
  agents: boolean
  commands: boolean
}

function generateManifestYaml(opts: CreateOptions): string {
  const lines: string[] = []
  lines.push(`name: ${opts.name}`)
  lines.push(`version: "${opts.version}"`)
  if (opts.description) {
    lines.push(`description: "${opts.description}"`)
  }
  lines.push('')

  if (opts.skills) {
    lines.push('skills:')
    lines.push('  example-skill:')
    lines.push('    description: "An example skill"')
    lines.push('    prompt: { file: skills/example-skill.md }')
    lines.push('')
  }

  if (opts.agents) {
    lines.push('agents:')
    lines.push('  example-agent:')
    lines.push('    description: "An example agent"')
    lines.push('    prompt: { file: agents/example-agent.md }')
    lines.push('')
  }

  if (opts.commands) {
    lines.push('commands:')
    lines.push('  example-command:')
    lines.push('    description: "An example command"')
    lines.push('    prompt: { file: commands/example-command.md }')
    lines.push('')
  }

  return lines.join('\n')
}

const SKILL_TEMPLATE = `# Example Skill

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

const AGENT_TEMPLATE = `# Example Agent

<!-- This is a starter agent template. Replace this content with your agent's prompt. -->
<!-- Agents are AI assistant personas with specific roles, behaviors, and tool access. -->

## Role

Describe this agent's role and responsibilities.

## Behavior

- Define how this agent should behave
- Specify what tools it should use
- Describe its communication style
`

const COMMAND_TEMPLATE = `# Example Command

<!-- This is a starter command template. Replace this content with your command's prompt. -->
<!-- Commands are user-invokable actions that perform specific tasks. -->

## Task

Describe what this command does when invoked.

## Steps

1. First step
2. Second step
3. Final step
`

export async function writeScaffold(opts: CreateOptions, targetDir: string): Promise<string[]> {
  const files: string[] = []

  // Write manifest
  const manifestPath = join(targetDir, 'facet.yaml')
  await Bun.write(manifestPath, generateManifestYaml(opts))
  files.push('facet.yaml')

  // Write starter files
  if (opts.skills) {
    await mkdir(join(targetDir, 'skills'), { recursive: true })
    await Bun.write(join(targetDir, 'skills/example-skill.md'), SKILL_TEMPLATE)
    files.push('skills/example-skill.md')
  }

  if (opts.agents) {
    await mkdir(join(targetDir, 'agents'), { recursive: true })
    await Bun.write(join(targetDir, 'agents/example-agent.md'), AGENT_TEMPLATE)
    files.push('agents/example-agent.md')
  }

  if (opts.commands) {
    await mkdir(join(targetDir, 'commands'), { recursive: true })
    await Bun.write(join(targetDir, 'commands/example-command.md'), COMMAND_TEMPLATE)
    files.push('commands/example-command.md')
  }

  return files
}

// --- Kebab-case validation ---
const KEBAB_CASE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

// --- Interactive prompt helpers ---

async function prompt(question: string, defaultValue?: string): Promise<string> {
  const suffix = defaultValue ? ` (${defaultValue})` : ''
  process.stdout.write(`${question}${suffix}: `)

  for await (const line of console) {
    const value = line.trim()
    return value || defaultValue || ''
  }
  return defaultValue || ''
}

async function confirm(question: string): Promise<boolean> {
  process.stdout.write(`${question} (y/n): `)
  for await (const line of console) {
    const answer = line.trim().toLowerCase()
    return answer === 'y' || answer === 'yes'
  }
  return false
}

async function multiSelect(question: string, options: string[]): Promise<string[]> {
  console.log(question)
  for (let i = 0; i < options.length; i++) {
    console.log(`  ${i + 1}. ${options[i]}`)
  }
  process.stdout.write('Enter numbers separated by spaces: ')

  for await (const line of console) {
    const nums = line
      .trim()
      .split(/\s+/)
      .map(Number)
      .filter((n) => n >= 1 && n <= options.length)
    return nums.map((n) => options[n - 1]).filter((s): s is string => s !== undefined)
  }
  return []
}

// --- Command entry point ---

export const createCommand: Command = {
  name: 'create',
  description: 'Create a new facet project interactively',
  run: async (args: string[]): Promise<number> => {
    const targetDir = args[0] || process.cwd()

    // Step 0: Check for existing manifest
    const manifestExists = await Bun.file(join(targetDir, 'facet.yaml')).exists()
    if (manifestExists) {
      const overwrite = await confirm('A facet.yaml already exists in this directory. Overwrite?')
      if (!overwrite) {
        console.log('Cancelled.')
        return 1
      }
    }

    console.log('Create a new facet\n')

    // Step 1: Name
    let name = ''
    while (!name) {
      name = await prompt('Name (kebab-case)')
      if (!KEBAB_CASE.test(name)) {
        console.log('  Name must be kebab-case (e.g., my-facet)')
        name = ''
      }
    }

    // Step 2: Version
    const version = await prompt('Version', '0.1.0')

    // Step 3: Description
    const description = await prompt('Description (optional)')

    // Step 4: Asset types
    const assetTypes = await multiSelect('Select asset types (at least one required):', [
      'skills',
      'agents',
      'commands',
    ])
    if (assetTypes.length === 0) {
      console.log('At least one asset type is required. Cancelled.')
      return 1
    }

    // Step 5: Confirmation
    console.log('\n--- Summary ---')
    console.log(`  Name: ${name}`)
    console.log(`  Version: ${version}`)
    if (description) console.log(`  Description: ${description}`)
    console.log(`  Assets: ${assetTypes.join(', ')}`)
    console.log('')

    const confirmed = await confirm('Create this facet?')
    if (!confirmed) {
      console.log('Cancelled.')
      return 1
    }

    // Write scaffold
    const opts: CreateOptions = {
      name,
      version,
      description,
      skills: assetTypes.includes('skills'),
      agents: assetTypes.includes('agents'),
      commands: assetTypes.includes('commands'),
    }

    const files = await writeScaffold(opts, targetDir)

    console.log('\nFacet created!')
    for (const file of files) {
      console.log(`  ${file}`)
    }
    console.log('\nRun "facet build" to validate your facet.')

    return 0
  },
}
