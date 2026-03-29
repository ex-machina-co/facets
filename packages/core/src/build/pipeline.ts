import { join } from 'node:path'
import { loadManifest, type ResolvedFacetManifest, resolvePrompts } from '../loaders/facet.ts'
import type { ValidationError } from '../types.ts'
import {
  assembleTar,
  collectArchiveEntries,
  compressArchive,
  computeAssetHashes,
  computeContentHash,
} from './content-hash.ts'
import { detectNamingCollisions } from './detect-collisions.ts'
import { validateCompactFacets } from './validate-facets.ts'
import { validatePlatformConfigs } from './validate-platforms.ts'

const MANIFEST_FILE = 'facet.yaml'

export interface BuildProgress {
  stage: string
  status: 'running' | 'done' | 'failed'
}

export interface BuildResult {
  ok: true
  data: ResolvedFacetManifest
  warnings: string[]
  archiveBytes: Uint8Array
  integrity: string
  archiveFilename: string
  assetHashes: Record<string, string>
}

export interface BuildFailure {
  ok: false
  errors: ValidationError[]
  warnings: string[]
}

/**
 * Runs the full build pipeline:
 * 1. Load manifest — read facet.yaml, parse YAML, validate schema, check constraints
 * 2. Resolve prompts — read file-based prompts for skills, agents, commands (also verifies files exist)
 * 3. Validate compact facets format — check name@version pattern
 * 4. Detect naming collisions — fail if same name used within an asset type
 * 5. Validate platform config — check known platform schemas, warn on unknown
 * 6. Assemble archive — collect entries, compute per-asset hashes, build deterministic tar, compute integrity hash, compress for delivery
 *
 * Returns the resolved manifest and archive data on success, or collected errors on failure.
 * Warnings are returned in both cases.
 *
 * An optional `onProgress` callback receives stage updates for UI display.
 */
export async function runBuildPipeline(
  rootDir: string,
  onProgress?: (progress: BuildProgress) => void,
): Promise<BuildResult | BuildFailure> {
  const warnings: string[] = []

  // Stage 1: Load manifest
  onProgress?.({ stage: 'Validating manifest', status: 'running' })

  const loadResult = await loadManifest(rootDir)
  if (!loadResult.ok) {
    onProgress?.({ stage: 'Validating manifest', status: 'failed' })
    return { ok: false, errors: loadResult.errors, warnings }
  }
  const manifest = loadResult.data

  // Stage 2: Resolve prompts (also serves as file existence verification)
  const resolveResult = await resolvePrompts(manifest, rootDir)
  if (!resolveResult.ok) {
    onProgress?.({ stage: 'Validating manifest', status: 'failed' })
    return { ok: false, errors: resolveResult.errors, warnings }
  }

  // Stage 3: Validate compact facets format
  const facetsErrors = validateCompactFacets(manifest)
  if (facetsErrors.length > 0) {
    onProgress?.({ stage: 'Validating manifest', status: 'failed' })
    return { ok: false, errors: facetsErrors, warnings }
  }

  // Stage 4: Detect naming collisions
  const collisionErrors = detectNamingCollisions(manifest)
  if (collisionErrors.length > 0) {
    onProgress?.({ stage: 'Validating manifest', status: 'failed' })
    return { ok: false, errors: collisionErrors, warnings }
  }

  // Stage 5: Validate platform config
  const platformResult = validatePlatformConfigs(manifest)
  if (platformResult.errors.length > 0) {
    onProgress?.({ stage: 'Validating manifest', status: 'failed' })
    return { ok: false, errors: platformResult.errors, warnings: [...warnings, ...platformResult.warnings] }
  }
  warnings.push(...platformResult.warnings)

  onProgress?.({ stage: 'Validating manifest', status: 'done' })

  // Stage 6: Assemble archive, compute content hashes, and compress for delivery
  onProgress?.({ stage: 'Assembling archive', status: 'running' })

  const resolved = resolveResult.data
  const manifestContent = await Bun.file(join(rootDir, MANIFEST_FILE)).text()
  const entries = collectArchiveEntries(resolved, manifestContent)
  const assetHashes = computeAssetHashes(entries)
  const tarBytes = assembleTar(entries)
  const integrity = computeContentHash(tarBytes)
  const archiveBytes = compressArchive(tarBytes)
  const archiveFilename = `${resolved.name}-${resolved.version}.facet`

  onProgress?.({ stage: 'Assembling archive', status: 'done' })

  return {
    ok: true,
    data: resolved,
    warnings,
    archiveBytes,
    integrity,
    archiveFilename,
    assetHashes,
  }
}
