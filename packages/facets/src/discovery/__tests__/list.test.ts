import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import yaml from 'js-yaml'
import { listFacets } from '../list.ts'

let projectRoot: string

beforeEach(async () => {
  projectRoot = await mkdtemp(path.join(tmpdir(), 'facets-test-'))
  await Bun.$`mkdir -p ${projectRoot}/.opencode/facets`
})

afterEach(async () => {
  await rm(projectRoot, { recursive: true, force: true })
})

async function writeLocalFacet(name: string, manifest: Record<string, unknown>) {
  const dir = `${projectRoot}/.opencode/facets/${name}`
  await Bun.$`mkdir -p ${dir}`
  await Bun.write(`${dir}/facet.yaml`, yaml.dump(manifest))
}

describe('listFacets', () => {
  test('returns empty list when no facets exist', async () => {
    const result = await listFacets(projectRoot)
    expect(result.facets).toEqual([])
  })

  test('includes local facets', async () => {
    await writeLocalFacet('test-facet', {
      name: 'test-facet',
      version: '1.0.0',
      description: 'A test facet',
      skills: ['my-skill'],
    })

    const result = await listFacets(projectRoot)
    expect(result.facets).toHaveLength(1)
    expect(result.facets[0]?.name).toBe('test-facet')
    expect(result.facets[0]?.version).toBe('1.0.0')
    expect(result.facets[0]?.source).toBe('local')
    expect(result.facets[0]?.installed).toBe(false)
  })

  test('reports installed status correctly', async () => {
    await writeLocalFacet('test-facet', {
      name: 'test-facet',
      version: '1.0.0',
      skills: ['my-skill'],
    })

    // Not installed yet
    let result = await listFacets(projectRoot)
    expect(result.facets[0]?.installed).toBe(false)

    // Create the expected installed file
    await Bun.$`mkdir -p ${projectRoot}/.opencode/skills/my-skill`
    await Bun.write(`${projectRoot}/.opencode/skills/my-skill/SKILL.md`, '# Skill')

    result = await listFacets(projectRoot)
    expect(result.facets[0]?.installed).toBe(true)
  })

  test('includes requires as metadata', async () => {
    await writeLocalFacet('test-facet', {
      name: 'test-facet',
      version: '1.0.0',
      requires: ['gh --version'],
      skills: ['s'],
    })

    const result = await listFacets(projectRoot)
    expect(result.facets[0]?.requires).toEqual(['gh --version'])
  })

  test('lists resource summaries', async () => {
    await writeLocalFacet('test-facet', {
      name: 'test-facet',
      version: '1.0.0',
      skills: ['my-skill'],
      agents: { 'my-agent': { prompt: 'prompts/a.md' } },
      commands: { 'my-cmd': { prompt: 'prompts/c.md' } },
      platforms: { opencode: { tools: ['my-tool'] } },
    })

    const result = await listFacets(projectRoot)
    const resources = result.facets[0]?.resources
    expect(resources).toContainEqual({ type: 'skill', name: 'my-skill' })
    expect(resources).toContainEqual({ type: 'agent', name: 'my-agent' })
    expect(resources).toContainEqual({ type: 'command', name: 'my-cmd' })
    expect(resources).toContainEqual({ type: 'tool', name: 'my-tool' })
  })

  test('includes remote facets from facets.yaml', async () => {
    const facetsYaml = {
      remote: {
        'remote-facet': {
          url: 'https://example.com/facet.yaml',
          version: '2.0.0',
        },
      },
    }
    await Bun.write(`${projectRoot}/.opencode/facets.yaml`, yaml.dump(facetsYaml))

    const result = await listFacets(projectRoot)
    expect(result.facets).toHaveLength(1)
    expect(result.facets[0]?.name).toBe('remote-facet')
    expect(result.facets[0]?.source).toBe('remote')
    // Not cached, so shows minimal info
    expect(result.facets[0]?.version).toBe('2.0.0')
  })
})
