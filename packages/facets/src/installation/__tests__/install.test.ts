import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import yaml from 'js-yaml'
import { getCacheDir } from '../../discovery/cache.ts'
import { installFacet } from '../install.ts'
import { uninstallFacet } from '../uninstall.ts'

const PREREQ_STATE_DIR = `${process.env.XDG_STATE_HOME ?? `${process.env.HOME}/.local/state`}/facets/prereqs`

let projectRoot: string

beforeEach(async () => {
  projectRoot = await mkdtemp(path.join(tmpdir(), 'facets-test-'))
  await Bun.$`mkdir -p ${projectRoot}/.opencode/facets`
})

afterEach(async () => {
  await rm(projectRoot, { recursive: true, force: true })
  // Clean up global prereq state so tests don't leak into each other
  await rm(`${PREREQ_STATE_DIR}/test-facet`, { force: true }).catch(() => {})
  // Clean up cache dir used by cached install test
  await rm(getCacheDir('cached-test-facet'), { recursive: true, force: true }).catch(() => {})
})

async function writeLocalFacet(name: string, manifest: Record<string, unknown>, files?: Record<string, string>) {
  const dir = `${projectRoot}/.opencode/facets/${name}`
  await Bun.$`mkdir -p ${dir}`
  await Bun.write(`${dir}/facet.yaml`, yaml.dump(manifest))
  for (const [relPath, content] of Object.entries(files ?? {})) {
    const fullPath = `${dir}/${relPath}`
    await Bun.$`mkdir -p ${path.dirname(fullPath)}`
    await Bun.write(fullPath, content)
  }
}

