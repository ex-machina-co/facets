import { parse } from '@bomb.sh/args'
import { commands } from './commands.ts'
import { printCommandHelp, printGlobalHelp } from './help.ts'
import { findClosestCommand } from './suggest.ts'
import { version } from './version.ts'

export async function run(argv: string[]): Promise<number> {
  const args = parse(argv, {
    boolean: ['help', 'version'],
  })

  if (args.version) {
    console.log(version)
    return 0
  }

  const commandName = String(args._[0] ?? '')

  // No command given — show global help
  if (!commandName) {
    printGlobalHelp()
    return 0
  }

  // Explicit `help` command: `facets help` or `facets help build`
  if (commandName === 'help') {
    const subCommandName = String(args._[1] ?? '')
    const subCommand = subCommandName ? commands[subCommandName] : undefined
    if (subCommand) {
      printCommandHelp(subCommand)
    } else {
      printGlobalHelp()
    }
    return 0
  }

  const command = commands[commandName]

  if (!command) {
    const suggestion = findClosestCommand(commandName, Object.keys(commands))
    const message = suggestion
      ? `Unknown command "${commandName}". Did you mean "${suggestion}"?`
      : `Unknown command "${commandName}".`
    console.error(message)
    return 1
  }

  // Per-command help: `facets build --help`
  if (args.help) {
    printCommandHelp(command)
    return 0
  }

  return command.run(argv.slice(1))
}
