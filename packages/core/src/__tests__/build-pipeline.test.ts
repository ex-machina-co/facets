import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { detectNamingCollisions } from '../build/detect-collisions.ts'
import { runBuildPipeline } from '../build/pipeline.ts'
import { validateCompactFacets } from '../build/validate-facets.ts'
import { validatePlatformConfigs } from '../build/validate-platforms.ts'
import { writeBuildOutput } from '../build/write-output.ts'
import type { FacetManifest } from '../schemas/facet-manifest.ts'

let testDir: string

beforeAll(async () => {
  testDir = await mkdtemp(join(tmpdir(), 'build-pipeline-test-'))
})

afterAll(async () => {
  await rm(testDir, { recursive: true, force: true })
})

async function createFixtureDir(name: string): Promise<string> {
  const dir = join(testDir, name)
  await Bun.write(join(dir, '.keep'), '')
  return dir
}

// --- Compact facets validation ---

describe('validateCompactFacets', () => {
  test('valid compact entry passes', () => {
    const manifest = {
      name: 'test',
      version: '1.0.0',
      facets: ['base@1.0.0'],
    } as FacetManifest
    const errors = validateCompactFacets(manifest)
    expect(errors).toHaveLength(0)
  })

  test('scoped compact entry passes', () => {
    const manifest = {
      name: 'test',
      version: '1.0.0',
      facets: ['@acme/base@2.0.0'],
    } as FacetManifest
    const errors = validateCompactFacets(manifest)
    expect(errors).toHaveLength(0)
  })

  test('malformed compact entry fails', () => {
    const manifest = {
      name: 'test',
      version: '1.0.0',
      facets: ['no-version-here'],
    } as FacetManifest
    const errors = validateCompactFacets(manifest)
    expect(errors).toHaveLength(1)
    expect(errors[0]?.path).toBe('facets[0]')
    expect(errors[0]?.message).toContain('name@version')
  })

  test('selective entries are skipped', () => {
    const manifest = {
      name: 'test',
      version: '1.0.0',
      facets: [{ name: 'other', version: '1.0.0', skills: ['x'] }],
    } as FacetManifest
    const errors = validateCompactFacets(manifest)
    expect(errors).toHaveLength(0)
  })

  test('no facets section passes', () => {
    const manifest = {
      name: 'test',
      version: '1.0.0',
      skills: { x: { description: 'A skill', prompt: 'Do x' } },
    } as FacetManifest
    const errors = validateCompactFacets(manifest)
    expect(errors).toHaveLength(0)
  })
})

// --- Naming collision detection ---

describe('detectNamingCollisions', () => {
  test('no collisions with distinct names', () => {
    const manifest = {
      name: 'test',
      version: '1.0.0',
      skills: { review: { description: 'Review skill', prompt: 'Do review' } },
      agents: { helper: { prompt: 'Help' } },
      commands: { deploy: { prompt: 'Deploy' } },
    } as FacetManifest
    const errors = detectNamingCollisions(manifest)
    expect(errors).toHaveLength(0)
  })

  test('skill and command collision detected', () => {
    const manifest = {
      name: 'test',
      version: '1.0.0',
      skills: { review: { description: 'Review skill', prompt: 'Do review' } },
      commands: { review: { prompt: 'Run review' } },
    } as FacetManifest
    const errors = detectNamingCollisions(manifest)
    expect(errors).toHaveLength(1)
    expect(errors[0]?.message).toContain('review')
    expect(errors[0]?.message).toContain('skill')
    expect(errors[0]?.message).toContain('command')
  })

  test('agent and skill collision detected', () => {
    const manifest = {
      name: 'test',
      version: '1.0.0',
      skills: { helper: { description: 'Helper skill', prompt: 'Help' } },
      agents: { helper: { prompt: 'Help' } },
    } as FacetManifest
    const errors = detectNamingCollisions(manifest)
    expect(errors).toHaveLength(1)
    expect(errors[0]?.message).toContain('helper')
  })
})

// --- Platform config validation ---

describe('validatePlatformConfigs', () => {
  test('valid opencode config passes', () => {
    const manifest = {
      name: 'test',
      version: '1.0.0',
      agents: {
        reviewer: {
          prompt: 'Review',
          platforms: {
            opencode: { tools: { grep: true, bash: true } },
          },
        },
      },
    } as FacetManifest
    const result = validatePlatformConfigs(manifest)
    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  test('unknown platform produces warning', () => {
    const manifest = {
      name: 'test',
      version: '1.0.0',
      skills: {
        review: {
          description: 'Review skill',
          prompt: 'Do review',
          platforms: {
            'unknown-platform': { foo: 'bar' },
          },
        },
      },
    } as FacetManifest
    const result = validatePlatformConfigs(manifest)
    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('unknown-platform')
  })

  test('invalid opencode config fails', () => {
    const manifest = {
      name: 'test',
      version: '1.0.0',
      agents: {
        reviewer: {
          prompt: 'Review',
          platforms: {
            opencode: { tools: 'not-a-record' },
          },
        },
      },
    } as FacetManifest
    const result = validatePlatformConfigs(manifest)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0]?.message).toContain('opencode')
  })

  test('no platforms on any asset passes', () => {
    const manifest = {
      name: 'test',
      version: '1.0.0',
      skills: { x: { description: 'A skill', prompt: 'Do x' } },
    } as FacetManifest
    const result = validatePlatformConfigs(manifest)
    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })
})

