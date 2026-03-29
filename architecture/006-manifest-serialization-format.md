---
status: proposed
date: 2026-03-28
decision-makers: julian
---

# ADR-006: Manifest Serialization Format

## Status History

| status   | date       | decision-makers | github |
| -------- | ---------- | --------------- | ------ |
| proposed | 2026-03-28 | julian          |        |

## Context and Problem Statement

The facet manifest defines what a facet contains — its identity, text assets, composed facets, and server references. ADR-001 defines the manifest schema (fields, types, constraints, semantics). This ADR decides the serialization format for that schema.

The CLI manages all manifest mutations — authors edit `.md` content files, not the manifest directly. The format choice should optimize for machine reliability over human authoring ergonomics.

The integrity model (ADR-004) introduces content hashing of build artifacts. Deterministic serialization simplifies hash computation and verification.

## Decision Drivers

* **Machine authoring is the primary path.** The CLI scaffolds manifests (`facet create`) and will manage ongoing mutations (interactive build reconciliation). Authors edit `.md` content files, not the manifest. Format ergonomics for hand-editing are secondary to machine reliability.
* **Deterministic serialization.** Content hashing requires that the same logical manifest produces the same bytes. `JSON.stringify` with sorted keys is trivially deterministic. YAML serializers do not guarantee stable output — key ordering, quoting style, and whitespace vary across serializers and versions.
* **Parsing reliability.** The manifest is a contract — ambiguous parsing is unacceptable. YAML has implicit type coercion (`1.0.0` → number `1`, `no` → boolean `false`, `on` → boolean `true`) that creates subtle bugs. JSON has zero parsing ambiguity.
* **Dependency minimization.** Fewer runtime dependencies reduce supply chain risk and build complexity. `JSON.parse` is built into every JavaScript runtime. YAML requires a third-party parser package.

## Considered Options

* YAML
* JSON
* JSONC (JSON with Comments)
* JSON5
* TOML

## Decision Outcome

Chosen option: **JSON**, because it is the only format that scores well on all four decision drivers: zero parsing ambiguity, trivially deterministic serialization, zero runtime dependencies, and universal tooling support.

The manifest filename changes from `facet.yaml` to `facet.json`. The schema defined in ADR-001 is unchanged — only the serialization format changes.

ADR-001 will be modified to note that the manifest schema is format-agnostic and the serialization format is governed by this ADR.

### Consequences

* Good, because zero parsing ambiguity — what you write is what you get
* Good, because `JSON.parse()` is built into every JavaScript runtime — no parser dependency needed
* Good, because `JSON.stringify(data, null, 2)` produces deterministic, human-readable output trivially
* Good, because perfect roundtrip fidelity — parse then serialize produces identical bytes
* Good, because the scaffold generator can use `JSON.stringify` to produce clean, readable output
* Neutral, because JSON requires quoting all keys and string values — irrelevant since the CLI manages the manifest, not humans
* Neutral, because JSON has no comment syntax — irrelevant since the manifest is machine-managed and the schema is documented in ADR-001

### Confirmation

- The manifest loader reads `facet.json` via `JSON.parse()`
- The scaffold generator writes `facet.json` via `JSON.stringify()`
- All tests pass with JSON manifest fixtures

## Pros and Cons of the Options

### YAML

Widely used for configuration files (Docker Compose, GitHub Actions, Kubernetes).

* Good, because no quoting needed for keys or most string values
* Good, because comments are supported
* Good, because less visual noise than JSON for hand-authored files
* Good, because familiar to DevOps-oriented developers
* Bad, because implicit type coercion creates subtle bugs (`1.0.0` → `1`, `no` → `false`, `on` → `true`)
* Bad, because the spec is extremely complex (83 pages) leading to parser inconsistencies across implementations
* Bad, because serializers do not guarantee stable output — key ordering, quoting style, and whitespace vary
* Bad, because requires a runtime dependency (`yaml` package)
* Bad, because YAML serializers don't produce reliably formatted output, often requiring manual string construction

### JSON

Standard data interchange format. Built into every JavaScript runtime.

* Good, because zero parsing ambiguity
* Good, because zero runtime dependencies
* Good, because trivially deterministic serialization
* Good, because perfect roundtrip fidelity
* Good, because universal tooling support (every editor, every language, every API)
* Neutral, because mandatory quoting of all keys and strings — not a concern when the CLI writes the file
* Bad, because no comment syntax — not a concern when the manifest is machine-managed

### JSONC (JSON with Comments)

JSON extended with `//` and `/* */` comments. Used by VS Code (`settings.json`), TypeScript (`tsconfig.json`), and Deno (`deno.jsonc`).

* Good, because comments are supported
* Good, because otherwise identical to JSON in syntax and semantics
* Good, because familiar from VS Code and TypeScript ecosystem
* Bad, because comments are lost on roundtrip — parse strips comments, serialize doesn't reproduce them
* Bad, because not a formal standard — parser behavior varies across implementations
* Bad, because the marginal benefit over JSON (comments) is irrelevant when the manifest is machine-managed

### JSON5

JSON extended with unquoted keys, trailing commas, single-quoted strings, and comments.

* Good, because more relaxed syntax than JSON for hand-editing
* Good, because comments are supported
* Bad, because non-standard — requires a runtime dependency (`json5` package)
* Bad, because relaxed syntax benefits only apply to hand-editing, which is not the primary authoring path
* Bad, because less tooling support than JSON or JSONC

### TOML

Configuration format designed for readability. Used by Rust (`Cargo.toml`), Python (`pyproject.toml`).

* Good, because no quoting needed for most keys
* Good, because comments are supported
* Good, because clear table/section syntax for shallow structures
* Bad, because **mixed-type arrays are not supported** — the `facets` field in the manifest schema requires arrays containing both strings and objects (compact and selective forms), which is invalid TOML. This is a hard blocker that would require restructuring the schema to work around.
* Bad, because deeply nested maps become awkward (e.g., `[agents.reviewer.platforms.opencode]`)
* Bad, because requires a runtime dependency
* Bad, because less common in the JavaScript ecosystem

## More Information

* ADR-001 (Facet Manifest Schema) defines the schema; this ADR governs the serialization format
* The archive format (`.facet` files produced by `facet build`) contains `facet.json`
* The build manifest (`build-manifest.json`) is also JSON
* The lockfile format (`facets.lock`) is a separate concern not addressed by this ADR
