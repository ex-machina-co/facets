import { join } from 'node:path'
import { type } from 'arktype'
import { checkFacetManifestConstraints, type FacetManifest, FacetManifestSchema } from '../schemas/facet-manifest.ts'
import type { Result, ValidationError } from '../types.ts'
import { mapArkErrors, parseYaml, readFile } from './validate.ts'

const FACET_MANIFEST_FILE = 'facet.yaml'

/**
 * Loads and validates a facet manifest from the specified directory.
 *
 * Reads `facet.yaml`, parses YAML, validates against the schema, and checks
 * business-rule constraints. Returns a discriminated result — either the
 * validated manifest or structured errors.
 */
export async function loadManifest(dir: string): Promise<Result<FacetManifest>> {
  const filePath = join(dir, FACET_MANIFEST_FILE)

  // Phase 0: Read the file
  const fileResult = await readFile(filePath)
  if (!fileResult.ok) {
    return fileResult
  }

  // Phase 1: Parse YAML
  const yamlResult = parseYaml(fileResult.content)
  if (!yamlResult.ok) {
    return yamlResult
  }

  // Phase 2: Schema validation
  const validated = FacetManifestSchema(yamlResult.data)
  if (validated instanceof type.errors) {
    return { ok: false, errors: mapArkErrors(validated) }
  }

  // Phase 3: Business-rule constraints
  const constraintErrors = checkFacetManifestConstraints(validated)
  if (constraintErrors.length > 0) {
    return { ok: false, errors: constraintErrors }
  }

  return { ok: true, data: validated }
}

/**
 * A manifest with all prompts resolved to their string content.
 * File references have been read and replaced with file contents.
 */
export interface ResolvedFacetManifest {
  name: string
  version: string
  description?: string
  author?: string
  skills?: Record<
    string,
    {
      description: string
      prompt: string
      platforms?: Record<string, unknown>
    }
  >
  agents?: Record<
    string,
    {
      description?: string
      prompt: string
      platforms?: Record<string, unknown>
    }
  >
  commands?: Record<
    string,
    {
      description?: string
      prompt: string
    }
  >
  facets?: FacetManifest['facets']
  servers?: FacetManifest['servers']
}

/**
 * Resolves all prompt fields in skills, agents, and commands to their string content.
 *
 * - Inline strings are used as-is.
 * - File references (`{file: path}`) are read relative to the root directory.
 *
 * This also serves as file existence verification for all three asset types —
 * if a referenced file doesn't exist, resolution fails with an error identifying
 * the asset and the missing file.
 *
 * Returns a new manifest with all prompts resolved to strings, or an error
 * result identifying which prompt failed and why.
 */
export async function resolvePrompts(manifest: FacetManifest, rootDir: string): Promise<Result<ResolvedFacetManifest>> {
  const errors: ValidationError[] = []

  // Resolve skill prompts
  let resolvedSkills: ResolvedFacetManifest['skills'] | undefined
  if (manifest.skills) {
    resolvedSkills = {}
    for (const [name, skill] of Object.entries(manifest.skills)) {
      const resolvedPrompt = await resolvePrompt(skill.prompt, rootDir, `skills.${name}.prompt`)
      if (typeof resolvedPrompt === 'string') {
        resolvedSkills[name] = { ...skill, prompt: resolvedPrompt }
      } else {
        errors.push(resolvedPrompt)
      }
    }
  }

  // Resolve agent prompts
  let resolvedAgents: ResolvedFacetManifest['agents'] | undefined
  if (manifest.agents) {
    resolvedAgents = {}
    for (const [name, agent] of Object.entries(manifest.agents)) {
      const resolvedPrompt = await resolvePrompt(agent.prompt, rootDir, `agents.${name}.prompt`)
      if (typeof resolvedPrompt === 'string') {
        resolvedAgents[name] = { ...agent, prompt: resolvedPrompt }
      } else {
        errors.push(resolvedPrompt)
      }
    }
  }

  // Resolve command prompts
  let resolvedCommands: ResolvedFacetManifest['commands'] | undefined
  if (manifest.commands) {
    resolvedCommands = {}
    for (const [name, command] of Object.entries(manifest.commands)) {
      const resolvedPrompt = await resolvePrompt(command.prompt, rootDir, `commands.${name}.prompt`)
      if (typeof resolvedPrompt === 'string') {
        resolvedCommands[name] = { ...command, prompt: resolvedPrompt }
      } else {
        errors.push(resolvedPrompt)
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  const resolved: ResolvedFacetManifest = {
    name: manifest.name,
    version: manifest.version,
    ...(manifest.description !== undefined && { description: manifest.description }),
    ...(manifest.author !== undefined && { author: manifest.author }),
    ...(resolvedSkills !== undefined && { skills: resolvedSkills }),
    ...(resolvedAgents !== undefined && { agents: resolvedAgents }),
    ...(resolvedCommands !== undefined && { commands: resolvedCommands }),
    ...(manifest.facets !== undefined && { facets: manifest.facets }),
    ...(manifest.servers !== undefined && { servers: manifest.servers }),
  }

  return { ok: true, data: resolved }
}

/**
 * Resolves a single prompt value to a string.
 * Returns the resolved string content, or a ValidationError if resolution fails.
 */
async function resolvePrompt(
  prompt: string | { file: string },
  rootDir: string,
  fieldPath: string,
): Promise<string | ValidationError> {
  if (typeof prompt === 'string') {
    return prompt
  }

  const filePath = join(rootDir, prompt.file)
  const file = Bun.file(filePath)
  const exists = await file.exists()

  if (!exists) {
    return {
      path: fieldPath,
      message: `Prompt file not found: ${prompt.file} (resolved to ${filePath})`,
      expected: 'file to exist',
      actual: 'file not found',
    }
  }

  return file.text()
}
