#!/usr/bin/env bun

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createServer } from './server.ts'

async function main(): Promise<void> {
  const server = createServer()
  const transport = new StdioServerTransport()

  await server.connect(transport)

  process.on('SIGINT', async () => {
    await server.close()
    process.exit(0)
  })
}

main().catch((error) => {
  console.error('facets-mcp server error:', error)
  process.exit(1)
})
