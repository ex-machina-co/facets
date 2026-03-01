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

## 0. Monorepo Setup (DONE)

- [x] 0.1 Implement: Convert root `package.json` to private monorepo root with Bun workspaces and Turborepo
- [x] 0.2 Implement: Create `packages/facets/` — move existing `src/`, `index.test.ts`, `tsconfig.json`; strip `@opencode-ai/plugin` from deps
- [x] 0.3 Implement: Create `packages/opencode-facets/` — new package with `@ex-machina/facets` workspace dep, `@opencode-ai/plugin`, stub plugin export
- [x] 0.4 Implement: Create `turbo.json` with `typecheck`, `test`, `build` tasks
- [x] 0.5 Verify: `bun install` resolves workspaces; `bun turbo typecheck` and `bun turbo test` pass

## 1. Package Foundation

- [ ] 1.1 Explore: Audit `.opencode/orig/` bundle engine — understand reusable logic and what needs porting
- [ ] 1.2 Propose: Present planned `packages/facets/src/` module structure, CLI entry point, and runtime dependencies for approval
- [ ] 1.3 Implement: Configure `packages/facets/package.json` with CLI entry point and runtime deps (`js-yaml`, `zod`, `comment-json`)
- [ ] 1.4 Implement: Scaffold `packages/facets/src/` directory structure
- [ ] 1.5 Verify: `bun install` completes without errors and binary entry point resolves

## 2. Registry: Manifest & Dependency Format

- [ ] 2.1 Explore: Survey the design doc's manifest examples — map out all field types, unions (prompt as string vs object, requires as string vs array), and platform section structure; identify any ambiguities before writing schemas
- [ ] 2.2 Propose: Present the final Zod schema shapes for `FacetManifest`, `FacetsYaml`, and `FacetsLock` for approval before writing code
- [ ] 2.3 Implement: Define and export `FacetManifest` Zod schema in `packages/facets/src/` (`facet.yaml` shape — name, version, description, author, requires, skills, agents, commands, platforms)
- [ ] 2.4 Implement: Implement `loadManifest(path)` — reads, parses, and validates `facet.yaml`, returning typed manifest or structured error
- [ ] 2.5 Implement: Define and export `FacetsYaml` Zod schema (project dependency file — local list + remote map with url/version)
- [ ] 2.6 Implement: Define and export `FacetsLock` Zod schema (lockfile — remote entries with resolved version and integrity hash)
- [ ] 2.7 Implement: Implement read/write helpers for `facets.yaml` and `facets.lock`, preserving comments in user-authored file
- [ ] 2.8 Verify: Unit tests — valid manifests accepted, missing required fields rejected, unrecognized fields tolerated

## 3. Discovery: Facet Scanning

- [ ] 3.1 Explore: Determine how install status is detected — what on-disk signal indicates a facet's resources are currently installed (file presence, a manifest record, or both); check `orig/` for prior art
- [ ] 3.2 Propose: Present the install-status detection strategy and the cache directory layout for approval
- [ ] 3.3 Implement: Implement `listFacets(projectRoot)` in `packages/facets/src/` — scans local facets from `.opencode/facets/<name>/` and reads remote entries from `facets.yaml`; returns name, version, description, and installed status; no network or shell execution
- [ ] 3.4 Implement: Implement `cacheFacet(url, projectRoot)` — fetches remote `facet.yaml` and referenced resources, resolves relative paths against source URL, records entry in `facets.yaml` and `facets.lock`
- [ ] 3.5 Implement: Implement `clearCache()` — removes `~/.cache/facets/` without affecting local facets or installed resources
- [ ] 3.6 Verify: Unit tests — list includes all local and remote declared facets, empty list on no declarations, relative resource paths resolved correctly on cache

## 4. Installation: Resource Installer

