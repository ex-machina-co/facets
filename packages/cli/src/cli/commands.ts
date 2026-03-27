export type Command = {
  name: string
  description: string
  run: (args: string[]) => Promise<number>
}

function stubCommand(name: string, description: string): Command {
  return {
    name,
    description,
    run: async () => {
      console.log(`"${name}" is not yet implemented.`)
      return 0
    },
  }
}

export const commands: Record<string, Command> = {
  add: stubCommand('add', 'Add a facet to the project'),
  build: stubCommand('build', 'Build a facet from the current directory'),
  info: stubCommand('info', 'Show information about a facet'),
  init: stubCommand('init', 'Create a new facet project'),
  install: stubCommand('install', 'Install all facets from the lockfile'),
  list: stubCommand('list', 'List installed facets'),
  publish: stubCommand('publish', 'Publish a facet to the registry'),
  remove: stubCommand('remove', 'Remove a facet from the project'),
  upgrade: stubCommand('upgrade', 'Upgrade installed facets'),
}
