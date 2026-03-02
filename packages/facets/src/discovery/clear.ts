import { rm } from 'node:fs/promises'
import { getCacheRoot } from './cache.ts'

/**
 * Remove the entire global facet cache directory.
 * Does not affect local facets or installed resources.
 */
export async function clearCache(): Promise<void> {
  const cacheRoot = getCacheRoot()
  try {
    await rm(cacheRoot, { recursive: true, force: true })
  } catch {
    // Cache dir doesn't exist — that's fine
  }
}
