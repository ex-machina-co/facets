---
status: proposed
date: 2026-03-05
decision-makers: julian
---

# ADR-002: Publish Flow

## Status History

| status   | date       | decision-makers | github |
| -------- | ---------- | --------------- | ------ |
| proposed | 2026-03-05 | julian          |        |

## Context and Problem Statement

A facet is published to a registry so that consumers can discover and install it. The publish process must handle two concerns:

1. **Text composition** — the `facets` section in the manifest references other facets. The composed text must be included in the published bundle so that consumers get a self-contained artifact.

2. **Composition integrity** — if the author uploads a pre-assembled bundle, they could tamper with composed files (replacing trusted content with malicious prompts) while the manifest still attributes the content to trusted sources. The attribution would be a lie. This is a supply chain attack on AI context.

This ADR defines what happens during `facet build` and `facet publish` — the steps, the inputs, the outputs, and the integrity guarantees. It covers facet artifacts only. MCP server publishing is defined in ADR-005.

## Decision Drivers

* The manifest is immutable — the publish process must not modify the facet manifest (ADR-001).
* Composed text must be included in the bundle so consumers get a self-contained package with no install-time text resolution (Facets SDR-003).
* Composition integrity requires that composed files match their attributed sources. The author must not be able to tamper with composed content.
* Two publish mechanisms are needed: direct upload from a local directory, and Git-linked pull where the registry fetches from a repository at publish time (facet-cafe SDR-001).
* A version, once published, is immutable. Re-publishing the same name + version with different content must be rejected.

## Decision Outcome

### The publish pipeline

The publish flow has two phases: **build** (local, for testing) and **publish** (to the registry, which assembles the canonical artifact).

#### Phase 1: Build (local)

`facet build` produces a local bundle for testing and inspection. This is a preview — not the artifact of record.

**Steps:**

1. **Parse the manifest.** Read the facet manifest (`facet.json`) and validate against the manifest schema (ADR-001).

2. **Resolve text composition.** For each entry in the `facets` section:
   - Fetch the referenced facet at the exact pinned version from the registry (or local cache).
   - For compact entries (`"name@version"`): extract all text artifacts and their files.
   - For selective entries: extract only the named components and their files.
   - Detect naming collisions between composed components and locally-authored components. Collisions are a build error.

3. **Validate platform config.** For each agent with a `platforms` section, validate the platform-specific config against the CLI's known platform schemas. Unknown platforms produce a warning. Invalid config for a known platform is a build error.

4. **Validate server references.** For each entry in the `servers` section, verify that the named server exists in the registry. Missing servers produce a warning (the server may not yet be published), not an error.

5. **Package the local bundle.** Create the bundle containing the manifest, all local files, and all composed files. This is for local testing only.

The author can inspect the local bundle, test it, and iterate before publishing.

#### Phase 2: Publish (to registry)

`facet publish` uploads the author's work to the registry. The registry assembles the canonical bundle.

**What the author uploads:**
- The facet manifest — unmodified
- All locally-authored component files (skills, agent prompts, command prompts)

Composed files are NOT uploaded by the author. This is the key security property.

**What the registry does:**

1. **Validates the manifest.** Parses the facet manifest and validates against the schema.

2. **Resolves text composition server-side.** For each entry in the `facets` section, the registry fetches the referenced facet from its own storage — a trusted source. It extracts the composed components and their files, exactly as the local build would. Because the registry resolves composition from its own artifact store, the author cannot tamper with composed content.

3. **Detects naming collisions.** Composed component names must not collide with locally-authored component names. Collisions reject the publish.

4. **Assembles the canonical bundle.** The registry creates the bundle artifact containing:
   - The facet manifest — unmodified
   - All locally-authored component files (from the author's upload)
   - All composed component files (from the registry's own resolution)

5. **Computes the content hash.** The registry hashes the assembled bundle for integrity verification (ADR-004).

6. **Stores the artifact.** The registry stores the bundle and content hash. Both are available for download and verification by consumers.

**Two publish mechanisms:**

**Direct upload:** The author runs `facet publish` locally. The CLI uploads the manifest and local files. The registry assembles the bundle server-side.

**Git-linked pull:** The author registers a Git repository URL with the registry. On publish trigger (tag, webhook, or manual), the registry clones the repository at the specified ref, extracts the manifest and local files, and assembles the bundle server-side. The registry uses only the manifest and locally-authored files from the clone — composed content comes from its own storage.

Both mechanisms produce the same result: a canonical bundle assembled by the registry with verified composition.

### Build vs. publish

| Concern                 | `facet build` (local)             | `facet publish` (registry)                  |
| ----------------------- | --------------------------------- | ------------------------------------------- |
| Who assembles           | The CLI                           | The registry                                |
| Composition source      | Registry or local cache           | Registry's own artifact store               |
| Output                  | Local bundle for testing          | Canonical bundle stored in registry         |
| Integrity guarantee     | None (local preview)              | Composed content matches attributed sources |
| Manifest modification   | None                              | None                                        |

### Why server-side composition

If the author uploads a pre-assembled bundle (including composed files), they could replace composed content with malicious prompts while the manifest still attributes the content to trusted sources. The `facets` section would claim "this skill came from trusted-base@1.0.0" but the actual file could contain anything.

Server-side composition eliminates this attack. The registry fetches composed content from its own storage — the same storage that the original facet author published to. The content is guaranteed to match the attribution. The author only uploads their own work.

This also reduces upload payload size: the author doesn't need to upload files that the registry already has.

### What is NOT in the publish flow

- **MCP server resolution** — server references in `servers` are stored as floor constraints. They are resolved at install time (ADR-003).
- **MCP server publishing** — servers are a separate artifact type with their own publish flow (ADR-005).
- **Lockfile generation** — the lockfile is an install-time artifact, not a publish-time artifact.
- **Local disk layout** — how the bundle is stored locally after install is an implementation concern, not a spec-level decision.

## Consequences

### Good

* Composition integrity — composed content is guaranteed to match the attributed sources because the registry assembles it from its own trusted storage
* Smaller upload payload — authors upload only their own files, not copies of other facets' content
* Immutable manifest — the author's intent is preserved exactly as written
* Immutable versions — once published, a version's content never changes
* Two publish mechanisms support both individual developers and CI/CD workflows

### Neutral

* The local build preview may differ from the published artifact if the author tampered with local composed files — but this doesn't matter because the published artifact is always assembled by the registry
* The registry must have all referenced facets in its own storage at publish time (if a referenced facet doesn't exist, the publish fails)

### Bad

* Server-side composition adds processing cost to the registry at publish time — the registry must fetch and assemble composed content for every publish
* The author cannot know the exact byte-for-byte artifact that will be published until after the registry assembles it (though the local build is a close preview)
* If a referenced facet version is yanked or removed from the registry between local build and publish, the publish will fail

## More Information

* **Facets ADR-001**: Manifest schema — defines the `facets` and `servers` sections that this flow processes
* **Facets ADR-003**: Install & resolve flow — how consumers download bundles and resolve server references
* **Facets ADR-004**: Integrity model — how content hashes are computed and verified
* **Facets ADR-005**: MCP server artifact — the separate publish flow for MCP servers
* **Facets SDR-003**: Dual distribution model — text is bundled, servers are versioned
* **facet-cafe SDR-001**: Hosted artifact registry — the registry hosts bundles and supports both upload mechanisms
