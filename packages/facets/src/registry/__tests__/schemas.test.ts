import { describe, expect, test } from 'bun:test'
import { type } from 'arktype'
import { FacetManifest, FacetsLock, FacetsYaml, normalizeRequires, resolvePromptPath } from '../schemas.ts'

describe('FacetManifest', () => {
  test('accepts valid minimal manifest', () => {
    const result = FacetManifest({
      name: 'my-facet',
      version: '1.0.0',
    })
    expect(result).not.toBeInstanceOf(type.errors)
  })

  test('accepts full manifest with all fields', () => {
    const result = FacetManifest({
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
    expect(result).not.toBeInstanceOf(type.errors)
  })

  test('rejects manifest without name', () => {
    const result = FacetManifest({ version: '1.0.0' })
    expect(result).toBeInstanceOf(type.errors)
  })

  test('rejects manifest without version', () => {
    const result = FacetManifest({ name: 'test' })
    expect(result).toBeInstanceOf(type.errors)
  })

  test('tolerates unrecognized fields', () => {
    const result = FacetManifest({
      name: 'my-facet',
      version: '1.0.0',
      unknownField: 'value',
      anotherField: 42,
    })
    expect(result).not.toBeInstanceOf(type.errors)
  })

  test('accepts requires as string', () => {
    const result = FacetManifest({
      name: 'my-facet',
      version: '1.0.0',
      requires: 'gh --version',
    })
    expect(result).not.toBeInstanceOf(type.errors)
  })

  test('accepts requires as array', () => {
    const result = FacetManifest({
      name: 'my-facet',
      version: '1.0.0',
      requires: ['gh --version', 'jq --version'],
    })
    expect(result).not.toBeInstanceOf(type.errors)
  })

  test('accepts prompt as string', () => {
    const result = FacetManifest({
      name: 'test',
      version: '1.0.0',
      agents: {
        agent1: { prompt: 'prompts/agent1.md' },
      },
    })
    expect(result).not.toBeInstanceOf(type.errors)
  })

  test('accepts prompt as object with file', () => {
    const result = FacetManifest({
      name: 'test',
      version: '1.0.0',
      agents: {
        agent1: { prompt: { file: 'prompts/agent1.md' } },
      },
    })
    expect(result).not.toBeInstanceOf(type.errors)
  })

  test('accepts prompt as object with url', () => {
    const result = FacetManifest({
      name: 'test',
      version: '1.0.0',
      agents: {
        agent1: { prompt: { url: 'https://example.com/prompt' } },
      },
    })
    expect(result).not.toBeInstanceOf(type.errors)
  })

  test('accepts agent with array-style tools', () => {
    const result = FacetManifest({
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
    expect(result).not.toBeInstanceOf(type.errors)
  })
})

describe('FacetsYaml', () => {
  test('accepts valid dependency file', () => {
    const result = FacetsYaml({
      local: ['my-local-facet'],
      remote: {
        viper: {
          url: 'https://example.com/facets/viper/facet.yaml',
          version: '1.2.0',
        },
      },
    })
    expect(result).not.toBeInstanceOf(type.errors)
  })

  test('accepts empty dependency file', () => {
    const result = FacetsYaml({})
    expect(result).not.toBeInstanceOf(type.errors)
  })

  test('accepts local-only dependencies', () => {
    const result = FacetsYaml({
      local: ['one', 'two'],
    })
    expect(result).not.toBeInstanceOf(type.errors)
  })
})

describe('FacetsLock', () => {
  test('accepts valid lockfile', () => {
    const result = FacetsLock({
      remote: {
        viper: {
          url: 'https://example.com/facets/viper/facet.yaml',
          version: '1.2.0',
          integrity: 'sha256-abc123',
        },
      },
    })
    expect(result).not.toBeInstanceOf(type.errors)
  })

  test('accepts empty lockfile', () => {
    const result = FacetsLock({})
    expect(result).not.toBeInstanceOf(type.errors)
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
