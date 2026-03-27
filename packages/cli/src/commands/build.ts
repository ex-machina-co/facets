import { runBuildPipeline, writeBuildOutput } from '@ex-machina/facet-core'
import type { Command } from '../cli/commands.ts'

export const buildCommand: Command = {
  name: 'build',
  description: 'Build a facet from the current directory',
  run: async (args: string[]): Promise<number> => {
    const rootDir = args[0] || process.cwd()

    console.log('Building facet...\n')

    const result = await runBuildPipeline(rootDir)

    // Print warnings regardless of success/failure
    for (const warning of result.warnings) {
      console.log(`  warning: ${warning}`)
    }

    if (!result.ok) {
      console.log('Build failed:\n')
      for (const error of result.errors) {
        const path = error.path ? `${error.path}: ` : ''
        console.log(`  error: ${path}${error.message}`)
      }
      return 1
    }

    // Write build output
    await writeBuildOutput(result.data, rootDir)

    console.log('Build succeeded.')
    console.log('  Output written to dist/')
    return 0
  },
}
