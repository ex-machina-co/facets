## Step Types

- **Verify** → CHECK. Run automated checks (tests, lint, type checks).
  If all checks pass, proceed. If anything fails, STOP and notify the user.
- **Implement** → WRITE. Make code changes — create, edit, or delete files.
- **Propose** → READ-ONLY + USER GATE. Show the user intended changes and ask for approval
  using the `question` tool. Do not write anything. Do not proceed until the user approves.
- **Explore** → READ-ONLY. Read files, search the codebase, investigate broadly.
  No writes allowed. Use this to understand the problem space before acting.
- **Review** → READ-ONLY + USER GATE. Analyze what was done or found, present findings
  to the user, and wait for feedback before proceeding.

## 1. Setup

- [x] 1.1 Implement: Install `@bomb.sh/args` as a dependency in `packages/facets`
- [x] 1.2 Implement: Create the `src/cli/` directory structure (`commands.ts`, `help.ts`, `version.ts`, `run.ts`)

## 2. Core Implementation

- [x] 2.1 Implement: Define the `Command` type (`name`, `description`, `run`) and create the command registry in `src/cli/commands.ts`
- [x] 2.2 Implement: Register stub commands for `init`, `build`, `install`, `upgrade`, `list`, `publish` — each prints "not yet implemented" with the command name and returns exit code 0
- [x] 2.3 Implement: Implement version reading in `src/cli/version.ts` via static JSON import from `package.json`
- [x] 2.4 Implement: Implement global help output in `src/cli/help.ts` — iterate command registry, format name + description for each, print usage summary to stdout
- [x] 2.5 Implement: Implement per-command help output — print command name, description, and usage to stdout
- [x] 2.6 Implement: Implement Levenshtein distance function for "did you mean?" suggestions — suggest closest match when distance ≤ 3

## 3. Routing and Entry Point

- [x] 3.1 Implement: Implement the router in `src/cli/run.ts` — parse `process.argv` with `@bomb.sh/args`, extract the command name from positionals, look up in registry, and dispatch
- [x] 3.2 Implement: Handle `--help` flag and `help` command — both print global help and exit 0
- [x] 3.3 Implement: Handle `--version` flag — print version from `package.json` and exit 0
- [x] 3.4 Implement: Handle bare invocation (no arguments, no flags) — print help and exit 0
- [x] 3.5 Implement: Handle per-command `--help` (`<command> --help`) — print command-specific help and exit 0
- [x] 3.6 Implement: Handle unknown commands — print error to stderr with exit code 1, include suggestion if close match exists
- [x] 3.7 Implement: Implement top-level error boundary — catch unexpected errors, print to stderr, exit code 2
- [x] 3.8 Implement: Create `src/cli.ts` entry point — call `run()`, pass result to `process.exit()`

## 4. Tests

- [x] 4.1 Implement: Test `--help` prints command list to stdout and exits 0
- [x] 4.2 Implement: Test `help` command produces same output as `--help`
- [x] 4.3 Implement: Test `--version` prints version matching `package.json` and exits 0
- [x] 4.4 Implement: Test bare invocation (no args) prints help and exits 0
- [x] 4.5 Implement: Test stubbed commands print "not yet implemented" with command name and exit 0
- [x] 4.6 Implement: Test unknown command prints error to stderr and exits 1
- [x] 4.7 Implement: Test unknown command with close match includes "did you mean?" suggestion
- [x] 4.8 Implement: Test unknown command with no close match does not include suggestion
- [x] 4.9 Implement: Test per-command `--help` prints command-specific help and exits 0
- [x] 4.10 Implement: Test unexpected error exits with code 2

## 5. Verification

- [x] 5.1 Verify: Run `bun check` — all tests, linting, and type checking pass

## 6. Post-Implementation Corrections (ADR alignment)

- [x] 6.1 Implement: Fix binary name `facets` → `facet` in `package.json` bin entry
- [x] 6.2 Implement: Add missing command stubs (`add`, `remove`, `info`) from ADRs/docs
- [x] 6.3 Implement: Update help text to use `facet` not `facets`
- [x] 6.4 Implement: Update tests for corrected binary name and expanded command set
- [x] 6.5 Verify: Run `bun check` — 57 tests pass, lint clean, types clean
- [x] 6.6 Implement: Rename `docs/cli/update.md` → `docs/cli/upgrade.md` and update all docs references
- [x] 6.7 Implement: Add Article III (ADR Authority) to OpenSpec constitution and ADR-checking proposal rule
- [x] 6.8 Implement: Update proposal.md and design.md to reflect corrected command set and dependencies
- [x] 6.9 Verify: Final `bun check`

## 7. Package Split and Build Pipeline

- [x] 7.1 Implement: Create `packages/core/` with `@ex-machina/facet-core` — move schemas, loaders, types, and their tests
- [x] 7.2 Implement: Create `packages/cli/` with `@ex-machina/facet` — move CLI code, add `bun build --compile` build step
- [x] 7.3 Implement: Update CLI tests to run against compiled binary (`dist/facet`) instead of source
- [x] 7.4 Implement: Remove old `packages/facets/` directory
- [x] 7.5 Implement: Update turbo.json — add `build` task, make `test` depend on `build`
- [x] 7.6 Implement: Update root `package.json` (link/unlink scripts) and `README.md` (package table)
- [x] 7.7 Verify: Run `bun check` — 57 tests pass across 2 packages, CLI tests run against compiled binary
