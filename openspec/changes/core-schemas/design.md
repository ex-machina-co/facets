## Context

The `packages/facets` package exists with ArkType (2.1.29) and js-yaml as dependencies, but `src/index.ts` is a placeholder. No schema definitions, validation logic, or manifest loading code exists yet. Three ADRs define the normative shapes: ADR-001 (facet manifest), ADR-005 (server manifest), and ADR-003 (lockfile). The `docs/specification/manifest.mdx` provides additional constraints. This design covers how to translate those specifications into runtime-validated schemas with typed outputs.

The proposal establishes three capability domains (`authoring__facets`, `authoring__servers`, `installation`) plus a `spec-governance` delta. A future `authoring__composition` domain will handle cross-facet composition resolution — this design explicitly excludes composition.

## Goals / Non-Goals

**Goals:**

- Define ArkType schemas for facet manifest, server manifest, and lockfile that match the ADR-specified shapes exactly
- Produce TypeScript types inferred from schemas (single source of truth — no hand-written interfaces)
- Implement `loadManifest()` and `loadServerManifest()` that parse YAML from disk, validate, and return typed results or structured errors
- Implement prompt resolution for both forms (string, `{file: path}`)
- Ensure forward-compatibility: unknown fields pass through validation without error

**Non-Goals:**

- CLI commands or user-facing error formatting (later phase)
- Composition resolution (future `authoring__composition` domain)
- Lockfile read/write operations (future `installation` work)
- Build or publish flows

## Reference Example

A complete `facet.yaml` showing every section and both forms of each union type:

```yaml
# Identity — required fields
name: acme-dev
version: 1.0.0
description: "Acme org developer toolkit"
author: acme-org

# Skills — array of skill names (each maps to a file in the facet)
skills:
  - code-standards
  - pr-template

# Agents — map of name → agent descriptor
agents:
  reviewer:
    description: "Org code reviewer"
    prompt:
      file: agents/reviewer.md       # file form (Decision 6)
    platforms:
      opencode:
        tools:
          grep: true
          bash: true
  quick-check:
    description: "Fast lint check"
    prompt: "Review for style issues only."     # inline string form (Decision 6)

# Commands — map of name → command descriptor
commands:
  review:
    description: "Run a code review"
    prompt:
      file: commands/review.md

# Facets — composed text from other facets
facets:
  - "code-review-base@1.0.0"                   # compact form (Decision 7)
  - name: typescript-patterns                   # selective form (Decision 7)
    version: "2.1.0"
    skills:
      - ts-conventions
      - any-usage

# Servers — MCP server references
servers:
  jira: "1.0.0"                                # source-mode: floor version
  github: "2.3.0"
  "@acme/deploy": "0.5.0"
  slack:
    image: "ghcr.io/acme/slack-bot:v2"          # ref-mode: OCI image
```

The decisions below reference specific parts of this example by section.

## Decisions

### Decision 1: Schema-first, types-inferred

**Choice:** Define all data shapes as ArkType schemas. Extract TypeScript types via `typeof Schema.infer`. No hand-written type interfaces.

**Rationale:** A single source of truth for both runtime validation and static types. If the schema changes, types change automatically. Hand-written interfaces inevitably drift from validation logic.

**Alternatives considered:**
- *Hand-written TypeScript interfaces + separate validation:* Two sources of truth. Drift risk is high, especially with the number of union types in the manifest (prompt forms, server reference forms, facets entry forms).
- *Zod:* Was used in the v1 codebase (archived). The project already migrated to ArkType. ArkType's string-based syntax is more concise for the union-heavy manifest schema.

### Decision 2: Forward-compatibility via ArkType defaults

**Choice:** Rely on ArkType's default behavior of ignoring undeclared keys. Do NOT use `"+"`: `"reject"` on any schema.

**Rationale:** The specification requires that consumers tolerate unrecognized fields. ArkType's default structural typing behavior satisfies this without any configuration. Unknown fields from future schema versions pass through silently and are preserved in the validated output.

### Decision 3: Result type for validation, not exceptions

**Choice:** `loadManifest()` returns a discriminated result: `{ ok: true, data: FacetManifest } | { ok: false, errors: ValidationError[] }`. `loadServerManifest()` follows the same pattern with `ServerManifest` as the data type.

