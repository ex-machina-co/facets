import { type } from 'arktype'

// --- Sub-schemas ---

/** Prompt field: inline string or file reference */
const Prompt = type('string').or({ file: 'string' })

/** Agent descriptor */
const AgentDescriptor = type({
  'description?': 'string',
  prompt: Prompt,
  'platforms?': type.Record('string', 'unknown'),
})

/** Command descriptor */
const CommandDescriptor = type({
  'description?': 'string',
  prompt: Prompt,
})

/** Selective facets entry — cherry-pick specific assets from another facet */
const SelectiveFacetsEntry = type({
  name: 'string',
  version: 'string',
  'skills?': 'string[]',
  'agents?': 'string[]',
  'commands?': 'string[]',
})

/** Facets entry: compact string ("name@version") or selective object */
const FacetsEntry = type('string').or(SelectiveFacetsEntry)

/** Server reference: source-mode (floor version string) or ref-mode (OCI image object) */
const ServerReference = type('string').or({ image: 'string' })

// --- Main schema ---

/**
 * The structural schema for facet.yaml — validates shape only.
 * Custom constraints (at least one text asset, selective entry must select at least one type)
 * are checked post-validation by validateFacetManifest().
 */
export const FacetManifestSchema = type({
  name: 'string',
  version: 'string',
  'description?': 'string',
  'author?': 'string',
  'skills?': 'string[]',
  'agents?': type.Record('string', AgentDescriptor),
  'commands?': type.Record('string', CommandDescriptor),
  'facets?': FacetsEntry.array(),
  'servers?': type.Record('string', ServerReference),
})

/** Inferred TypeScript type for a validated facet manifest */
export type FacetManifest = typeof FacetManifestSchema.infer

// --- Custom validation ---

export interface FacetManifestError {
  path: string
  message: string
  expected: string
  actual: string
}

/**
 * Checks business-rule constraints that ArkType's structural validation cannot express:
 * 1. At least one text asset must be present (skills, agents, commands, or facets)
 * 2. Selective facets entries must include at least one asset type
 */
export function checkFacetManifestConstraints(manifest: FacetManifest): FacetManifestError[] {
  const errors: FacetManifestError[] = []

  // Constraint 1: at least one text asset
  const hasSkills = manifest.skills && manifest.skills.length > 0
  const hasAgents = manifest.agents && Object.keys(manifest.agents).length > 0
  const hasCommands = manifest.commands && Object.keys(manifest.commands).length > 0
  const hasFacets = manifest.facets && manifest.facets.length > 0

  if (!hasSkills && !hasAgents && !hasCommands && !hasFacets) {
    errors.push({
      path: '',
      message: 'Manifest must include at least one text asset (skills, agents, commands, or facets)',
      expected: 'at least one of: skills, agents, commands, facets',
      actual: 'none present',
    })
  }

  // Constraint 2: selective facets entries must select at least one asset type
  if (manifest.facets) {
    for (let i = 0; i < manifest.facets.length; i++) {
      const entry = manifest.facets[i]
      if (typeof entry === 'object') {
        const hasSelectedSkills = entry.skills && entry.skills.length > 0
        const hasSelectedAgents = entry.agents && entry.agents.length > 0
        const hasSelectedCommands = entry.commands && entry.commands.length > 0

        if (!hasSelectedSkills && !hasSelectedAgents && !hasSelectedCommands) {
          errors.push({
            path: `facets[${i}]`,
            message: 'Selective facets entry must include at least one asset type (skills, agents, or commands)',
            expected: 'at least one of: skills, agents, commands',
            actual: 'none selected',
          })
        }
      }
    }
  }

  return errors
}
