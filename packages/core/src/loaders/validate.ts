import type { type } from 'arktype'
import { parse, YAMLParseError } from 'yaml'
import type { ValidationError } from '../types.ts'

/**
 * Maps ArkType errors to our public ValidationError type.
 * Decouples the public API from ArkType internals.
 */
export function mapArkErrors(errors: InstanceType<typeof type.errors>): ValidationError[] {
  return errors.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
    expected: err.expected ?? 'unknown',
    actual: err.actual ?? 'unknown',
  }))
}

/**
 * Parses a YAML string. Returns the parsed data or a ValidationError array.
 */
export function parseYaml(yamlContent: string): { ok: true; data: unknown } | { ok: false; errors: ValidationError[] } {
  try {
    const parsed = parse(yamlContent)
    return { ok: true, data: parsed }
  } catch (err) {
    if (err instanceof YAMLParseError) {
      const pos = err.linePos?.[0]
      const location = pos ? ` at line ${pos.line}, column ${pos.col}` : ''
      return {
        ok: false,
        errors: [
          {
            path: '',
            message: `YAML syntax error${location}: ${err.message}`,
            expected: 'valid YAML',
            actual: 'malformed YAML',
          },
        ],
      }
    }
    const message = err instanceof Error ? err.message : 'Unknown YAML parse error'
    return {
      ok: false,
      errors: [
        {
          path: '',
          message: `YAML syntax error: ${message}`,
          expected: 'valid YAML',
          actual: 'malformed YAML',
        },
      ],
    }
  }
}

/**
 * Reads a file from disk. Returns the text content or a ValidationError array.
 */
export async function readFile(
  filePath: string,
): Promise<{ ok: true; content: string } | { ok: false; errors: ValidationError[] }> {
  const file = Bun.file(filePath)
  const exists = await file.exists()
  if (!exists) {
    return {
      ok: false,
      errors: [
        {
          path: '',
          message: `File not found: ${filePath}`,
          expected: 'file to exist',
          actual: 'file not found',
        },
      ],
    }
  }

  const content = await file.text()
  return { ok: true, content }
}