// --- Build pipeline (end-to-end) ---

describe('runBuildPipeline', () => {
  test('successful build with valid facet', async () => {
    const dir = await createFixtureDir('valid-build')
    await Bun.write(join(dir, 'skills/example.md'), '# Example skill')
    await Bun.write(
      join(dir, 'facet.yaml'),
      `
name: test-facet
version: "1.0.0"
skills:
  example:
    description: "An example skill"
    prompt: { file: skills/example.md }
`,
    )

    const result = await runBuildPipeline(dir)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.name).toBe('test-facet')
      expect(result.data.skills?.example?.prompt).toBe('# Example skill')
    }
  })

  test('build fails on missing manifest', async () => {
    const dir = await createFixtureDir('no-manifest')
    const result = await runBuildPipeline(dir)
    expect(result.ok).toBe(false)
  })

  test('build fails on missing asset file', async () => {
    const dir = await createFixtureDir('missing-file')
    await Bun.write(
      join(dir, 'facet.yaml'),
      `
name: test-facet
version: "1.0.0"
skills:
  example:
    description: "An example skill"
    prompt: { file: skills/nonexistent.md }
`,
    )

    const result = await runBuildPipeline(dir)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors[0]?.path).toBe('skills.example.prompt')
      expect(result.errors[0]?.message).toContain('nonexistent.md')
    }
  })

  test('build fails on naming collision', async () => {
    const dir = await createFixtureDir('collision')
    await Bun.write(join(dir, 'skills/review.md'), '# Review skill')
    await Bun.write(join(dir, 'commands/review.md'), '# Review command')
    await Bun.write(
      join(dir, 'facet.yaml'),
      `
name: test-facet
version: "1.0.0"
skills:
  review:
    description: "A review skill"
    prompt: { file: skills/review.md }
commands:
  review:
    description: "A review command"
    prompt: { file: commands/review.md }
`,
    )

    const result = await runBuildPipeline(dir)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors[0]?.message).toContain('review')
      expect(result.errors[0]?.message).toContain('collision')
    }
  })

  test('build fails on malformed compact facets entry', async () => {
    const dir = await createFixtureDir('bad-facets')
    await Bun.write(join(dir, 'skills/x.md'), '# Skill')
    await Bun.write(
      join(dir, 'facet.yaml'),
      `
name: test-facet
version: "1.0.0"
skills:
  x:
    description: "A skill"
    prompt: { file: skills/x.md }
facets:
  - "no-version-here"
`,
    )

    const result = await runBuildPipeline(dir)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors[0]?.message).toContain('name@version')
    }
  })
})

// --- Build output generation ---

describe('writeBuildOutput', () => {
  test('writes resolved manifest and asset files to dist/', async () => {
    const dir = await createFixtureDir('write-output')
    await Bun.write(
      join(dir, 'facet.yaml'),
      `name: test-facet\nversion: "1.0.0"\nskills:\n  example:\n    description: "A skill"\n    prompt: { file: skills/example.md }\n`,
    )

    const resolved = {
      name: 'test-facet',
      version: '1.0.0',
      skills: {
        example: {
          description: 'A skill',
          prompt: '# Resolved content',
        },
      },
    }

    await writeBuildOutput(resolved, dir)

    // Manifest copied
    const manifest = await Bun.file(join(dir, 'dist/facet.yaml')).text()
    expect(manifest).toContain('test-facet')

    // Resolved skill file
    const skill = await Bun.file(join(dir, 'dist/skills/example.md')).text()
    expect(skill).toBe('# Resolved content')
  })

  test('cleans previous dist/ before writing', async () => {
    const dir = await createFixtureDir('clean-dist')
    await Bun.write(join(dir, 'facet.yaml'), 'name: test\nversion: "1.0.0"\n')
    // Write a stale file in dist/
    await Bun.write(join(dir, 'dist/stale.txt'), 'stale')

    const resolved = { name: 'test', version: '1.0.0' }
    await writeBuildOutput(resolved, dir)

    // Stale file should be gone
    const staleExists = await Bun.file(join(dir, 'dist/stale.txt')).exists()
    expect(staleExists).toBe(false)

    // Manifest should exist
    const manifestExists = await Bun.file(join(dir, 'dist/facet.yaml')).exists()
    expect(manifestExists).toBe(true)
  })
})
