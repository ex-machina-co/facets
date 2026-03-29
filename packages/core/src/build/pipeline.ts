import { loadManifest, type ResolvedFacetManifest, resolvePrompts } from '../loaders/facet.ts'
import type { ValidationError } from '../types.ts'
import { detectNamingCollisions } from './detect-collisions.ts'
import { validateCompactFacets } from './validate-facets.ts'
import { validatePlatformConfigs } from './validate-platforms.ts'

export interface BuildResult {
  ok: true
  data: ResolvedFacetManifest
  warnings: string[]
}

export interface BuildFailure {
  ok: false
  errors: ValidationError[]
  warnings: string[]
}

/**
 * Runs the full build validation pipeline:
 * 1. Load manifest — read facet.yaml, parse YAML, validate schema, check constraints
 * 2. Resolve prompts — read file-based prompts for skills, agents, commands (also verifies files exist)
 * 3. Validate compact facets format — check name@version pattern
 * 4. Detect naming collisions — fail if same name used within an asset type
 * 5. Validate platform config — check known platform schemas, warn on unknown
 *
 * Returns the resolved manifest on success, or collected errors on failure.
 * Warnings are returned in both cases.
 */
export async function runBuildPipeline(rootDir: string): Promise<BuildResult | BuildFailure> {
  const warnings: string[] = []

  // Stage 1: Load manifest
  const loadResult = await loadManifest(rootDir)
  if (!loadResult.ok) {
    return { ok: false, errors: loadResult.errors, warnings }
  }
  const manifest = loadResult.data

  // Stage 2: Resolve prompts (also serves as file existence verification)
  const resolveResult = await resolvePrompts(manifest, rootDir)
  if (!resolveResult.ok) {
    return { ok: false, errors: resolveResult.errors, warnings }
  }

  // Stage 3: Validate compact facets format
  const facetsErrors = validateCompactFacets(manifest)
  if (facetsErrors.length > 0) {
    return { ok: false, errors: facetsErrors, warnings }
  }

  // Stage 4: Detect naming collisions
  const collisionErrors = detectNamingCollisions(manifest)
  if (collisionErrors.length > 0) {
    return { ok: false, errors: collisionErrors, warnings }
  }

  // Stage 5: Validate platform config
  const platformResult = validatePlatformConfigs(manifest)
  if (platformResult.errors.length > 0) {
    return { ok: false, errors: platformResult.errors, warnings: [...warnings, ...platformResult.warnings] }
  }
  warnings.push(...platformResult.warnings)

  return { ok: true, data: resolveResult.data, warnings }
}
