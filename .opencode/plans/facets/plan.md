# Plan: @ex-machina/facets

A facet engine and OpenCode plugin for managing, distributing, and installing collections of AI agent configurations (skills, agents, commands, tools).

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

---

## Context

### What is a facet?

A **facet** is a named, versioned collection of OpenCode resources (agents, skills, commands, tools) described by a `facet.yaml` manifest. Facets can be:

- **Local** — defined in the project's `.opencode/facets/` directory, git-tracked
- **Remote** — fetched from any URL hosting a `facet.yaml` manifest, cached locally in `.opencode/facets/.cache/`

### What is the engine?

The engine is an npm package (`@ex-machina/facets`) that provides:

1. **An OpenCode plugin** — registers tools (`facet-list`, `facet-install`, `facet-add`, `facet-update`, `facet-remove`) so AI agents can manage facets
2. **A CLI** — `bunx @ex-machina/facets install` to add the plugin to a project, plus commands for managing facets from the terminal
3. **A manifest spec** — `facet.yaml` format for declaring facet contents
4. **A dependency model** — `facets.yaml` (user-authored, like package.json) + `facets.lock` (auto-generated, like lockfile) for reproducible facet installations

### Key design decisions

- OpenCode-specific for v1, but engine layer is naturally decoupled for future platform adapters
- Manifest-based (standalone `facet.yaml`) rather than frontmatter-based discovery
- Remote facets fetched via URL, cached locally, pinned via lockfile
- Follows Orca plugin patterns for packaging (tsup, ESM, single default export, CLI via bin field)

### Reference material

- **Existing bundle system**: `.opencode/orig/` — engine files (`list.ts`, `install.ts`, `verify.ts`, `bun.ts`) to be ported and adapted
- **Orca plugin**: `@ex-machina/opencode-orca` on GitHub — packaging patterns, CLI structure, plugin export conventions
- **OpenCode plugin docs**: https://opencode.ai/docs/plugins/ — plugin API, tool registration, config hooks

---

### Step 1 - Explore: Audit existing bundle engine for extraction

Catalog every file in `.opencode/orig/` that contains engine logic (as opposed to facet content). Map the dependency graph between engine modules (`list.ts`, `install.ts`, `verify.ts`, `bun.ts`), tool wrappers, and tests. Identify what ports directly, what needs adaptation for the manifest-based model, and what gets dropped.

Key files to examine:
- `.opencode/orig/list.ts` — scanner logic, frontmatter parsing, install status checking
- `.opencode/orig/install.ts` — resource collection, verify-before-copy, file copying
- `.opencode/orig/verify.ts` — prerequisite command execution
- `.opencode/orig/bun.ts` — Bun filesystem/shell abstraction layer
- `.opencode/orig/tests/*.test.ts` — all test files
- `.opencode/orig/tools/core/hb-list-bundles.ts` — tool wrapper pattern
- `.opencode/orig/tools/core/hb-install-bundle.ts` — tool wrapper pattern

---

### Step 2 - Explore: Study Orca plugin for packaging patterns