**Rationale:** Manifest loading is expected to fail in normal usage (author iterating on their `facet.yaml`). Exceptions are for unexpected failures, not expected validation results. A result type makes error handling explicit at every call site and avoids try/catch coupling.

**Alternatives considered:**
- *Throw on invalid:* Callers must wrap in try/catch. Easy to forget. Stack traces add noise for what are essentially user input errors.
- *Return ArkErrors directly:* Leaks ArkType internals into the public API. Downstream consumers would need to understand ArkType's error model. A mapped error type decouples the public API from the validation library.

### Decision 4: Prompt resolution is separate from schema validation

**Choice:** Schema validation confirms the prompt field has the correct *shape* (string or `{file: path}`). Prompt *resolution* (reading the file from disk) is a separate step that happens after validation, not during it.

**Rationale:** Schema validation is pure and fast — it checks structure. Prompt resolution is effectful — it reads files from disk. Mixing them means validation can fail for I/O reasons, which muddies the error model. Keeping them separate lets callers validate a manifest without touching the filesystem.

The resolution function takes a validated manifest and returns a new manifest with all prompts resolved to strings. This is the "loaded" form vs the "validated" form.

### Decision 5: Module structure — one file per schema, shared types

**Choice:** Organize schemas under `packages/facets/src/schemas/`:

```
packages/facets/src/
├── schemas/
│   ├── facet-manifest.ts    # FacetManifest schema + inferred type
│   ├── server-manifest.ts   # ServerManifest schema + inferred type
│   └── lockfile.ts          # Lockfile schema + inferred type
├── loaders/
│   ├── facet.ts             # loadManifest(), prompt resolution
│   └── server.ts            # loadServerManifest()
└── index.ts                 # Public API exports
```

No barrel re-export files (`index.ts`) in `schemas/` or `loaders/`. Consumers import directly from the specific module they need, or from the top-level `index.ts` which explicitly exports the public API.

**Rationale:** Each schema maps to one ADR and one spec domain. Separate files keep each schema independently readable and testable. Loaders are separated from schemas because they're effectful (filesystem I/O, network for URL prompts) while schemas are pure validation.

**Alternatives considered:**
- *Single `schemas.ts` file:* The facet manifest schema alone has ~10 sub-schemas (identity, agent descriptor, command descriptor, prompt form, facets entry compact, facets entry selective, server reference source-mode, server reference ref-mode). A single file would be 300+ lines. Separate files are more maintainable.
- *Domain-named directories (`authoring/`, `installation/`):* Over-engineered for what are currently single files. The flat structure under `schemas/` is sufficient. If schemas grow to need helpers, sub-modules can be introduced then.

### Decision 6: Prompt form as a discriminated union

**Choice:** The prompt field is modeled as a two-way union:

```
string | { file: string }
```

ArkType discriminates these automatically — `string` is distinguished by type from the object form.

**Rationale:** Prompts are either inline strings or local file references. URL-based prompts (`{url: url}`) were removed from the schema because URLs are ephemeral and non-reliable — a prompt that depends on a URL can break at any time for reasons outside the author's control, making builds non-reproducible and introducing a security risk (compromised URL silently injects malicious content). Prompts should be provided inline or composed from local files.

### Decision 7: Facets entry as a union of string and object

**Choice:** The `facets` array entry is modeled as:

```
string | { name: string, version: string, skills?: string[], agents?: string[], commands?: string[] }
```

The compact form (`"name@version"`) is validated as a string. Parsing the `@`-separated name and version is a concern for the composition resolver, not the schema validator. The schema only confirms it's a non-empty string.

**Rationale:** The schema's job is structural validation. Whether `"foo@1.0.0"` is a valid name and a valid semver is a semantic check that belongs in the composition domain. The manifest schema confirms the YAML structure is correct, not that referenced facets exist or that version strings parse.

### Decision 8: Shared error type and result pattern across all loaders

**Choice:** Map `ArkErrors` to a simpler public error type shared by both loaders:

```
ValidationError { path: string, message: string, expected: string, actual: string }
```

Both `loadManifest()` and `loadServerManifest()` return the same result shape: `{ ok: true, data: T } | { ok: false, errors: ValidationError[] }`, where `T` is the inferred schema type (`FacetManifest` or `ServerManifest` respectively).

