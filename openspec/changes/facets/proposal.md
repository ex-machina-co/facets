## Why

OpenCode's official tooling has no distribution mechanism for agent resources (skills, agents, commands, tools) — these can only be shared as plain files, with no versioning, integrity verification, or install tooling. Community tools like OCX address this for some users, but there is no facet-native, manifest-driven solution that integrates cleanly with a project's own local resource collections alongside remote ones. `@ex-machina/facets` fills this gap by treating resource collections as first-class packages with a manifest format, lockfile, and platform plugin integration.

## What Changes

- **New package**: `@ex-machina/facets` — the core facet engine (registry, discovery, installation) and CLI, platform-agnostic
- **New package**: `@ex-machina/opencode-facets` — an OpenCode plugin that wraps the core engine, exposing five tools to AI agents; published separately and depends on `@ex-machina/facets` via workspace link. Eventually this will itself become a facet once plugin support lands in facets.
- **New manifest format**: `facet.yaml` — declares a named, versioned collection of agent resources (skills, agents, commands, tools) with optional prerequisite verification
- **New dependency model**: `facets.yaml` (user-authored) + `facets.lock` (auto-generated) for declaring and pinning facet dependencies, local and remote
- **New OpenCode plugin** (in `@ex-machina/opencode-facets`): registers five tools (`facet-list`, `facet-install`, `facet-add`, `facet-update`, `facet-remove`) so AI agents can manage facets in-session
- **New CLI** (in `@ex-machina/facets`): `bunx @ex-machina/facets <command>` for terminal-driven facet management (`install`, `init`, `add`, `remove`, `update`, `list`)
- Ports and adapts the existing bundle engine in `.opencode/orig/` to the manifest-based model

## Capabilities

### New Capabilities

- `registry`: The facet manifest format (`facet.yaml`), dependency declaration (`facets.yaml`), and lockfile (`facets.lock`) — the contract for what a facet is and how dependencies are declared and pinned
- `installation`: Installing facet resources into active OpenCode directories, including prerequisite verification and type-specific path conventions
- `discovery`: Scanning local and cached remote facets, reporting manifest metadata and per-resource install status
- `plugin`: The OpenCode plugin surface (in `@ex-machina/opencode-facets`) — five tools exposed to AI agents for managing facets in-session
- `cli`: The terminal CLI for bootstrapping and managing facets outside of an AI session

### Modified Capabilities

## Impact

- Monorepo with two packages under `packages/`: `facets` (core) and `opencode-facets` (OpenCode plugin)
- Ports logic from `.opencode/orig/` (existing bundle system)
- Core runtime dependencies: `js-yaml`, `zod`, `comment-json`
- Plugin runtime dependencies: `@opencode-ai/plugin`, `@ex-machina/facets`
- No breaking changes to existing projects — purely additive
