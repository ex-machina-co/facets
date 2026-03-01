import { tool } from '@opencode-ai/plugin'
import path from 'path'
import { installFacet } from '@facets/install'

export default tool({
  description: 'Install a facet by name',
  args: {
    name: tool.schema.string().describe('Name of the facet to install'),
  },
  async execute(args, context): Promise<string> {
    if (args.name.includes('..') || args.name.includes('/')) {
      return JSON.stringify({ success: false, facet: args.name, reason: 'not_found' })
    }

    const base = path.join(context.worktree, '.opencode')
    const facetsDir = path.join(base, 'facets')
    const result = await installFacet(args.name, base, facetsDir)

    return JSON.stringify(result)
  },
})
