import { describe, expect, test } from 'bun:test'
import { type } from 'arktype'
import { checkFacetManifestConstraints, type FacetManifest, FacetManifestSchema } from '../schemas/facet-manifest.ts'

// --- Valid manifests ---

describe('FacetManifestSchema — valid manifests', () => {
  test('minimal manifest with a skill', () => {
    const input = {
      name: 'my-facet',
      version: '1.0.0',
      skills: ['code-review'],
    }
    const result = FacetManifestSchema(input)
    expect(result).not.toBeInstanceOf(type.errors)
    const data = result as FacetManifest
    expect(data.name).toBe('my-facet')
    expect(data.version).toBe('1.0.0')
    expect(data.skills).toEqual(['code-review'])
  })

  test('full manifest with all sections', () => {
    const input = {
      name: 'acme-dev',
      version: '1.0.0',
      description: 'Acme developer toolkit',
      author: 'acme-org',
      skills: ['code-standards', 'pr-template'],
      agents: {
        reviewer: {
          description: 'Org code reviewer',
          prompt: { file: 'agents/reviewer.md' },
          platforms: {
            opencode: { tools: { grep: true, bash: true } },
          },
        },
        'quick-check': {
          description: 'Fast lint check',
          prompt: 'Review for style issues only.',
        },
      },
      commands: {
        review: {
          description: 'Run a code review',
          prompt: { file: 'commands/review.md' },
        },
      },
      facets: [
        'code-review-base@1.0.0',
        {
          name: 'typescript-patterns',
          version: '2.1.0',
          skills: ['ts-conventions', 'any-usage'],
        },
      ],
      servers: {
        jira: '1.0.0',
        github: '2.3.0',
        '@acme/deploy': '0.5.0',
        slack: { image: 'ghcr.io/acme/slack-bot:v2' },
      },
    }
    const result = FacetManifestSchema(input)
    expect(result).not.toBeInstanceOf(type.errors)
    const data = result as FacetManifest
    expect(data.name).toBe('acme-dev')
    expect(data.agents?.reviewer?.prompt).toEqual({
      file: 'agents/reviewer.md',
    })
    expect(data.agents?.['quick-check']?.prompt).toBe('Review for style issues only.')
    expect(data.servers?.jira).toBe('1.0.0')
    expect(data.servers?.slack).toEqual({
      image: 'ghcr.io/acme/slack-bot:v2',
    })
  })

  test('manifest with only composed facets is valid', () => {
    const input = {
      name: 'composed-only',
      version: '1.0.0',
      facets: ['base@1.0.0'],
    }
    const result = FacetManifestSchema(input)
    expect(result).not.toBeInstanceOf(type.errors)
    const data = result as FacetManifest
    const errors = checkFacetManifestConstraints(data)
    expect(errors).toHaveLength(0)
  })
})

// --- Invalid manifests ---

describe('FacetManifestSchema — invalid manifests', () => {
  test('missing name', () => {
    const input = { version: '1.0.0', skills: ['x'] }
    const result = FacetManifestSchema(input)
    expect(result).toBeInstanceOf(type.errors)
  })

  test('missing version', () => {
    const input = { name: 'my-facet', skills: ['x'] }
    const result = FacetManifestSchema(input)
    expect(result).toBeInstanceOf(type.errors)
  })

  test('agent missing prompt', () => {
    const input = {
      name: 'my-facet',
      version: '1.0.0',
      agents: {
        reviewer: { description: 'No prompt here' },
      },
    }
    const result = FacetManifestSchema(input)
    expect(result).toBeInstanceOf(type.errors)
  })

  test('server reference object without image field', () => {
    const input = {
      name: 'my-facet',
      version: '1.0.0',
      skills: ['x'],
      servers: {
        bad: { notImage: 'ghcr.io/something' },
      },
    }
    const result = FacetManifestSchema(input)
    expect(result).toBeInstanceOf(type.errors)
  })
})

// --- Business-rule constraints ---

describe('checkFacetManifestConstraints', () => {
  test('no text assets → error', () => {
    const input = {
      name: 'empty',
      version: '1.0.0',
      servers: { jira: '1.0.0' },
    }
    const result = FacetManifestSchema(input)
    expect(result).not.toBeInstanceOf(type.errors)
    const errors = checkFacetManifestConstraints(result as FacetManifest)
    expect(errors).toHaveLength(1)
    const firstError = errors[0]
    expect(firstError).toBeDefined()
    expect(firstError?.message).toContain('at least one text asset')
  })

  test('selective facets entry with no asset selection → error', () => {
    const input = {
      name: 'bad-selective',
      version: '1.0.0',
      facets: [{ name: 'other', version: '1.0.0' }],
    }
    const result = FacetManifestSchema(input)
    expect(result).not.toBeInstanceOf(type.errors)
    const errors = checkFacetManifestConstraints(result as FacetManifest)
    // Should have the selective entry error (and possibly the "no text" error if selective with no selections doesn't count)
    const selectiveError = errors.find((e) => e.message.includes('at least one asset type'))
    expect(selectiveError).toBeDefined()
    expect(selectiveError?.path).toBe('facets[0]')
  })
})

// --- Unknown field pass-through ---

describe('FacetManifestSchema — unknown field tolerance', () => {
  test('top-level unknown field is preserved', () => {
    const input = {
      name: 'my-facet',
      version: '1.0.0',
      skills: ['x'],
      license: 'MIT',
    }
    const result = FacetManifestSchema(input)
    expect(result).not.toBeInstanceOf(type.errors)
    const data = result as FacetManifest & { license: string }
    expect(data.license).toBe('MIT')
  })

  test('unknown field nested in agent descriptor is preserved', () => {
    const input = {
      name: 'my-facet',
      version: '1.0.0',
      agents: {
        reviewer: {
          prompt: 'Review code',
          model: 'claude-sonnet',
        },
      },
    }
    const result = FacetManifestSchema(input)
    expect(result).not.toBeInstanceOf(type.errors)
    const data = result as Record<string, unknown>
    const agents = data.agents as Record<string, Record<string, unknown>> | undefined
    expect(agents?.reviewer?.model).toBe('claude-sonnet')
  })
})