- [ ] 4.1 Explore: Audit existing `orig/` install logic — understand current copy-and-assemble pattern for skills, agents, commands, and tools
- [ ] 4.2 Propose: Present resource type → destination path mapping and frontmatter-assembly approach for agent/command resources
- [ ] 4.3 Implement: Implement `installFacet(name, projectRoot)` in `packages/facets/src/` — resolves local or cached facet, copies resources to type-specific destinations (skills, agents with assembled frontmatter, commands with assembled frontmatter, tools)
- [ ] 4.4 Implement: Implement prerequisite check flow — display all `requires` commands to user, gate on explicit approval, run checks, abort with clear error on failure; skip if machine-level confirmation already exists
- [ ] 4.5 Implement: Return structured error when install is attempted for a facet that is neither local nor cached
- [ ] 4.6 Implement: Implement `uninstallFacet(name, projectRoot)` — removes installed resource files and removes entry from `facets.yaml`
- [ ] 4.7 Verify: Integration tests — local install, cached install, unapproved prereqs cancels, failed prereq aborts, not-found returns error, repeat install skips prereq re-check

## 5. Plugin: OpenCode Tool Surface (`packages/opencode-facets/`)

- [ ] 5.1 Explore: Read `@opencode-ai/plugin` API — understand how tools are defined, what schema format it expects, and how the plugin entry point is structured
- [ ] 5.2 Propose: Present tool definitions (name, description, input schema) for all five tools for approval before writing
- [ ] 5.3 Implement: Implement `facet-list` tool in `packages/opencode-facets/src/` — calls `listFacets` from `@ex-machina/facets`, returns structured facet list (name, version, description, installed status)
- [ ] 5.4 Implement: Implement `facet-install` tool in `packages/opencode-facets/src/` — calls `installFacet`, returns success confirmation or failure reason
- [ ] 5.5 Implement: Implement `facet-add` tool in `packages/opencode-facets/src/` — calls `cacheFacet` with agent-provided URL, returns resolved name and version
- [ ] 5.6 Implement: Implement `facet-update` tool in `packages/opencode-facets/src/` — re-fetches cached remote facet, reports new version or "already current"
- [ ] 5.7 Implement: Implement `facet-remove` tool in `packages/opencode-facets/src/` — calls `uninstallFacet`, returns confirmation
- [ ] 5.8 Implement: Register all five tools with the OpenCode plugin entry point in `packages/opencode-facets/src/index.ts`
- [ ] 5.9 Verify: Plugin entry point loads without errors; tool schemas are valid and exported

## 6. CLI: Terminal Commands (`packages/facets/`)

- [ ] 6.1 Explore: Evaluate CLI framework options available in the project (built-in `util.parseArgs`, `citty`, `commander`, etc.) — assess fit for subcommands, help generation, and Bun compatibility
- [ ] 6.2 Propose: Present chosen CLI framework and command structure (including `cache` as a nested subcommand) for approval
- [ ] 6.3 Implement: Implement `init` command in `packages/facets/src/` — registers facets plugin in `.opencode/opencode.jsonc`, creates `facets.yaml` if absent; idempotent with confirmation on re-run
- [ ] 6.4 Implement: Implement `list` command — calls `listFacets` and prints name, version, installed status, prerequisites as metadata
- [ ] 6.5 Implement: Implement `add <url>` command — calls `cacheFacet`, confirms resolved name and version
- [ ] 6.6 Implement: Implement `install [name]` command — calls `installFacet`, showing prereq commands for explicit approval before running
- [ ] 6.7 Implement: Implement `remove <name>` command — calls `uninstallFacet`, confirms removal
- [ ] 6.8 Implement: Implement `update [name]` command — re-fetches cached remote facets, reports version changes
- [ ] 6.9 Implement: Implement `cache clear` subcommand — calls `clearCache`, confirms
- [ ] 6.10 Verify: `bunx @ex-machina/facets --help` lists all commands; each command runs without crashing against a fixture project

## 7. End-to-End

- [ ] 7.1 Verify: Full round-trip — `init` → `add <url>` → `install` → assert resource files present in `.opencode/` directories
- [ ] 7.2 Verify: Type check passes (`bun turbo typecheck`)
- [ ] 7.3 Verify: All tests pass (`bun turbo test`)