describe('installFacet', () => {
  test('installs local facet with skill', async () => {
    await writeLocalFacet(
      'test-facet',
      {
        name: 'test-facet',
        version: '1.0.0',
        skills: ['my-skill'],
      },
      { 'skills/my-skill/SKILL.md': '# My Skill\nDoes things.' },
    )

    const result = await installFacet('test-facet', projectRoot)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.resources).toContainEqual({ name: 'my-skill', type: 'skill' })
    }

    // Verify file exists
    const installed = await Bun.file(`${projectRoot}/.opencode/skills/my-skill/SKILL.md`).exists()
    expect(installed).toBe(true)
  })

  test('installs agent with assembled frontmatter', async () => {
    await writeLocalFacet(
      'test-facet',
      {
        name: 'test-facet',
        version: '1.0.0',
        agents: {
          'my-agent': {
            description: 'Does a thing',
            prompt: 'prompts/my-agent.md',
            platforms: {
              opencode: { tools: { write: false } },
            },
          },
        },
      },
      { 'prompts/my-agent.md': 'You are a helpful agent.' },
    )

    const result = await installFacet('test-facet', projectRoot)
    expect(result.success).toBe(true)

    const content = await Bun.file(`${projectRoot}/.opencode/agents/my-agent.md`).text()
    expect(content).toContain('---')
    expect(content).toContain('description: Does a thing')
    expect(content).toContain('You are a helpful agent.')
  })

  test('installs command with assembled frontmatter', async () => {
    await writeLocalFacet(
      'test-facet',
      {
        name: 'test-facet',
        version: '1.0.0',
        commands: {
          'my-command': {
            description: 'What it does',
            prompt: 'prompts/my-command.md',
          },
        },
      },
      { 'prompts/my-command.md': 'Run this command.' },
    )

    const result = await installFacet('test-facet', projectRoot)
    expect(result.success).toBe(true)

    const content = await Bun.file(`${projectRoot}/.opencode/commands/my-command.md`).text()
    expect(content).toContain('description: What it does')
    expect(content).toContain('Run this command.')
  })

  test('installs platform tools', async () => {
    await writeLocalFacet(
      'test-facet',
      {
        name: 'test-facet',
        version: '1.0.0',
        platforms: {
          opencode: { tools: ['my-tool'] },
        },
      },
      { 'opencode/tools/my-tool.ts': 'export default "tool"' },
    )

    const result = await installFacet('test-facet', projectRoot)
    expect(result.success).toBe(true)

    const installed = await Bun.file(`${projectRoot}/.opencode/tools/my-tool.ts`).exists()
    expect(installed).toBe(true)
  })

  test('returns not_found for unknown facet', async () => {
    const result = await installFacet('nonexistent', projectRoot)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.reason).toBe('not_found')
    }
  })

  test('runs prereq checks and fails on bad command', async () => {
    await writeLocalFacet(
      'test-facet',
      {
        name: 'test-facet',
        version: '1.0.0',
        requires: ['false'],
        skills: ['s'],
      },
      { 'skills/s/SKILL.md': '# S' },
    )

    const result = await installFacet('test-facet', projectRoot, {
      skipPrereqApproval: true,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.reason).toBe('prereq')
    }
  })

  test('forcePrereqCheck re-runs checks even when previously confirmed', async () => {
    await writeLocalFacet(
      'test-facet',
      {
        name: 'test-facet',
        version: '1.0.0',
        requires: ['true'],
        skills: ['s'],
      },
      { 'skills/s/SKILL.md': '# S' },
    )

    // First install succeeds and marks prereqs as confirmed
    const first = await installFacet('test-facet', projectRoot, {
      skipPrereqApproval: true,
    })
    expect(first.success).toBe(true)

    // Now change the facet to have a failing prereq
    await writeLocalFacet(
      'test-facet',
      {
        name: 'test-facet',
        version: '1.0.0',
        requires: ['false'],
        skills: ['s'],
      },
      { 'skills/s/SKILL.md': '# S' },
    )

    // Without forcePrereqCheck, would skip checks (already confirmed)
    // With forcePrereqCheck, re-runs and hits the failing command
    const second = await installFacet('test-facet', projectRoot, {
      skipPrereqApproval: true,
      forcePrereqCheck: true,
    })
    expect(second.success).toBe(false)
    if (!second.success) {
      expect(second.reason).toBe('prereq')
    }
  })

  test('installs facet from cache when not found locally', async () => {
    const cacheDir = getCacheDir('cached-test-facet')
    await Bun.$`mkdir -p ${cacheDir}/skills/cached-skill`
    await Bun.write(
      `${cacheDir}/facet.yaml`,
      yaml.dump({
        name: 'cached-test-facet',
        version: '2.0.0',
        skills: ['cached-skill'],
      }),
    )
    await Bun.write(`${cacheDir}/skills/cached-skill/SKILL.md`, '# Cached Skill\nFrom cache.')

    const result = await installFacet('cached-test-facet', projectRoot, {
      skipPrereqApproval: true,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.resources).toContainEqual({ name: 'cached-skill', type: 'skill' })
    }

    const installed = await Bun.file(`${projectRoot}/.opencode/skills/cached-skill/SKILL.md`).exists()
    expect(installed).toBe(true)
    const content = await Bun.file(`${projectRoot}/.opencode/skills/cached-skill/SKILL.md`).text()
    expect(content).toContain('From cache.')
  })

  test('user declining prereqs cancels install', async () => {
    await writeLocalFacet(
      'test-facet',
      {
        name: 'test-facet',
        version: '1.0.0',
        requires: ['true'],
        skills: ['s'],
      },
      { 'skills/s/SKILL.md': '# S' },
    )

    const result = await installFacet('test-facet', projectRoot, {
      onPrereqApproval: async () => false,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.reason).toBe('prereq')
    }
  })
})

describe('uninstallFacet', () => {
  test('removes installed resources', async () => {
    await writeLocalFacet(
      'test-facet',
      {
        name: 'test-facet',
        version: '1.0.0',
        skills: ['my-skill'],
      },
      { 'skills/my-skill/SKILL.md': '# My Skill' },
    )

    // Install first
    await installFacet('test-facet', projectRoot)
    expect(await Bun.file(`${projectRoot}/.opencode/skills/my-skill/SKILL.md`).exists()).toBe(true)

    // Uninstall
    const result = await uninstallFacet('test-facet', projectRoot)
    expect(result.success).toBe(true)
    expect(await Bun.file(`${projectRoot}/.opencode/skills/my-skill/SKILL.md`).exists()).toBe(false)
  })

  test('returns not_found for unknown facet', async () => {
    const result = await uninstallFacet('nonexistent', projectRoot)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.reason).toBe('not_found')
    }
  })
})
