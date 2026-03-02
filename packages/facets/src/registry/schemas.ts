import { z } from 'zod/v4'

// --- Prompt field: string (file path) or object with file/url ---

const PromptSchema = z.union([z.string(), z.object({ file: z.string() }), z.object({ url: z.string().url() })])

// --- Agent descriptor ---

const AgentPlatformOpencode = z
  .object({
    tools: z.union([z.record(z.string(), z.boolean()), z.array(z.string())]).optional(),
  })
  .passthrough()

const AgentPlatformGeneric = z.record(z.string(), z.unknown())

const AgentDescriptorSchema = z.object({
  description: z.string().optional(),
  prompt: PromptSchema,
  platforms: z
    .object({
      opencode: AgentPlatformOpencode.optional(),
    })
    .catchall(AgentPlatformGeneric)
    .optional(),
})

// --- Command descriptor ---

const CommandDescriptorSchema = z.object({
  description: z.string().optional(),
  prompt: PromptSchema,
})

// --- Platform section ---

const PlatformOpencodeSchema = z.object({
  tools: z.array(z.string()).optional(),
})

const PlatformsSchema = z
  .object({
    opencode: PlatformOpencodeSchema.optional(),
  })
  .catchall(z.record(z.string(), z.unknown()))

// --- Requires: string or array of strings ---

const RequiresSchema = z.union([z.string(), z.array(z.string())])

// --- FacetManifest (facet.yaml) ---

export const FacetManifestSchema = z
  .object({
    name: z.string().min(1),
    version: z.string().min(1),
    description: z.string().optional(),
    author: z.string().optional(),
    requires: RequiresSchema.optional(),
    skills: z.array(z.string()).optional(),
    agents: z.record(z.string(), AgentDescriptorSchema).optional(),
    commands: z.record(z.string(), CommandDescriptorSchema).optional(),
    platforms: PlatformsSchema.optional(),
  })
  .passthrough()

export type FacetManifest = z.infer<typeof FacetManifestSchema>

// --- FacetsYaml (facets.yaml — project dependency file) ---

const RemoteEntrySchema = z.object({
  url: z.string().url(),
  version: z.string().optional(),
})

export const FacetsYamlSchema = z.object({
  remote: z.record(z.string(), RemoteEntrySchema).optional(),
  local: z.array(z.string()).optional(),
})

export type FacetsYaml = z.infer<typeof FacetsYamlSchema>

// --- FacetsLock (facets.lock — lockfile) ---

const LockEntrySchema = z.object({
  url: z.string().url(),
  version: z.string(),
  integrity: z.string(),
})

export const FacetsLockSchema = z.object({
  remote: z.record(z.string(), LockEntrySchema).optional(),
})

export type FacetsLock = z.infer<typeof FacetsLockSchema>

// --- Helpers ---

/** Normalize requires to always be an array */
export function normalizeRequires(requires: string | string[] | undefined): string[] {
  if (!requires) return []
  if (typeof requires === 'string') return [requires]
  return requires
}

/** Resolve a prompt field to a file path relative to the facet directory */
export function resolvePromptPath(prompt: z.infer<typeof PromptSchema>): string | null {
  if (typeof prompt === 'string') return prompt
  if ('file' in prompt) return prompt.file
  // URL prompts are not resolved to local paths
  return null
}
