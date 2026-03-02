import { describe, expect, test } from 'bun:test'
import {
  FacetManifestSchema,
  FacetsLockSchema,
  FacetsYamlSchema,
  normalizeRequires,
  resolvePromptPath,
} from '../schemas.ts'

describe('FacetManifestSchema', () => {
  test('accepts valid minimal manifest', () => {
    const result = FacetManifestSchema.safeParse({
      name: 'my-facet',
      version: '1.0.0',
    })
    expect(result.success).toBe(true)
  })

  test('accepts full manifest with all fields', () => {
    const result = FacetManifestSchema.safeParse({
      name: 'my-facet',
      version: '1.0.0',
      description: 'A test facet',
      author: 'Test <test@example.com>',
      requires: ['gh --version', 'jq --version'],
      skills: ['my-skill'],
      agents: {
        'my-agent': {
          description: 'Does a thing',
          prompt: 'prompts/my-agent.md',
          platforms: {
            opencode: { tools: { write: false } },
          },
        },
      },
      commands: {
        'my-command': {
          description: 'What it does',
          prompt: { file: 'prompts/my-command.md' },
        },
      },
      platforms: {
        opencode: {
          tools: ['my-tool'],
        },
      },
    })
    expect(result.success).toBe(true)
  })

  test('rejects manifest without name', () => {
    const result = FacetManifestSchema.safeParse({ version: '1.0.0' })
    expect(result.success).toBe(false)
  })

  test('rejects manifest without version', () => {
    const result = FacetManifestSchema.safeParse({ name: 'test' })
    expect(result.success).toBe(false)
  })

  test('tolerates unrecognized fields', () => {
    const result = FacetManifestSchema.safeParse({
      name: 'my-facet',
      version: '1.0.0',
      unknownField: 'value',
      anotherField: 42,
    })
    expect(result.success).toBe(true)
  })

  test('accepts requires as string', () => {
    const result = FacetManifestSchema.safeParse({
      name: 'my-facet',
      version: '1.0.0',
      requires: 'gh --version',
    })
    expect(result.success).toBe(true)
  })

  test('accepts requires as array', () => {
    const result = FacetManifestSchema.safeParse({
      name: 'my-facet',
      version: '1.0.0',
      requires: ['gh --version', 'jq --version'],
    })
    expect(result.success).toBe(true)
  })

  test('accepts prompt as string', () => {
    const result = FacetManifestSchema.safeParse({
      name: 'test',
      version: '1.0.0',
      agents: {
        agent1: { prompt: 'prompts/agent1.md' },
      },
    })
    expect(result.success).toBe(true)
  })

  test('accepts prompt as object with file', () => {
    const result = FacetManifestSchema.safeParse({
      name: 'test',
      version: '1.0.0',
      agents: {
        agent1: { prompt: { file: 'prompts/agent1.md' } },
      },
    })
    expect(result.success).toBe(true)
  })

  test('accepts prompt as object with url', () => {
    const result = FacetManifestSchema.safeParse({
      name: 'test',
      version: '1.0.0',
      agents: {
        agent1: { prompt: { url: 'https://example.com/prompt' } },
      },
    })
    expect(result.success).toBe(true)
  })

  test('accepts agent with array-style tools', () => {
    const result = FacetManifestSchema.safeParse({
      name: 'test',
      version: '1.0.0',
      agents: {
        agent1: {
          prompt: 'prompts/a.md',
          platforms: {
            'claude-code': { tools: ['Read', 'Edit', 'Bash'] },
          },
        },
      },
    })
    expect(result.success).toBe(true)
  })
})

describe('FacetsYamlSchema', () => {
  test('accepts valid dependency file', () => {
    const result = FacetsYamlSchema.safeParse({
      local: ['my-local-facet'],
      remote: {
        viper: {
          url: 'https://example.com/facets/viper/facet.yaml',
          version: '1.2.0',
        },
      },
    })
    expect(result.success).toBe(true)
  })

  test('accepts empty dependency file', () => {
    const result = FacetsYamlSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  test('accepts local-only dependencies', () => {
    const result = FacetsYamlSchema.safeParse({
      local: ['one', 'two'],
    })
    expect(result.success).toBe(true)
  })
})

describe('FacetsLockSchema', () => {
  test('accepts valid lockfile', () => {
    const result = FacetsLockSchema.safeParse({
      remote: {
        viper: {
          url: 'https://example.com/facets/viper/facet.yaml',
          version: '1.2.0',
          integrity: 'sha256-abc123',
        },
      },
    })
    expect(result.success).toBe(true)
  })

  test('accepts empty lockfile', () => {
    const result = FacetsLockSchema.safeParse({})
    expect(result.success).toBe(true)
  })
})

describe('normalizeRequires', () => {
  test('returns empty array for undefined', () => {
    expect(normalizeRequires(undefined)).toEqual([])
  })

  test('wraps string in array', () => {
    expect(normalizeRequires('gh --version')).toEqual(['gh --version'])
  })

  test('passes array through', () => {
    expect(normalizeRequires(['a', 'b'])).toEqual(['a', 'b'])
  })
})

describe('resolvePromptPath', () => {
  test('returns string prompt as-is', () => {
    expect(resolvePromptPath('prompts/a.md')).toBe('prompts/a.md')
  })

  test('returns file path from object', () => {
    expect(resolvePromptPath({ file: 'prompts/a.md' })).toBe('prompts/a.md')
  })

  test('returns null for url prompt', () => {
    expect(resolvePromptPath({ url: 'https://example.com/prompt' })).toBeNull()
  })
})
