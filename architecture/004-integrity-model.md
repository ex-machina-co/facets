---
status: proposed
date: 2026-03-05
decision-makers: julian
---

# ADR-004: Integrity Model

## Status History

| status   | date       | decision-makers | github |
| -------- | ---------- | --------------- | ------ |
| proposed | 2026-03-05 | julian          |        |

## Context and Problem Statement

Facets and MCP servers are distributed artifacts. Consumers need confidence that what they install is what was published — no tampering, no corruption, no substitution. The integrity model defines how artifacts are hashed, when hashes are verified, and how structural changes to MCP server APIs are detected.

There are three integrity concerns:

1. **Content integrity** — does the downloaded artifact match what was published?
2. **OCI digest integrity** — for ref-mode MCP servers (container images), does the image match a known-good digest?
3. **API surface integrity** — has an MCP server's API changed structurally between versions?

Each concern operates at a different point in the lifecycle and serves a different purpose.

## Decision Drivers

* "Pin a version, get exact bytes every time" — the fundamental integrity guarantee (Facets SDR-002).
* Content hashing must cover both facet bundles and source-mode MCP server artifacts.
* Ref-mode MCP servers use OCI images, which have their own versioning model: tags (mutable labels) and digests (immutable content hashes). Tags and digests are different from semver (Facets SDR-002).
* API surface hashing must detect structural breaking changes — tool removals, renamed parameters, changed schemas, description changes — without being triggered by non-structural changes like server metadata updates (Facets SDR-003).
* The lockfile is the consumer's source of truth for pinned hashes (ADR-003).

## Decision Outcome

### Three integrity mechanisms

#### 1. Content hashing

**What it covers:** Facet bundles and source-mode MCP server artifacts — anything published to the facets registry.

**How it works:** At publish time, the registry computes a SHA-256 hash of the complete artifact (the tar archive). The hash is stored as the artifact's `integrity` value. At install time, the CLI downloads the artifact, computes the hash, and compares it to the registry's recorded value. A mismatch is a hard failure — the artifact is rejected.

**When it's applied:**
- **Publish time**: Registry computes the hash after assembling the artifact (ADR-002).
- **Install time**: CLI verifies the downloaded artifact against the registry's hash.
- **Lockfile**: The integrity hash is recorded in the lockfile for reproducible verification.

**Format:** `sha256:<hex-encoded hash>` (e.g., `sha256:a1b2c3d4...`).

**What it guarantees:** The bytes the consumer receives are identical to the bytes the registry stored. No tampering in transit, no corruption, no substitution.

#### 2. OCI digest pinning

**What it covers:** Ref-mode MCP servers — container images hosted in OCI registries (GHCR, Docker Hub, ECR, etc.).

**How it works:** A ref-mode server is declared in the facet manifest with an OCI image reference using a tag:

```yaml
servers:
  slack:
    image: "ghcr.io/acme/slack-bot:v2"
```

OCI images have two reference types:
- **Tags** (`:v2`, `:latest`) — mutable labels. A tag can be moved to point to a different image at any time. Tags are for humans.
- **Digests** (`@sha256:abc123`) — immutable content hashes. A digest always points to the same image. Digests are for machines.

At install time, the CLI resolves the tag to a digest by querying the OCI registry. The resolved digest is pinned in the lockfile:

```yaml
servers:
  slack:
    image: "ghcr.io/acme/slack-bot:v2"
    digest: "sha256:abc123..."
```

If the author specifies a digest directly (`image: "ghcr.io/acme/slack-bot@sha256:abc123"`), no resolution is needed — the digest is used as-is.

**When it's applied:**
- **Install time**: CLI resolves the tag to a digest and pins it in the lockfile.
- **Upgrade time**: `facet upgrade` re-resolves the tag. If the digest changed (the tag was moved to a newer image), the consumer is notified. API surface hashing detects structural changes.
- **Lockfile install**: CLI pulls the image by the pinned digest, not by the tag.

**What it guarantees:** Once installed, the consumer always gets the same container image regardless of whether the tag was moved. The digest in the lockfile is the truth.

**Note:** OCI images do not have semver versions — they have tags and digests. Tags that look like versions (`:v1.5.0`) are just labels. The facets system does not interpret or constrain OCI tag naming. Floor-only version constraints (used for source-mode servers) do not apply to ref-mode servers. Ref-mode servers are pinned by tag + resolved digest.

#### 3. API surface hashing

**What it covers:** MCP server API surfaces — the structural contract between a server and its consumers.

