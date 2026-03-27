## Context

The `@ex-machina/facets` package has a `bin` entry pointing to `src/cli.ts`, but the file does not exist. The core library (schemas, loaders, prompt resolution) is implemented and tested. The CLI is the user-facing entry point that all subsequent phases (authoring, installation, publishing) will wire into. This phase builds only the skeleton — no real command behavior.

The runtime is Bun. There are no existing CLI dependencies. The project uses ArkType for validation, `bun:test` for testing, and Biome for linting.

## Goals / Non-Goals

**Goals:**

- Establish a command routing architecture that subsequent phases extend with zero changes to the router itself
- Adopt a CLI stack that scales from stubs to full commands without refactoring
- Provide useful help, version, and error output from day one

**Non-Goals:**

- Real command implementations (stubs only)
- Argument/flag parsing beyond `--help` and `--version` — command-specific flags come with their implementations
- Interactive prompts, spinners, or progress bars (these come in later phases when `@clack/prompts` is wired in)
- Shell completions (add `@bomb.sh/tab` when there are real commands to complete)

## Decisions

### Decision 1: Bombshell (bomb.sh) ecosystem for CLI primitives

Adopt the Bombshell ecosystem as the CLI foundation. This is a set of small, composable packages from the team behind Astro's CLI tooling:

| Package            | Role                          | Phase    |
|--------------------|-------------------------------|----------|
| `@bomb.sh/args`   | Type-safe arg parsing (<1kB)  | Phase 1  |
| `@clack/prompts`  | Prompts, spinners, progress   | Phase 2+ |
| `@bomb.sh/tab`    | Shell completions             | Future   |

**Why Bombshell over Commander?** Commander is a monolithic CLI framework that owns routing, help, and parsing in a single opinionated package. Bombshell is the opposite — scoped packages that each do one thing. This matters because:

- `@bomb.sh/args` is <1kB with zero dependencies and is faster than `node:util parseArgs`. It handles typed flag parsing and nothing else.
- `@clack/prompts` (7M weekly downloads, used by OpenCode, Vercel, n8n) provides beautiful interactive prompts, spinners, and progress bars — but only when we need them in later phases.
- `@bomb.sh/tab` adds shell completions for zsh/bash/fish/powershell — again, only when we have real commands to complete.
- Command routing stays ours. Bombshell intentionally doesn't include a router, which means our `Command` interface and registry pattern plugs in cleanly as the dispatch layer.

**Why not Commander?** Commander auto-generates help, manages routing, and handles parsing all in one. That's convenient but rigid — it assumes a specific command structure and help format. We want control over the help output and routing behavior, and we don't want a 50kB dependency when `@bomb.sh/args` is <1kB. Commander is also 12 years old with retrofitted TypeScript; Bombshell is TypeScript-first.

**Why not fully hand-rolled?** Phase 1 alone could be hand-rolled trivially, but later phases need spinners (`build`), interactive prompts (`init`), and progress bars (`install`). Adopting `@bomb.sh/args` now means the flag parsing interface is consistent from day one through all future phases, and `@clack/prompts` slots in later without any routing refactor.

For Phase 1, only `@bomb.sh/args` is installed. `@clack/prompts` is added when Phase 2 needs interactive prompts.

### Decision 2: Static command registry with a `Command` interface

Define a `Command` type:

```
type Command = {
  name: string
  description: string
  run: (args: string[]) => Promise<number>  // returns exit code
}
```

All commands are registered in a single `commands` object keyed by name. The router uses `@bomb.sh/args` to parse `process.argv`, extracts the positional command name from `args._[0]`, and looks it up in the registry. Adding a new command means adding one entry — no changes to router logic.

Stub commands return a "not yet implemented" message and exit code 0 (they are not errors, just placeholders).

### Decision 3: Package structure and build pipeline

The monorepo is split into two packages:

```
packages/
  core/             # @ex-machina/facet-core — schemas, loaders, types (raw TS)
    src/
      schemas/
      loaders/
      types.ts
      index.ts
  cli/              # @ex-machina/facet — CLI binary (compiled)
    src/
      cli.ts        # Entry point — parses argv, dispatches to router
      cli/
        commands.ts # Command registry and Command type
        help.ts     # Help formatting (global + per-command)
        version.ts  # Version reading from package.json
        run.ts      # Router: dispatch argv to command, handle errors
        suggest.ts  # Levenshtein distance for "did you mean?" suggestions
    dist/
      facet         # Compiled standalone binary (bun build --compile)
```

The CLI is compiled to a standalone binary via `bun build --compile`. This embeds the Bun runtime (~58MB) so users don't need Bun installed. Tests run against the compiled binary ("train like you fight") — turbo ensures `build` runs before `test`.

`cli.ts` is the thin entry point. It calls `run()` from `cli/run.ts` and calls `process.exit()` with the returned code.

### Decision 4: Version reading via `Bun.file` and `import`

Read the version from `package.json` using a static import (`import pkg from '../package.json'`). Bun supports JSON imports natively. This is resolved at bundle/load time — no filesystem reads at runtime, no async, no error handling needed.

### Decision 5: Exit code convention

| Code | Meaning |
|------|---------|
| 0    | Success (including stubs — they succeed at doing nothing) |
| 1    | User error (unknown command, invalid arguments, validation failure) |
| 2    | Unexpected error (unhandled exception, bug) |

The `run()` function returns the exit code as a number. `cli.ts` calls `process.exit(code)`. This keeps exit code policy in one place.

### Decision 6: Error output to stderr, normal output to stdout

All error messages (unknown command, unexpected errors) go to `stderr` via `console.error()`. Help text, version output, and command output go to `stdout` via `console.log()`. This follows Unix convention and enables piping (`facet list | grep ...`).

### Decision 7: Unknown command suggestions via Levenshtein distance

When a user types an unknown command, suggest the closest match from the registry. Use a simple Levenshtein distance function (< 20 lines, no dependency). Only suggest if the distance is ≤ 3 to avoid absurd suggestions. Format: `Unknown command "bild". Did you mean "build"?`

### Decision 8: Testing via subprocess spawning

Test the CLI by spawning `bun src/cli.ts` as a subprocess using `Bun.spawn()` and asserting on stdout, stderr, and exit code. This tests the actual user experience end-to-end rather than just internal function calls.

Unit tests for the router function (`run()`) MAY also be added for faster feedback, but the subprocess tests are the primary correctness gate — they verify what users actually see.

## Risks / Trade-offs

**[Bombshell ecosystem is young] → `@bomb.sh/args` has low adoption (2.3K weekly downloads).** The core parsing logic is small and well-tested, but it lacks the battle-hardening of `minimist` or `commander`. **Mitigation:** The package is <1kB with zero dependencies — if it breaks or is abandoned, replacing it with `node:util parseArgs` or `mri` is a single-file change. `@clack/prompts` has 7M weekly downloads and is mature.

**[No auto-generated help] → Help text is manually maintained.** Unlike Commander, which generates help from command definitions, our help formatting is hand-written. **Mitigation:** Help is generated from the command registry metadata (name, description). This is ~30 lines of code and gives us full control over formatting. If help generation becomes complex, we can add a helper that reads the registry and formats output.

**[Static import for version] → Couples bin entry to package.json location.** If the package structure changes (e.g., compiled output), the import path breaks. **Mitigation:** This is a single line to update, and Bun's JSON import support makes it reliable for the current source-execution model.

**[Subprocess tests] → Slower than unit tests.** Each test spawns a process. **Mitigation:** The test suite for this phase is small (< 15 tests). Subprocess overhead is negligible with Bun's fast startup. If it becomes a problem, add unit tests for the router alongside.
