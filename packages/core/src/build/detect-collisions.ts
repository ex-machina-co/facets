import type { FacetManifest } from '../schemas/facet-manifest.ts'
import type { ValidationError } from '../types.ts'

type AssetType = 'skill' | 'agent' | 'command'

interface AssetEntry {
  name: string
  type: AssetType
}

/**
 * Detects naming collisions across skills, agents, and commands.
 * Skills, agents, and commands share a namespace — duplicate names
 * across asset types are an error.
 */
export function detectNamingCollisions(manifest: FacetManifest): ValidationError[] {
  const errors: ValidationError[] = []
  const seen = new Map<string, AssetType>()

  const assets: AssetEntry[] = []

  if (manifest.skills) {
    for (const name of Object.keys(manifest.skills)) {
      assets.push({ name, type: 'skill' })
    }
  }
  if (manifest.agents) {
    for (const name of Object.keys(manifest.agents)) {
      assets.push({ name, type: 'agent' })
    }
  }
  if (manifest.commands) {
    for (const name of Object.keys(manifest.commands)) {
      assets.push({ name, type: 'command' })
    }
  }

  for (const asset of assets) {
    const existing = seen.get(asset.name)
    if (existing) {
      errors.push({
        path: asset.name,
        message: `Naming collision: "${asset.name}" is declared as both a ${existing} and a ${asset.type}`,
        expected: 'unique name across all asset types',
        actual: `"${asset.name}" used by ${existing} and ${asset.type}`,
      })
    } else {
      seen.set(asset.name, asset.type)
    }
  }

  return errors
}
