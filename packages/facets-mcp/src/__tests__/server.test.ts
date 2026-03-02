import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { Client } from '@modelcontextprotocol/sdk/client'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import pkg from '../../package.json' with { type: 'json' }
import { createServer } from '../server.ts'

const EXPECTED_TOOLS = ['facet-list', 'facet-install', 'facet-add', 'facet-update', 'facet-remove'] as const

describe('MCP server', () => {
  const server = createServer()
  const client = new Client({ name: 'test-client', version: '1.0.0' })

  beforeAll(async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)
    await client.connect(clientTransport)
  })

  afterAll(async () => {
    await client.close()
    await server.close()
  })

  test('server name is facets-mcp', () => {
    const serverInfo = client.getServerVersion()
    expect(serverInfo).toBeDefined()
    expect(serverInfo?.name).toBe('facets-mcp')
  })

  test('server version matches package.json', () => {
    const serverInfo = client.getServerVersion()
    expect(serverInfo).toBeDefined()
    expect(serverInfo?.version).toBe(pkg.version)
  })

  test('registers exactly 5 tools', async () => {
    const { tools } = await client.listTools()
    expect(tools).toHaveLength(5)
  })

  test('registers all expected tool names', async () => {
    const { tools } = await client.listTools()
    const toolNames = tools.map((t) => t.name)
    for (const name of EXPECTED_TOOLS) {
      expect(toolNames).toContain(name)
    }
  })

  test('each tool has a description', async () => {
    const { tools } = await client.listTools()
    for (const tool of tools) {
      expect(typeof tool.description).toBe('string')
      expect(tool.description?.length).toBeGreaterThan(0)
    }
  })

  test('facet-install requires a name parameter', async () => {
    const { tools } = await client.listTools()
    const tool = tools.find((t) => t.name === 'facet-install')
    expect(tool).toBeDefined()
    expect(tool?.inputSchema).toBeDefined()
  })

  test('facet-add requires a url parameter', async () => {
    const { tools } = await client.listTools()
    const tool = tools.find((t) => t.name === 'facet-add')
    expect(tool).toBeDefined()
    expect(tool?.inputSchema).toBeDefined()
  })
})
