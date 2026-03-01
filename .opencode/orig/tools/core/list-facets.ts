import path from 'node:path'
import { listFacets } from '@facets/list'
import { tool } from '@opencode-ai/plugin'

export default tool({
  description: 'List available facets and their install status',
  args: {},
  async execute(_args, context): Promise<string> {
    const base = path.join(context.worktree, '.opencode')
    const facetsDir = path.join(base, 'facets')
    const result = await listFacets(base, facetsDir)
    return JSON.stringify(result)
  },
})
