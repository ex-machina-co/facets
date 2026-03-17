/**
 * A structured validation error decoupled from ArkType internals.
 * Used by all loaders to report schema and YAML parsing failures.
 */
export interface ValidationError {
  /** Dot-separated path to the invalid field (e.g., "agents.reviewer.prompt") */
  path: string
  /** Human-readable error message */
  message: string
  /** What was expected at this location */
  expected: string
  /** What was actually found */
  actual: string
}

/**
 * Discriminated result type returned by all loaders.
 * Callers check `ok` to determine success or failure.
 */
export type Result<T> = { ok: true; data: T } | { ok: false; errors: ValidationError[] }
