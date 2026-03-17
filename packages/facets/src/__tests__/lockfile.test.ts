import { describe, expect, test } from 'bun:test'
import { type } from 'arktype'
import { type Lockfile, LockfileSchema } from '../schemas/lockfile.ts'

// --- Valid lockfiles ---

describe('LockfileSchema — valid lockfiles', () => {
  test('lockfile with source-mode servers', () => {
    const input = {
      facet: {
        name: 'acme-dev',
        version: '1.0.0',
        integrity: 'sha256:abc123',
      },
      servers: {
        jira: {
          version: '1.5.2',
          integrity: 'sha256:def456',
          api_surface: 'sha256:789abc',
        },
      },
    }
    const result = LockfileSchema(input)
    expect(result).not.toBeInstanceOf(type.errors)
    const data = result as Lockfile
    expect(data.facet.name).toBe('acme-dev')
    expect(data.servers?.jira).toEqual({
      version: '1.5.2',
      integrity: 'sha256:def456',
      api_surface: 'sha256:789abc',
    })
  })

  test('lockfile with ref-mode servers', () => {
    const input = {
      facet: {
        name: 'acme-dev',
        version: '1.0.0',
        integrity: 'sha256:abc123',
      },
      servers: {
        slack: {
          image: 'ghcr.io/acme/slack-bot:v2',
          digest: 'sha256:e4d909',
          api_surface: 'sha256:567ghi',
        },
      },
    }
    const result = LockfileSchema(input)
    expect(result).not.toBeInstanceOf(type.errors)
    const data = result as Lockfile
    expect(data.servers?.slack).toEqual({
      image: 'ghcr.io/acme/slack-bot:v2',
      digest: 'sha256:e4d909',
      api_surface: 'sha256:567ghi',
    })
  })

  test('lockfile with mixed server types', () => {
    const input = {
      facet: {
        name: 'acme-dev',
        version: '1.0.0',
        integrity: 'sha256:abc123',
      },
      servers: {
        jira: {
          version: '1.5.2',
          integrity: 'sha256:def456',
          api_surface: 'sha256:789abc',
        },
        slack: {
          image: 'ghcr.io/acme/slack-bot:v2',
          digest: 'sha256:e4d909',
          api_surface: 'sha256:567ghi',
        },
      },
    }
    const result = LockfileSchema(input)
    expect(result).not.toBeInstanceOf(type.errors)
  })

  test('lockfile without servers is valid', () => {
    const input = {
      facet: {
        name: 'no-servers',
        version: '1.0.0',
        integrity: 'sha256:abc123',
      },
    }
    const result = LockfileSchema(input)
    expect(result).not.toBeInstanceOf(type.errors)
    const data = result as Lockfile
    expect(data.servers).toBeUndefined()
  })
})

// --- Invalid lockfiles ---

describe('LockfileSchema — invalid lockfiles', () => {
  test('missing facet integrity', () => {
    const input = {
      facet: {
        name: 'acme-dev',
        version: '1.0.0',
      },
    }
    const result = LockfileSchema(input)
    expect(result).toBeInstanceOf(type.errors)
  })

  test('incomplete source-mode server entry', () => {
    const input = {
      facet: {
        name: 'acme-dev',
        version: '1.0.0',
        integrity: 'sha256:abc123',
      },
      servers: {
        jira: {
          version: '1.5.2',
          // missing integrity and api_surface
        },
      },
    }
    const result = LockfileSchema(input)
    expect(result).toBeInstanceOf(type.errors)
  })

  test('ref-mode missing digest', () => {
    const input = {
      facet: {
        name: 'acme-dev',
        version: '1.0.0',
        integrity: 'sha256:abc123',
      },
      servers: {
        slack: {
          image: 'ghcr.io/acme/slack-bot:v2',
          // missing digest and api_surface
        },
      },
    }
    const result = LockfileSchema(input)
    expect(result).toBeInstanceOf(type.errors)
  })
})

// --- Unknown field pass-through ---

describe('LockfileSchema — unknown field tolerance', () => {
  test('unknown field in lockfile is preserved', () => {
    const input = {
      facet: {
        name: 'acme-dev',
        version: '1.0.0',
        integrity: 'sha256:abc123',
      },
      generatedAt: '2026-03-08',
    }
    const result = LockfileSchema(input)
    expect(result).not.toBeInstanceOf(type.errors)
    const data = result as Lockfile & { generatedAt: string }
    expect(data.generatedAt).toBe('2026-03-08')
  })
})
