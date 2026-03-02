import { type } from 'arktype'
import yaml from 'js-yaml'
import { FacetManifest } from './schemas.ts'

export interface LoadManifestSuccess {
  success: true
  manifest: FacetManifest
}

export interface LoadManifestError {
  success: false
  error: string
}

export type LoadManifestResult = LoadManifestSuccess | LoadManifestError

/**
 * Load and validate a facet.yaml manifest from the given path.
 * Returns the parsed manifest or a structured error.
 */
export async function loadManifest(manifestPath: string): Promise<LoadManifestResult> {
  let raw: string
  try {
    raw = await Bun.file(manifestPath).text()
  } catch {
    return { success: false, error: `Cannot read manifest: ${manifestPath}` }
  }

  let parsed: unknown
  try {
    parsed = yaml.load(raw)
  } catch (err) {
    return { success: false, error: `Invalid YAML in manifest: ${err}` }
  }

  const result = FacetManifest(parsed)
  if (result instanceof type.errors) {
    return { success: false, error: `Invalid manifest: ${result.summary}` }
  }

  return { success: true, manifest: result }
}
