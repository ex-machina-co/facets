import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import yaml from 'js-yaml'
import { loadManifest } from '../loader.ts'

let tempDir: string

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), 'facets-test-'))
})

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true })
})

describe('loadManifest', () => {
  test('loads valid manifest', async () => {
    const manifest = { name: 'test-facet', version: '1.0.0', description: 'A test' }
    await Bun.write(`${tempDir}/facet.yaml`, yaml.dump(manifest))

    const result = await loadManifest(`${tempDir}/facet.yaml`)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.manifest.name).toBe('test-facet')
      expect(result.manifest.version).toBe('1.0.0')
      expect(result.manifest.description).toBe('A test')
    }
  })

  test('returns error for missing file', async () => {
    const result = await loadManifest(`${tempDir}/nonexistent.yaml`)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Cannot read manifest')
    }
  })

  test('returns error for invalid YAML', async () => {
    await Bun.write(`${tempDir}/facet.yaml`, ':\n  :\n    - [invalid\n')

    const result = await loadManifest(`${tempDir}/facet.yaml`)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/Invalid (YAML|manifest)/)
    }
  })

  test('returns error for missing required fields', async () => {
    await Bun.write(`${tempDir}/facet.yaml`, yaml.dump({ description: 'no name or version' }))

    const result = await loadManifest(`${tempDir}/facet.yaml`)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('Invalid manifest')
    }
  })

  test('tolerates unrecognized fields', async () => {
    const manifest = { name: 'test', version: '1.0.0', customField: 'hello' }
    await Bun.write(`${tempDir}/facet.yaml`, yaml.dump(manifest))

    const result = await loadManifest(`${tempDir}/facet.yaml`)
    expect(result.success).toBe(true)
  })
})
