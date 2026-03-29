import type { Command } from '../../commands.ts'
import { writeScaffold } from '../create-scaffold.ts'
import { runCreateWizardInk } from './wizard.tsx'

export type { CreateOptions } from '../create-scaffold.ts'
export { writeScaffold } from '../create-scaffold.ts'

export const createCommand: Command = {
  name: 'create',
  description: 'Create a new facet project interactively',
  run: async (args: string[]): Promise<number> => {
    const targetDir = args[0] || process.cwd()

    const opts = await runCreateWizardInk()
    if (!opts) {
      console.log('\nCancelled.')
      return 1
    }

    const files = await writeScaffold(opts, targetDir)

    console.log(`\nFacet created: ${opts.name}`)
    for (const file of files) {
      console.log(`  ${file}`)
    }
    console.log('\nRun "facet build" to validate your facet.')

    return 0
  },
}
