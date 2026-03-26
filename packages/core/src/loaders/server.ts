import { join } from 'node:path'
import { type } from 'arktype'
import { type ServerManifest, ServerManifestSchema } from '../schemas/server-manifest.ts'
import type { Result } from '../types.ts'
import { mapArkErrors, parseYaml, readFile } from './validate.ts'

const SERVER_MANIFEST_FILE = 'server.yaml'

/**
 * Loads and validates a server manifest from the specified directory.
 *
 * Reads `server.yaml`, parses YAML, validates against the schema, and returns
 * a discriminated result — either the validated manifest or structured errors.
 */
export async function loadServerManifest(dir: string): Promise<Result<ServerManifest>> {
  const filePath = join(dir, SERVER_MANIFEST_FILE)

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
  const validated = ServerManifestSchema(yamlResult.data)
  if (validated instanceof type.errors) {
    return { ok: false, errors: mapArkErrors(validated) }
  }

  return { ok: true, data: validated }
}
