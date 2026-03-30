import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import type { BuildManifest } from '../schemas/build-manifest.ts'
import type { BuildResult } from './pipeline.ts'

const DIST_DIR = 'dist'
const BUILD_MANIFEST_FILE = 'build-manifest.json'

/**
 * Writes the build output to dist/.
 *
 * - Cleans (removes and recreates) the dist/ directory
 * - Writes the .facet archive (gzip-compressed tar)
 * - Writes build-manifest.json with integrity hash and per-asset hashes
 */
export async function writeBuildOutput(result: BuildResult, rootDir: string): Promise<void> {
  const distDir = join(rootDir, DIST_DIR)

  // Clean previous output
  await rm(distDir, { recursive: true, force: true })
  await mkdir(distDir, { recursive: true })

  // Write the .facet archive
  await Bun.write(join(distDir, result.archiveFilename), result.archiveBytes)

  // Write build manifest
  const manifest: BuildManifest = {
    facetVersion: 1,
    archive: result.archiveFilename,
    integrity: result.integrity,
    assets: result.assetHashes,
  }
  await Bun.write(join(distDir, BUILD_MANIFEST_FILE), JSON.stringify(manifest, null, 2))
}
