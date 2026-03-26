## Why

Users have no way to interact with Facets. The core schemas and loaders exist as a library, but there is no command-line interface — the `bin` entry in `package.json` points to a file that does not exist. Every subsequent phase (authoring, installation, publishing) needs a CLI surface to wire into. Building the CLI skeleton now unblocks all downstream work.

## What Changes

- Add a CLI binary entry point (`src/cli.ts`) that Bun executes directly
- Implement a command router that dispatches to subcommands: `add`, `build`, `info`, `init`, `install`, `list`, `publish`, `remove`, `upgrade`
- Each subcommand MUST print a "not yet implemented" message until wired in by later phases
- Implement `--help` (global and per-command) showing available commands, descriptions, and usage
- Implement `--version` printing the package version from `package.json`
- Unknown commands MUST print an error with the closest matching suggestion
- All commands MUST exit with consistent exit codes (0 for success, 1 for user error, 2 for unexpected error)
- Error output MUST be user-facing: structured, concise, and written to stderr

## Non-goals

- Implementing any real command behavior — this phase is stubs only
- Adding flags or options beyond `--help` and `--version` — command-specific flags come with their implementations
- Interactive prompts or TUI elements
- Shell completions
- Configuration file loading

## Capabilities

### New Capabilities

- `cli`: The user-facing command surface for Facets — command routing, help system, version display, error handling, and exit codes. This capability covers the CLI shell that all other capabilities plug into.

### Modified Capabilities

_(none)_

## Impact

- **Code**: New `src/cli.ts` entry point and supporting command routing module(s) in `packages/cli/`. Core schemas and loaders split into `packages/core/` (`@ex-machina/facet-core`)
- **Dependencies**: `@bomb.sh/args` added for type-safe argument parsing (< 1kB, zero dependencies)
- **APIs**: No library API changes — the CLI is a consumer of the existing public API, not an extension of it
- **Testing**: New test suite for command routing, help output, version output, unknown command handling, and exit codes
