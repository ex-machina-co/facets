import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadManifest, resolvePrompts } from '../loaders/facet.ts'

let testDir: string

beforeAll(async () => {
  testDir = await mkdtemp(join(tmpdir(), 'facet-loader-test-'))
})

afterAll(async () => {
  await rm(testDir, { recursive: true, force: true })
})

async function writeFixture(dir: string, filename: string, content: string) {
  const path = join(dir, filename)
  await Bun.write(path, content)
  return path
}

async function createFixtureDir(name: string): Promise<string> {
  const dir = join(testDir, name)
  await Bun.write(join(dir, '.keep'), '') // ensure dir exists
  return dir
}

// --- loadManifest ---

describe('loadManifest', () => {
  test('successful load', async () => {
    const dir = await createFixtureDir('valid')
    await writeFixture(
      dir,
      'facet.yaml',
      `
name: test-facet
version: "1.0.0"
skills:
  code-review:
    description: "Reviews code for issues"
    prompt: "Review the code for common issues."
`,
    )

    const result = await loadManifest(dir)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.name).toBe('test-facet')
      expect(result.data.version).toBe('1.0.0')
      expect(result.data.skills?.['code-review']?.description).toBe('Reviews code for issues')
      expect(result.data.skills?.['code-review']?.prompt).toBe('Review the code for common issues.')
    }
  })

  test('file not found', async () => {
    const dir = await createFixtureDir('missing')

    const result = await loadManifest(dir)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toHaveLength(1)
      expect(result.errors.at(0)?.message).toContain('File not found')
    }
  })

  test('malformed YAML', async () => {
    const dir = await createFixtureDir('malformed')
    await writeFixture(dir, 'facet.yaml', `name: [unterminated`)

    const result = await loadManifest(dir)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toHaveLength(1)
      expect(result.errors.at(0)?.message).toContain('YAML syntax error')
    }
  })

  test('schema validation errors with correct paths', async () => {
    const dir = await createFixtureDir('schema-error')
    await writeFixture(
      dir,
      'facet.yaml',
      `
name: test-facet
version: "1.0.0"
agents:
  reviewer:
    description: "No prompt"
`,
    )

    const result = await loadManifest(dir)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const promptError = result.errors.find((e) => e.path.includes('prompt'))
      expect(promptError).toBeDefined()
    }
  })

  test('no text assets → business-rule error', async () => {
    const dir = await createFixtureDir('no-text')
    await writeFixture(
      dir,
      'facet.yaml',
      `
name: empty-facet
version: "1.0.0"
servers:
  jira: "1.0.0"
`,
    )

    const result = await loadManifest(dir)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.at(0)?.message).toContain('at least one text asset')
    }
  })

  test('full manifest loads successfully', async () => {
    const dir = await createFixtureDir('full')
    await writeFixture(
      dir,
      'facet.yaml',
      `
name: acme-dev
version: "1.0.0"
description: "Acme dev toolkit"
author: acme-org
skills:
  code-standards:
    description: "Org coding standards"
    prompt: "Follow org coding standards."
agents:
  reviewer:
    description: "Code reviewer"
    prompt: "Review this code."
commands:
  review:
    description: "Run review"
    prompt: "Execute code review."
facets:
  - "base@1.0.0"
servers:
  jira: "1.0.0"
  slack:
    image: "ghcr.io/acme/slack-bot:v2"
`,
    )

    const result = await loadManifest(dir)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.name).toBe('acme-dev')
      expect(result.data.agents?.reviewer?.prompt).toBe('Review this code.')
      expect(result.data.servers?.slack).toEqual({
        image: 'ghcr.io/acme/slack-bot:v2',
      })
    }
  })
})

// --- resolvePrompts ---

describe('resolvePrompts', () => {
  test('inline string prompts are used as-is', async () => {
    const manifest = {
      name: 'test',
      version: '1.0.0',
      agents: {
        reviewer: {
          prompt: 'Review this code.' as const,
        },
      },
      commands: {
        review: {
          prompt: 'Execute review.' as const,
        },
      },
    }

    const result = await resolvePrompts(manifest, '/tmp')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.agents?.reviewer?.prompt).toBe('Review this code.')
      expect(result.data.commands?.review?.prompt).toBe('Execute review.')
    }
  })

  test('file-based prompt is resolved', async () => {
    const dir = await createFixtureDir('resolve-file')
    const agentsDir = join(dir, 'agents')
    await Bun.write(join(agentsDir, '.keep'), '')
    await writeFixture(agentsDir, 'reviewer.md', '# Review\nCheck all code.')

    const manifest = {
      name: 'test',
      version: '1.0.0',
      agents: {
        reviewer: {
          prompt: { file: 'agents/reviewer.md' },
        },
      },
    }

    const result = await resolvePrompts(manifest, dir)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.agents?.reviewer?.prompt).toBe('# Review\nCheck all code.')
    }
  })

  test('missing prompt file reports error with agent name', async () => {
    const dir = await createFixtureDir('resolve-missing')

    const manifest = {
      name: 'test',
      version: '1.0.0',
      agents: {
        reviewer: {
          prompt: { file: 'agents/nonexistent.md' },
        },
      },
    }

    const result = await resolvePrompts(manifest, dir)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toHaveLength(1)
      expect(result.errors.at(0)?.path).toBe('agents.reviewer.prompt')
      expect(result.errors.at(0)?.message).toContain('nonexistent.md')
    }
  })

  test('manifest without agents or commands resolves successfully', async () => {
    const manifest = {
      name: 'test',
      version: '1.0.0',
      skills: {
        x: {
          description: 'A skill',
          prompt: 'Do x' as const,
        },
      },
    }

    const result = await resolvePrompts(manifest, '/tmp')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.name).toBe('test')
      expect(result.data.skills?.x?.prompt).toBe('Do x')
    }
  })
})
