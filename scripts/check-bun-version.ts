/**
 * Ensures the running Bun version matches what mise.toml expects.
 * Used by lefthook pre-commit hook.
 */
const miseToml = await Bun.file('mise.toml').text()
const match = miseToml.match(/bun\s*=\s*"([^"]+)"/)

if (!match) {
  console.error('Could not parse Bun version from mise.toml')
  process.exit(1)
}

const expected = match[1]
const actual = Bun.version

if (actual !== expected) {
  console.error(
    [
      '',
      `Bun version mismatch: running ${actual}, expected ${expected} (from mise.toml)`,
      '',
      'Fix: ensure mise is activated, then run:',
      '',
      '  mise install',
      '',
    ].join('\n'),
  )
  process.exit(1)
}
