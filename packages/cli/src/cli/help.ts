import type { Command } from './commands.ts'
import { commands } from './commands.ts'
import { version } from './version.ts'

export function printGlobalHelp(): void {
  const entries = Object.values(commands)
  const maxNameLength = Math.max(...entries.map((c) => c.name.length))

  const lines = [
    `facet v${version}`,
    '',
    'Usage: facet <command> [options]',
    '',
    'Commands:',
    ...entries.map((c) => `  ${c.name.padEnd(maxNameLength + 2)}${c.description}`),
    '',
    'Options:',
    '  --help       Show help',
    '  --version    Show version',
  ]

  console.log(lines.join('\n'))
}

export function printCommandHelp(command: Command): void {
  const lines = [
    `Usage: facet ${command.name} [options]`,
    '',
    `  ${command.description}`,
    '',
    'Options:',
    '  --help    Show help',
  ]

  console.log(lines.join('\n'))
}
