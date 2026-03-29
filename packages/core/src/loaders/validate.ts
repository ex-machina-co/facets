import type { type } from 'arktype'
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
 * Parses a JSON string. Returns the parsed data or a ValidationError array.
 */
export function parseJson(jsonContent: string): { ok: true; data: unknown } | { ok: false; errors: ValidationError[] } {
  try {
    const parsed = JSON.parse(jsonContent)
    return { ok: true, data: parsed }
  } catch (err) {
    const message = err instanceof SyntaxError ? err.message : 'Unknown JSON parse error'
    return {
      ok: false,
      errors: [
        {
          path: '',
          message: `JSON syntax error: ${message}`,
          expected: 'valid JSON',
          actual: 'malformed JSON',
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
