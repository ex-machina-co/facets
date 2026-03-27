import { type } from 'arktype'
import type { FacetManifest } from '../schemas/facet-manifest.ts'
import type { ValidationError } from '../types.ts'

// --- Known platform schemas ---

/** OpenCode platform config schema */
const OpenCodePlatformSchema = type({
  'tools?': type.Record('string', 'boolean'),
  'model?': 'string',
})

/** Claude Code platform config schema */
const ClaudeCodePlatformSchema = type({
  'tools?': type.Record('string', 'boolean'),
  'permissions?': type.Record('string', 'boolean'),
})

/** Map of known platform names to their ArkType validators */
const KNOWN_PLATFORMS: Record<string, (data: unknown) => unknown> = {
  opencode: (data) => OpenCodePlatformSchema(data),
  'claude-code': (data) => ClaudeCodePlatformSchema(data),
}

export interface PlatformValidationResult {
  errors: ValidationError[]
  warnings: string[]
}

/**
 * Validates platform configuration for all assets that declare `platforms`.
 * Known platforms are validated against their schema — invalid config is an error.
 * Unknown platforms produce a warning but do not cause failure.
 */
export function validatePlatformConfigs(manifest: FacetManifest): PlatformValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  // Check skills
  if (manifest.skills) {
    for (const [name, skill] of Object.entries(manifest.skills)) {
      if (skill.platforms) {
        validateAssetPlatforms(`skills.${name}`, skill.platforms, errors, warnings)
      }
    }
  }

  // Check agents
  if (manifest.agents) {
    for (const [name, agent] of Object.entries(manifest.agents)) {
      if (agent.platforms) {
        validateAssetPlatforms(`agents.${name}`, agent.platforms, errors, warnings)
      }
    }
  }

  // Commands don't have platforms in the current schema, but if they ever do,
  // they'd be validated here uniformly.

  return { errors, warnings }
}

function validateAssetPlatforms(
  assetPath: string,
  platforms: Record<string, unknown>,
  errors: ValidationError[],
  warnings: string[],
): void {
  for (const [platformName, config] of Object.entries(platforms)) {
    const validator = KNOWN_PLATFORMS[platformName]

    if (!validator) {
      warnings.push(`${assetPath}: unknown platform "${platformName}" — config will not be validated`)
      continue
    }

    const result = validator(config)
    if (result instanceof type.errors) {
      for (const err of result) {
        errors.push({
          path: `${assetPath}.platforms.${platformName}.${err.path.join('.')}`,
          message: `Invalid platform config for "${platformName}" on ${assetPath}: ${err.message}`,
          expected: err.expected,
          actual: String(err.actual),
        })
      }
    }
  }
}