**How it works:** The API surface hash is computed from the server's MCP tool declarations:
- Tool names
- Tool descriptions (exact text — descriptions guide LLM behavior)
- Parameter names, types, and schemas (JSON Schema)
- Parameter descriptions
- Required vs. optional parameter status

These elements are serialized into a canonical form (sorted keys, deterministic JSON, no whitespace variation) and hashed with SHA-256. The hash captures the structural shape of the API including the text that guides how an LLM uses it.

**Why descriptions are included:** Descriptions are consumed by the LLM to decide when and how to use a tool. A description change could alter AI behavior even if parameters are unchanged. Including descriptions in the hash ensures consumers are notified of any change that could affect how their AI assistant interacts with the server.

**What the hash does NOT cover:**
- Tool implementation (behavior, side effects)
- Server version number or metadata (author, license)
- Server configuration or environment variables
- Response formats (not part of the MCP tool declaration)

**When it's applied:**
- **Install time**: The CLI connects to each resolved server, retrieves its MCP tool declarations, computes the API surface hash, and records it in the lockfile.
- **Upgrade time**: The CLI computes the API surface hash of the new server version and compares it to the lockfile's recorded hash. If changed, the consumer is warned about structural changes.
- **Publish time** (server publishing): The registry can compute and store the API surface hash as metadata, enabling queries like "did the API surface change between v1.0 and v1.1?"

**What it guarantees:** The consumer is warned when an MCP server's API surface changes structurally. This catches:
- Tools that were removed or renamed
- Parameters that were added, removed, or changed type
- Schema changes that alter what the server accepts
- Description changes that alter how the LLM interprets a tool

It does NOT catch behavioral changes where the API surface is unchanged but the server acts differently. Behavioral integrity is not solvable through hashing.

### Hash storage and flow

| Artifact type               | Content hash | OCI digest | API surface hash |
| --------------------------- | ------------ | ---------- | ---------------- |
| Facet bundle                | Yes          | —          | —                |
| Source-mode server artifact | Yes          | —          | Yes              |
| Ref-mode server (OCI image) | —           | Yes        | Yes              |

**Where hashes live:**

| Location        | What's stored                                                                       |
| --------------- | ----------------------------------------------------------------------------------- |
| Registry        | Content hash for facets and source-mode servers. API surface hash for source-mode servers. |
| Lockfile        | Content hash or OCI digest + API surface hash for every installed server.            |
| Facet manifest  | OCI image reference (tag or digest) for ref-mode servers.                           |

### Verification summary

| When             | What's verified                                                          |
| ---------------- | ------------------------------------------------------------------------ |
| Install          | Content hash of facet bundle and source-mode server artifacts            |
| Install          | OCI tag resolved to digest; digest pinned in lockfile for ref-mode       |
| Install          | API surface hash computed and recorded for all servers                   |
| Upgrade          | Content hash or OCI digest verified for new versions                     |
| Upgrade          | API surface hash compared to lockfile — changes flagged to consumer      |
| Lockfile install | Pinned content hash or OCI digest used for exact reproduction            |

## Consequences

### Good

* "Pin a version, get exact bytes" guarantee for all artifact types
* API surface hashing catches structural breaking changes automatically, including description changes that affect LLM behavior
* OCI digest pinning provides immutable container image references independent of mutable tags
* Three mechanisms cover three distinct integrity concerns without overlap
* Source-mode and ref-mode servers both have integrity guarantees, through different but appropriate mechanisms

### Neutral

* API surface hashing adds computation at install and upgrade time (trivial cost — hashing tool declarations is fast)
* Including descriptions in the API surface hash means documentation-only changes trigger the breaking change warning — noisier but safer for LLM-consumed content
* OCI digest resolution requires network access to the OCI registry at install time

### Bad

* Behavioral changes (same API surface, different behavior) are not detectable through hashing
* The canonical serialization format for API surface hashing must be precisely specified to ensure deterministic hashes across implementations — any ambiguity produces false mismatches
* Content hashing ties integrity to the exact archive format — if the archive format changes, all hashes change
* Ref-mode servers depend on external OCI registries for digest resolution and image availability — if the OCI registry is down or the image is deleted, install fails with no fallback

## More Information

* **Facets ADR-001**: Manifest schema — defines server references in both source and ref forms
* **Facets ADR-002**: Publish flow — content hashes are computed at publish time by the registry
* **Facets ADR-003**: Install & resolve flow — hashes verified at install, API surface hashes compared at upgrade
* **Facets ADR-005**: MCP server artifact — defines the server artifact type and its publish flow
* **Facets SDR-002**: Tool execution model — source and ref modes with integrity guarantees
* **Facets SDR-003**: Dual distribution model — API surface hashing as the safety net for version constraints