Read the Orca plugin's structure to establish proven patterns for:
- `tsup.config.ts` build configuration (ESM, Bun target, dual entry points for plugin + CLI)
- CLI scaffolding (`install`, `init`, `uninstall` commands)
- Plugin export rules (single default export, OpenCode's loader calls ALL exports)
- How Orca uses the `config` hook to inject agent configurations
- `bin` field in package.json for CLI registration
- `templates/` directory for scaffolding files
- `files` field in package.json for npm publish

Key files:
- `opencode-orca/package.json`
- `opencode-orca/tsup.config.ts`
- `opencode-orca/src/index.ts` — export rules warning comment
- `opencode-orca/src/plugin/index.ts` — createOrcaPlugin() factory pattern
- `opencode-orca/src/cli/index.ts` — CLI entry point
- `opencode-orca/src/cli/commands/install.ts` — config file manipulation

---

### Step 3 - Propose: Package architecture, manifest spec, and dependency model

Present the complete design for user approval. Do not write any files.

**Package:** `@ex-machina/facets`

**Directory structure:**
```
facets/
  src/
    index.ts                    # Default plugin export
    plugin/
      index.ts                  # createFacetsPlugin() factory
      tools.ts                  # facet-list, facet-install, facet-add, facet-update, facet-remove
    engine/
      scanner.ts                # Scan local + cached facets, parse manifests, check install status
      installer.ts              # Copy resources to active OpenCode directories
      fetcher.ts                # Fetch remote facet manifests + resource files
      verify.ts                 # Run prerequisite shell commands
      manifest.ts               # Parse/validate facet.yaml
      lockfile.ts               # Read/write facets.lock
      config.ts                 # Read/write facets.yaml dependency file
      types.ts                  # Facet, Resource, Manifest, FacetConfig, LockEntry, result types
    cli/
      index.ts                  # CLI entry point
      commands/
        install.ts              # Add plugin to opencode.json
        init.ts                 # Create facets.yaml from template
        add.ts                  # Add remote facet source
        remove.ts               # Remove a facet
        update.ts               # Re-fetch remote facets
        list.ts                 # List facets
    bun.ts                      # Bun filesystem/shell abstraction
  templates/
    facets.yaml                 # Template for init command
  tests/
    engine/                     # Engine unit tests
    plugin/                     # Plugin integration tests
    cli/                        # CLI tests
  package.json
  tsconfig.json
  tsup.config.ts
  biome.json
  .gitignore
  LICENSE
  README.md
```

**Manifest spec (`facet.yaml`):**
```yaml
name: my-facet
version: 1.0.0
description: What this facet does
author: Name <email>

verify:
  - "some-cli --version"

resources:
  skills:
    skill-name:
      file: skills/skill-name.md
      description: Optional description
  agents:
    agent-name:
      file: agents/agent-name.md
  commands:
    command-name:
      file: commands/command-name.md
  tools:
    tool-name:
      file: tools/tool-name.ts
```

**Dependency file (`facets.yaml`):**
```yaml
remote:
  viper:
    source: https://github.com/ex-machina/facet-viper
    version: "1.2.0"
local:
  - my-project-facet
```

**Lockfile (`facets.lock`):** auto-generated, pins resolved versions + integrity hashes.

**Install conventions (resource type → active directory):**
- Skills: `facets/<name>/skills/foo.md` → `.opencode/skills/foo/SKILL.md`
- Agents: `facets/<name>/agents/foo.md` → `.opencode/agents/foo.md`
- Commands: `facets/<name>/commands/foo.md` → `.opencode/commands/foo.md`
- Tools: `facets/<name>/tools/foo.ts` → `.opencode/tools/foo.ts`

---

### Step 4 - Implement: Scaffold package

Ensure the `facets` repo has the following foundational files:

- **`package.json`**: name `@ex-machina/facets`, type `module`, main `dist/index.js`, bin `facets` → `dist/cli.js`, files `["dist", "templates"]`, dependencies (`@opencode-ai/plugin`, `js-yaml`, `zod`, `comment-json`), devDependencies (`tsup`, `typescript`, `@types/bun`, `@biomejs/biome`, `concurrently`), scripts (`dev`, `build`, `types`, `lint`, `format`, `test`, `validate`)
- **`tsconfig.json`**: ESM, strict, Bun types, path aliases
- **`tsup.config.ts`**: dual entry points — `src/index.ts` (plugin, ESM, dts) and `src/cli/index.ts` (CLI, ESM, banner with shebang)
- **`biome.json`**: linting and formatting config
- **`.gitignore`**: dist/, node_modules/, *.tsbuildinfo
- **`LICENSE`**: MIT
- **`README.md`**: placeholder with package name and one-line description

---

### Step 5 - Implement: Build the engine layer

Port and adapt from the original bundle system. All engine code lives in `src/engine/` and `src/bun.ts`.

- **`src/engine/types.ts`** — Type definitions: `ResourceType` (`'agents' | 'skills' | 'commands' | 'tools'`), `ResourceEntry`, `FacetManifest`, `FacetSource` (local vs remote), `ScannedFacet`, `FacetMap`, `ScanResult`, `InstallResult`, `FacetConfig`, `LockEntry`, `Lockfile`, `VerifyResult`, `VerifyFailure`
- **`src/bun.ts`** — Port from the original's `bundles/bun.ts`: `fileExists()`, `readText()`, `glob()`, `copyResource()`, `listDirs()`, `runCommand()`, `writeText()`
- **`src/engine/manifest.ts`** — Parse `facet.yaml` files using js-yaml, validate with Zod schema, return typed `FacetManifest`
- **`src/engine/verify.ts`** — Port from the original's `bundles/verify.ts`: run shell commands sequentially, return pass/fail with details
- **`src/engine/scanner.ts`** — Scan `.opencode/facets/` for local facets and `.opencode/facets/.cache/` for cached remote facets. For each directory containing a `facet.yaml`, parse the manifest, check install status of each resource by looking for the file in the active directory, run verify commands. Return a `FacetMap` with all facets and their status.
- **`src/engine/installer.ts`** — Given a facet name: find its manifest (local or cached), run verify commands, copy each resource to its active location following type-specific conventions (skills → `skills/<name>/SKILL.md`, others → `<type>/<name>.<ext>`)
- **`src/engine/config.ts`** — Read/write `.opencode/facets.yaml` using js-yaml. Parse into typed `FacetConfig` with `remote` and `local` sections.
- **`src/engine/lockfile.ts`** — Read/write `.opencode/facets.lock` with resolved versions, integrity hashes (SHA-256 of manifest content), and fetch timestamps.
- **`src/engine/fetcher.ts`** — Given a remote facet source URL: fetch the `facet.yaml` manifest, parse it, download each referenced resource file (resolving relative paths against the manifest URL base), write everything to `.opencode/facets/.cache/<name>/`, update the lockfile.

---

### Step 6 - Implement: Build the OpenCode plugin layer

- **`src/plugin/tools.ts`** — Define five OpenCode tools using `tool()` from `@opencode-ai/plugin`:
  - `facet-list`: scan all facets (local + cached remote), return JSON with name, version, description, install status, availability
  - `facet-install`: install a named facet — copy its resources to active directories
  - `facet-add`: add a remote facet URL to `facets.yaml`, fetch manifest + resources, cache locally
  - `facet-update`: re-fetch a remote facet if newer version available (compare lockfile vs remote)
  - `facet-remove`: remove a facet from `facets.yaml`, delete cache, remove installed resources
- **`src/plugin/index.ts`** — `createFacetsPlugin()` factory that returns `{ tool: { ... } }` with all five tools
- **`src/index.ts`** — `export { default } from './plugin'` following Orca's pattern (only export the plugin, nothing else)

---

### Step 7 - Implement: Build the CLI

- **`src/cli/commands/install.ts`** — Read `opencode.json` (or `opencode.jsonc`), add `@ex-machina/facets` to the `plugin` array if not present, write back
- **`src/cli/commands/init.ts`** — Copy `templates/facets.yaml` to `.opencode/facets.yaml` if it doesn't exist. Create `.opencode/facets/` directory.
- **`src/cli/commands/add.ts`** — Parse URL[@version] argument, add entry to `facets.yaml`, invoke fetcher to download and cache
- **`src/cli/commands/remove.ts`** — Remove entry from `facets.yaml`, delete cached files, remove installed resources
- **`src/cli/commands/update.ts`** — For each remote facet (or a named one), check for newer version and re-fetch if available
- **`src/cli/commands/list.ts`** — Invoke scanner, print formatted table of facets with status
- **`src/cli/index.ts`** — CLI entry point: parse args, dispatch to subcommands, handle `--help`/`--version`
- **`templates/facets.yaml`** — Template with commented examples

---

### Step 8 - Implement: Write tests

Port and adapt test patterns from the original's `orig/tests/`:

**Engine tests (`tests/engine/`):**
- `manifest.test.ts` — valid/invalid YAML parsing, Zod validation, missing fields, extra fields
- `scanner.test.ts` — scanning local facets, cached remote facets, install status detection, verify integration
- `installer.test.ts` — resource copying with type-specific conventions, verify-before-install, error handling
- `verify.test.ts` — command execution, pass/fail, exit codes, output capture
- `fetcher.test.ts` — manifest fetch, resource download, cache writing, relative URL resolution (mock HTTP)
- `lockfile.test.ts` — read/write roundtrip, integrity hash generation, version pinning
- `config.test.ts` — read/write `facets.yaml`, remote + local sections

**Plugin tests (`tests/plugin/`):**
- `tools.test.ts` — each tool's execute function with mocked engine calls

**CLI tests (`tests/cli/`):**
- `install.test.ts` — config file manipulation (add plugin entry, idempotent, --force)
- `init.test.ts` — template copying, directory creation, existing file handling

All tests mock used to mock the `bun.ts` abstraction layer, but we run on bun natively, so mocking is not necessary.

---

### Step 9 - Verify: Run full test suite, type checks, lint, and build

Run all validation checks:
```bash
bun test
bun run typecheck
bun run lint
bun run build
```

All must pass. If anything fails, fix and re-verify.

---

### Step 10 - Review: Final review of the package

Present to the user:
1. Summary of what was built
2. How to install and use the plugin in a project
3. How to create and publish a facet
4. How to share a facet with others (remote URL model)
5. What the end-to-end workflow looks like
6. Open questions and deferred decisions (cross-platform adapters, semver ranges, registry, etc.)

Get user approval before considering complete.
