// types

export { detectNamingCollisions } from './build/detect-collisions.ts'
export type { BuildFailure, BuildResult } from './build/pipeline.ts'
// build pipeline
export { runBuildPipeline } from './build/pipeline.ts'
export { validateCompactFacets } from './build/validate-facets.ts'
export type { PlatformValidationResult } from './build/validate-platforms.ts'
export { validatePlatformConfigs } from './build/validate-platforms.ts'
export { writeBuildOutput } from './build/write-output.ts'
export type { ResolvedFacetManifest } from './loaders/facet.ts'
// loaders
export { loadManifest, resolvePrompts } from './loaders/facet.ts'
export { loadServerManifest } from './loaders/server.ts'
export type { FacetManifest } from './schemas/facet-manifest.ts'
// schemas
export {
  checkFacetManifestConstraints,
  FacetManifestSchema,
} from './schemas/facet-manifest.ts'
export type { Lockfile } from './schemas/lockfile.ts'
export { LockfileSchema } from './schemas/lockfile.ts'
export type { ServerManifest } from './schemas/server-manifest.ts'
export { ServerManifestSchema } from './schemas/server-manifest.ts'
export type { Result, ValidationError } from './types.ts'
