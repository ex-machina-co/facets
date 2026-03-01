## Why

OpenCode's official tooling has no distribution mechanism for agent resources (skills, agents, commands, tools) — these can only be shared as plain files, with no versioning, integrity verification, or install tooling. Community tools like OCX address this for some users, but there is no facet-native, manifest-driven solution that integrates cleanly with a project's own local resource collections alongside remote ones. `@ex-machina/opencode-facets` fills this gap by treating resource collections as first-class packages with a manifest format, lockfile, and OpenCode plugin integration.

## What Changes

- **New package**: `@ex-machina/opencode-facets` — an npm package providing a facet engine, OpenCode plugin, and CLI
- **New manifest format**: `facet.yaml` — declares a named, versioned collection of OpenCode resources (skills, agents, commands, tools) with optional prerequisite verification
- **New dependency model**: `facets.yaml` (user-authored) + `facets.lock` (auto-generated) for declaring and pinning facet dependencies, local and remote
- **New OpenCode plugin**: registers five tools (`facet-list`, `facet-install`, `facet-add`, `facet-update`, `facet-remove`) so AI agents can manage facets in-session
- **New CLI**: `bunx @ex-machina/opencode-facets <command>` for terminal-driven facet management (`install`, `init`, `add`, `remove`, `update`, `list`)
- Ports and adapts the existing bundle engine in `.opencode/orig/` to the manifest-based model

## Capabilities

### New Capabilities

- `registry`: The facet manifest format (`facet.yaml`), dependency declaration (`facets.yaml`), and lockfile (`facets.lock`) — the contract for what a facet is and how dependencies are declared and pinned
- `installation`: Installing facet resources into active OpenCode directories, including prerequisite verification and type-specific path conventions
- `discovery`: Scanning local and cached remote facets, reporting manifest metadata and per-resource install status
- `plugin`: The OpenCode plugin surface — five tools exposed to AI agents for managing facets in-session
- `cli`: The terminal CLI for bootstrapping and managing facets outside of an AI session

### Modified Capabilities

## Impact

- New top-level package at `opencode-facets/` (this repo)
- Ports logic from `.opencode/orig/` (existing bundle system)
- Runtime dependencies: `@opencode-ai/plugin`, `js-yaml`, `zod`, `comment-json`
- No breaking changes to existing projects — purely additive
