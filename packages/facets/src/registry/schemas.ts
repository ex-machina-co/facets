import { type } from 'arktype'

const Prompt = type('string').or({ file: 'string' }).or({ url: 'string.url' })
type Prompt = typeof Prompt.infer

// --- Agent descriptor ---

const AgentPlatformOpencode = type({
  '+': 'ignore',
  'tools?': type({ '[string]': 'boolean' }).or('string[]'),
})

const AgentPlatformGeneric = type({ '[string]': 'unknown' })

const AgentDescriptor = type({
  'description?': 'string',
  prompt: Prompt,
  'platforms?': type({
    '+': 'ignore',
    'opencode?': AgentPlatformOpencode,
    '[string]': AgentPlatformGeneric,
  }),
})

// --- Command descriptor ---

const CommandDescriptor = type({
  'description?': 'string',
  prompt: Prompt,
})

// --- Platform section ---

const PlatformOpencode = type({
  'tools?': 'string[]',
})

const Platforms = type({
  '+': 'ignore',
  'opencode?': PlatformOpencode,
  '[string]': type({ '[string]': 'unknown' }),
})

const Requires = type('string').or('string[]')

// --- FacetManifest (facet.yaml) ---

export const FacetManifest = type({
  '+': 'ignore',
  name: 'string >= 1',
  version: 'string >= 1',
  'description?': 'string',
  'author?': 'string',
  'requires?': Requires,
  'skills?': 'string[]',
  'agents?': type({ '[string]': AgentDescriptor }),
  'commands?': type({ '[string]': CommandDescriptor }),
  'platforms?': Platforms,
})

export type FacetManifest = typeof FacetManifest.infer

// --- FacetsYaml (facets.yaml — project dependency file) ---

const RemoteEntry = type({
  url: 'string.url',
  'version?': 'string',
})

export const FacetsYaml = type({
  'remote?': type({ '[string]': RemoteEntry }),
  'local?': 'string[]',
})

export type FacetsYaml = typeof FacetsYaml.infer

// --- FacetsLock (facets.lock — lockfile) ---

const LockEntry = type({
  url: 'string.url',
  version: 'string',
  integrity: 'string',
})

export const FacetsLock = type({
  'remote?': type({ '[string]': LockEntry }),
})

export type FacetsLock = typeof FacetsLock.infer

// --- Helpers ---

/** Normalize requires to always be an array */
export function normalizeRequires(requires: string | string[] | undefined): string[] {
  if (!requires) return []
  if (typeof requires === 'string') return [requires]
  return requires
}

/** Resolve a prompt field to a file path relative to the facet directory */
export function resolvePromptPath(prompt: Prompt): string | null {
  if (typeof prompt === 'string') return prompt
  if ('file' in prompt) return prompt.file
  // URL prompts are not resolved to local paths
  return null
}
