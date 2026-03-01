import { cacheFacet, installFacet, listFacets, uninstallFacet, updateFacet } from '@ex-machina/facets'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import pkg from '../package.json' with { type: 'json' }

function isValidFacetName(name: string): boolean {
  return !name.includes('..') && !name.includes('/')
}

function invalidNameResult(name: string): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ success: false, facet: name, reason: 'not_found' }),
      },
    ],
  }
}

export function createServer(): McpServer {
  const projectRoot = process.env.FACETS_PROJECT_ROOT ?? process.cwd()

  const server = new McpServer({
    name: 'facets-mcp',
    version: pkg.version,
  })

  // --- facet-list ---
  server.registerTool(
    'facet-list',
    {
      description: 'List all facets declared by the project with their name, version, description, and install status',
      inputSchema: z.object({}),
    },
    async (): Promise<CallToolResult> => {
      const result = await listFacets(projectRoot)
      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    },
  )

  // --- facet-install ---
  server.registerTool(
    'facet-install',
    {
      description: 'Install a facet by name, making its resources active in the project',
      inputSchema: z.object({
        name: z.string().describe('Name of the facet to install'),
      }),
    },
    async (args): Promise<CallToolResult> => {
      if (!isValidFacetName(args.name)) return invalidNameResult(args.name)
      const result = await installFacet(args.name, projectRoot)
      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    },
  )

  // --- facet-add ---
  server.registerTool(
    'facet-add',
    {
      description: 'Cache a remote facet by URL, making it available to install',
      inputSchema: z.object({
        url: z.string().describe('URL of the remote facet.yaml manifest'),
      }),
    },
    async (args): Promise<CallToolResult> => {
      const result = await cacheFacet(args.url, projectRoot)
      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    },
  )

  // --- facet-update ---
  server.registerTool(
    'facet-update',
    {
      description: 'Re-fetch a cached remote facet to check for updates. Reports new version or "already current"',
      inputSchema: z.object({
        name: z.string().describe('Name of the remote facet to update'),
      }),
    },
    async (args): Promise<CallToolResult> => {
      if (!isValidFacetName(args.name)) return invalidNameResult(args.name)
      const result = await updateFacet(args.name, projectRoot)
      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    },
  )

  // --- facet-remove ---
  server.registerTool(
    'facet-remove',
    {
      description: 'Remove a facet from the project, uninstalling its resources and removing it from dependencies',
      inputSchema: z.object({
        name: z.string().describe('Name of the facet to remove'),
      }),
    },
    async (args): Promise<CallToolResult> => {
      if (!isValidFacetName(args.name)) return invalidNameResult(args.name)
      const result = await uninstallFacet(args.name, projectRoot)
      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    },
  )

  return server
}