**Rationale:** `ArkErrors` has a rich API (`byPath`, `flatProblemsByPath`, error codes, etc.) that's useful internally but too coupled to ArkType for a public API. The mapped type is serializable, library-agnostic, and contains everything a CLI or UI needs to display a useful error message. The `path` field (e.g., `"agents.reviewer.prompt"`) tells the author exactly where the problem is in their YAML. Using a single `ValidationError` type (not `ManifestError`) avoids needing separate error types for facet vs server validation — the error shape is identical regardless of which schema failed.

### Decision 9: Server manifest is `server.yaml`, parallel to `facet.yaml`

**Choice:** Source-mode MCP servers declare themselves via a `server.yaml` file in the server project root. This is the server-side analog to `facet.yaml` — a separate declaration file for a separate artifact type.

**Rationale:** Facets and servers are fundamentally different artifact types with different lifecycles:

- Facets contain text (skills, agents, commands). Servers contain code.
- Facets update occasionally (new skills, revised prompts). Servers update constantly (bug fixes, security patches).
- Facets are published by facet authors. Servers may be published by different people.
- A facet's `servers` section *references* servers — it doesn't contain them.

A server needs its own declaration file because it's its own project type. `server.yaml` is the natural name — clean, parallel to `facet.yaml`, and unambiguous in context. A project directory contains one or the other, never both:

```
facet-project/                  server-project/
├── facet.yaml                  ├── server.yaml
├── skills/                     ├── index.ts
│   └── code-review.md          └── src/
├── agents/                         └── ...
│   └── reviewer.md
└── commands/
    └── review.md
```

Even when a developer authors both a facet and a companion server (e.g., a Jira skill facet + a Jira MCP server), these are separate directories with separate manifests and separate publish operations. Having both `facet.yaml` and `server.yaml` in the same directory is not enforced as an error — it's simply not a meaningful configuration, since each file addresses a different project type.

The `server.yaml` schema is intentionally minimal (name, version, runtime, entry, optional description/author) with forward-compatibility via unknown field tolerance — same principle as `facet.yaml`. Future fields (permissions, tool declarations, required config) can be added without breaking existing manifests.

### Decision 10: Manifest immutability — no metadata file in bundles

**Choice:** Neither `facet.yaml` nor `server.yaml` is ever modified by build, publish, or install tooling. No additional metadata file (e.g., `.facet-meta.yaml`) is included in the bundle. Integrity metadata (content hashes, timestamps) is stored externally by the registry and recorded in the consumer's lockfile.

**Rationale:** We considered three options for where integrity/resolved information lives:

- *Enrich `facet.yaml` in the bundle:* Rejected — violates the manifest immutability constraint from ADR-001. The author's file must be exactly what gets published.
- *Separate metadata file alongside `facet.yaml` in the bundle:* Rejected — a content hash cannot live inside the thing it hashes (circular). And the bundle is already self-contained for its purpose (text delivery).
- *Registry stores metadata externally:* Chosen — mirrors the npm/cargo model. The registry computes and stores hashes after assembly. The lockfile on the consumer's machine records the verified hash. The bundle stays pure content.

This means three distinct data locations serve three purposes:

- `facet.yaml` — "I WANT these things" (author declaration, immutable)
- `facets.lock` — "I GOT these things" (consumer resolution, on consumer's machine)
- Registry API — "I AM this thing" (integrity metadata, on facet.cafe)

### Decision 11: Lockfile ref-mode entries store both image reference and resolved digest

**Choice:** Ref-mode server entries in the lockfile store three fields: `image` (the original OCI reference from the facet manifest), `digest` (the OCI digest resolved at install time), and `api_surface`.

**Rationale:** OCI tags are mutable — `:v2` today may point to a different image tomorrow. The lockfile must pin the exact digest for reproducible installs. But it also must preserve the original tag reference for two reasons:

1. `facet upgrade` needs the tag to re-resolve and check for newer digests
2. Display and traceability — showing the user what image reference this server came from

Without `digest`, pulling by tag gives non-reproducible installs. Without `image`, you lose the connection back to the tag and can't detect upgrades.

### Decision 12: Hashing algorithm lives in Facets OSS, hash verification lives on facet.cafe

**Choice:** The hashing algorithm (SHA-256 for content, tool-declaration hashing for API surface) is defined and implemented in the open-source `@ex-machina/facets` package. The registry (facet.cafe) stores the authoritative hash values and serves them via API. The CLI computes hashes locally and compares against the registry's values.

**Rationale:** This is the standard trust model used by npm, cargo, and other package managers:

- The algorithm is open and deterministic — anyone can compute and verify a hash
- The registry is the authority on what the hash *should be* for a given name+version
- The lockfile records the verified hash so future installs can verify without re-asking the registry

For this change, the lockfile schema defines that integrity fields exist and hold strings in `algorithm:hash` format. The actual hashing implementation belongs in a future `integrity` domain. This change defines the shape; the integrity domain defines the computation.

## Risks / Trade-offs

**[ArkType's undeclared-key default may change]** → We depend on ArkType defaulting to `"ignore"` for unknown fields. If a future ArkType version changes this default, forward-compatibility breaks silently. **Mitigation:** Pin ArkType to 2.x. Add a test that explicitly validates a manifest with unknown fields and asserts they pass through.

**[Prompt resolution ordering]** → File-based prompts (`{file: path}`) are resolved relative to the facet root. If the caller doesn't pass the correct root path, resolution silently reads wrong files or fails. **Mitigation:** The loader takes an explicit `rootDir` parameter. Prompt resolution constructs absolute paths from `rootDir + prompt.file`. No implicit cwd usage.

**[Schema strictness vs author experience]** → Rejecting manifests missing `name` or `version` is spec-correct but may frustrate authors during early iteration. **Mitigation:** This is the right trade-off. A manifest without identity fields is meaningless to every downstream consumer. Early, clear errors save time. The future `facet init` command will scaffold valid manifests.

**[YAML parsing errors vs schema errors]** → `js-yaml` throws on malformed YAML (bad indentation, tabs, etc.) before ArkType ever sees the data. These are a different error class than schema validation errors. **Mitigation:** `loadManifest()` catches YAML parse errors and wraps them in the same result type with a clear "YAML syntax error" category, so callers get a unified error interface regardless of failure stage.

## Domain Evolution

This change establishes the initial domain landscape. The domain boundaries were chosen based on distinct user personas, independent change trajectories, and different dependency profiles.

### Why `authoring__composition` is separate from `authoring__facets`

Composition resolution (fetching composed facets, extracting assets, detecting collisions, merging) is excluded from `authoring__facets` for five reasons:

1. **Different dependency profile** — `authoring__facets` is entirely local (filesystem only). Composition requires registry/cache access.
2. **Different persona moment** — A solo author writing original content never touches composition. It only matters when building on other people's work.
3. **Different failure modes** — Composition has its own error class: naming collisions, missing referenced facets, version not found, cache staleness, integrity mismatches.
4. **Security surface** — ADR-002 exists specifically because composition is a supply chain attack vector. Server-side assembly prevents composed content tampering.
5. **Ships at different times** — `authoring__facets` ships now (no registry needed). Composition ships when a registry exists.

### How `facet build` splits across domains

`facet build` (as defined in ADR-002) is naturally two phases that map to two domains:

| Phase               | What it does                                                    | Domain                 | When it ships            |
| ------------------- | --------------------------------------------------------------- | ---------------------- | ------------------------ |
| Local assembly      | Parse manifest, validate, collect local files, resolve prompts, package | `authoring__facets`    | Phase 0-2 (no registry needed) |
| Composition resolve | Fetch referenced facets, extract assets, detect collisions, merge       | `authoring__composition` | Later (needs registry)     |

A facet with no `facets` section can be fully built with just the local assembly phase — no registry, no network. This enables a complete local development loop (`facet init` → `facet build` → `facet install`) before any registry infrastructure exists.

### Full domain landscape

| Domain                   | This change                                    | Future additions                                                            |
| ------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------- |
| `authoring__facets`      | Schema, validation, loading, prompt resolution | Local bundle assembly, `facet init`, `facet validate`                       |
| `authoring__servers`     | Schema, validation, loading                    | `facet publish` (for servers)                                               |
| `authoring__composition` | *(not in scope)*                               | Cross-facet composition: fetch, extract, collision detection, merge, caching |
| `installation`           | Lockfile schema (shape only)                   | `facet install`, resolve, upgrade, integrity verification                   |
| `integrity`              | *(not in scope)*                               | Content hashing (SHA-256), API surface hashing, verification algorithms     |
