## Why

No code exists yet to validate or load a facet manifest. Every subsequent phase — CLI commands, local authoring, installation, publishing — depends on being able to parse `facet.yaml` and reject invalid ones with clear errors. Until schemas exist and are enforced, nothing else can be built with confidence. The three core schemas (facet manifest, server manifest, lockfile) define the interfaces between authoring, server publishing, and installation — getting their shapes right together prevents drift between phases.

## What Changes

- Define the facet manifest schema (`facet.yaml`) covering identity, text assets, agent/command descriptors, composed facets, and server references
- Define the source-mode server manifest schema (`server.yaml`) covering name, version, runtime, and entry
- Define the lockfile schema (`facets.lock`) covering resolved facet versions, integrity hashes, and per-server resolution (source-mode and ref-mode)
- Implement manifest loading: parse YAML, validate against schema, return typed result or structured errors
- Implement prompt resolution for both forms: inline string and `{file: path}`
- Enforce forward-compatibility: unrecognized fields MUST be tolerated, not rejected
- Codify the `__` (double underscore) category-domain naming convention for specs

## Non-goals

- CLI commands (`facet init`, `facet validate`) — those belong in a later CLI phase
- Install or publish flows — this phase only defines the lockfile *shape*, not the code that writes it
- Registry interactions or network-based resolution
- Runtime execution of MCP servers
- Text composition resolution (fetching, merging, collision detection from other facets) — separate domain (`authoring__composition`), specced when composition ships in a later phase

## Capabilities

### New Capabilities

- `authoring__facets`: Parsing, validation, and loading of `facet.yaml`. Covers the facet manifest schema, YAML-to-typed-object loading, prompt resolution (string, file, URL), forward-compatibility, and structured validation errors. Local bundle assembly (collecting and packaging local text artifacts) is a future addition to this domain. Cross-facet composition resolution is a separate domain (`authoring__composition`).
- `authoring__servers`: Parsing, validation, and loading of `server.yaml`. Covers the server manifest schema (name, version, runtime, entry), YAML-to-typed-object loading, forward-compatibility, and structured validation errors.
- `installation`: Lockfile schema (`facets.lock`) defining the shape of resolved dependencies — pinned facet versions, integrity hashes, and per-server resolution for both source-mode and ref-mode. Schema definition only; install/upgrade flows are future work.

### Modified Capabilities

- `spec-governance`: Add the `__` (double underscore) category-domain naming convention for grouping sibling domains that are independent systems under a shared parent concept.

## Impact

- **Code**: New schema definitions and loader in `packages/facets/src/` using ArkType (already a dependency)
- **APIs**: Exports `loadManifest()`, `loadServerManifest()`, and schema types as the public surface for downstream phases
- **Dependencies**: No new dependencies required — ArkType and js-yaml are already installed
- **Systems**: Foundation for CLI, install, publish, and integrity phases — all will import these schemas
- **Specs**: Establishes three new spec domains and extends `spec-governance` with naming conventions
