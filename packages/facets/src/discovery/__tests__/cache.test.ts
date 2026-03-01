import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import yaml from 'js-yaml'
import { readFacetsLock } from '../../registry/files.ts'
import { cacheFacet, getCacheDir, resolveUrl } from '../cache.ts'

let projectRoot: string

beforeEach(async () => {
  projectRoot = await mkdtemp(path.join(tmpdir(), 'facets-test-'))
  await Bun.$`mkdir -p ${projectRoot}/.opencode`
})

afterEach(async () => {
  await rm(projectRoot, { recursive: true, force: true })
  await rm(getCacheDir('resource-test'), { recursive: true, force: true }).catch(() => {})
})

describe('resolveUrl', () => {
  test('resolves relative path against manifest URL', () => {
    const result = resolveUrl('https://example.com/facets/my-facet/facet.yaml', 'prompts/agent.md')
    expect(result).toBe('https://example.com/facets/my-facet/prompts/agent.md')
  })

  test('resolves path in subdirectory', () => {
    const result = resolveUrl('https://example.com/repo/facet.yaml', 'skills/coding/SKILL.md')
    expect(result).toBe('https://example.com/repo/skills/coding/SKILL.md')
  })

  test('resolves against nested base path', () => {
    const result = resolveUrl(
      'https://cdn.example.com/org/repo/main/facets/my-facet/facet.yaml',
      'opencode/tools/my-tool.ts',
    )
    expect(result).toBe('https://cdn.example.com/org/repo/main/facets/my-facet/opencode/tools/my-tool.ts')
  })
})

describe('cacheFacet', () => {
  test('lockfile updated when remote facet is cached', async () => {
    const manifestContent = yaml.dump({
      name: 'remote-test',
      version: '1.2.0',
    })

    // Mock global fetch to serve the manifest
    const originalFetch = globalThis.fetch
    const mockFetch = async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      if (url === 'https://example.com/facets/remote-test/facet.yaml') {
        return new Response(manifestContent, { status: 200 })
      }
      return new Response('Not found', { status: 404 })
    }
    globalThis.fetch = Object.assign(mockFetch, { preconnect: originalFetch.preconnect }) as typeof fetch

    try {
      const result = await cacheFacet('https://example.com/facets/remote-test/facet.yaml', projectRoot)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.name).toBe('remote-test')
        expect(result.version).toBe('1.2.0')
      }

      // Verify lockfile was written with integrity hash
      const lock = await readFacetsLock(projectRoot)
      const remote = lock.remote ?? {}
      const entry = remote['remote-test']
      expect(entry).toBeDefined()
      if (!entry) return

      expect(entry.version).toBe('1.2.0')
      expect(entry.url).toBe('https://example.com/facets/remote-test/facet.yaml')
      expect(entry.integrity).toMatch(/^sha256-[a-f0-9]{64}$/)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('fetches and caches resource files declared in manifest', async () => {
    const manifestContent = yaml.dump({
      name: 'resource-test',
      version: '1.0.0',
      skills: ['my-skill'],
      agents: {
        'my-agent': {
          description: 'Test agent',
          prompt: 'prompts/my-agent.md',
        },
      },
    })
    const skillContent = '# My Skill\nDoes things.'
    const agentPrompt = 'You are a helpful agent.'

    const originalFetch = globalThis.fetch
    const mockFetch = async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const responses: Record<string, string> = {
        'https://example.com/facets/resource-test/facet.yaml': manifestContent,
        'https://example.com/facets/resource-test/skills/my-skill/SKILL.md': skillContent,
        'https://example.com/facets/resource-test/prompts/my-agent.md': agentPrompt,
      }
      if (url in responses) {
        return new Response(responses[url], { status: 200 })
      }
      return new Response('Not found', { status: 404 })
    }
    globalThis.fetch = Object.assign(mockFetch, { preconnect: originalFetch.preconnect }) as typeof fetch

    try {
      const result = await cacheFacet('https://example.com/facets/resource-test/facet.yaml', projectRoot)
      expect(result.success).toBe(true)

      const cacheDir = getCacheDir('resource-test')

      // Verify skill file was cached
      const cachedSkill = await Bun.file(`${cacheDir}/skills/my-skill/SKILL.md`).text()
      expect(cachedSkill).toBe(skillContent)

      // Verify agent prompt was cached
      const cachedPrompt = await Bun.file(`${cacheDir}/prompts/my-agent.md`).text()
      expect(cachedPrompt).toBe(agentPrompt)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
