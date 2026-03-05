---
status: proposed
date: 2026-03-05
decision-makers: julian
---

# ADR-003: Install & Resolve Flow

## Status History

| status   | date       | decision-makers | github |
| -------- | ---------- | --------------- | ------ |
| proposed | 2026-03-05 | julian          |        |

## Context and Problem Statement

When a consumer runs `facet install`, the CLI must download the facet bundle and make its components available. For facets that reference MCP servers (via the `servers` section), the CLI must also resolve those references to concrete server versions, download the server artifacts, and pin everything in a lockfile.

The install flow has two distinct resolution paths:

1. **Text** — already resolved. The facet bundle is self-contained (composed by the registry at publish time per ADR-002). No text resolution at install time.
2. **MCP servers** — floor-constrained references that must be resolved to specific versions at install time.

The upgrade flow must handle both: newer facet versions (which may contain updated composed text) and newer server versions (which may contain security fixes or new capabilities).

This ADR defines what happens during `facet install` and `facet upgrade`.

## Decision Drivers

* Text is already bundled — no install-time resolution for text components (ADR-002, Facets SDR-003).
* Source-mode MCP server references use floor-only version constraints — the CLI resolves to the latest version at or above the floor. Ref-mode servers use OCI image tags resolved to digests at install time (Facets SDR-003).
* MCP servers are terminal — they don't depend on other MCP servers. Resolution is always one level deep (Facets SDR-003).
* The lockfile must pin exact versions and integrity hashes for reproducible installs.
* Upgrades must cover both facet version bumps and server version bumps in a single flow.
* API surface hashing detects structural breaking changes in MCP servers during upgrade (Facets SDR-003).

## Decision Outcome

### `facet install`

**Inputs:**
- A facet name (or name@version) to install

**Steps:**

1. **Download the facet bundle.** Query the registry for the facet at the requested version (or latest if no version specified). Download the bundle artifact. Verify the content hash against the registry's recorded hash (ADR-004).

2. **Read the manifest.** Parse the `facet.yaml` from the bundle.

3. **Install text components.** Extract the bundle's text files (skills, agent prompts, command prompts — both locally-authored and composed) into the local facet directory. No resolution needed — the bundle is self-contained.

4. **Resolve MCP server references.** For each entry in the `servers` section:

   **Source-mode** (string value — floor version):
   - Query the registry for the latest version of the named server at or above the floor constraint.
   - Download the server artifact.
   - Verify the server artifact's content hash (ADR-004).
   - Compute the server's API surface hash for future breaking-change detection (ADR-004).

   **Ref-mode** (object value — OCI image):
   - Resolve the OCI image tag to a digest by querying the OCI registry. If the reference is already a digest, use it as-is.
   - Pin the resolved digest in the lockfile.
   - Compute the server's API surface hash for future breaking-change detection (ADR-004).

   Resolution is always one level deep. MCP servers are terminal — they do not declare dependencies on other servers. There is no transitive resolution.

5. **Write the lockfile.** Record the exact resolved versions and integrity hashes:

    ```yaml
    # facets.lock
    facet:
      name: acme-dev
      version: "1.0.0"
      integrity: "sha256:abc123..."

    servers:
      # Source-mode server
      jira:
        version: "1.5.2"
        integrity: "sha256:def456..."
        api_surface: "sha256:789abc..."
      github:
        version: "2.4.0"
        integrity: "sha256:ghi012..."
        api_surface: "sha256:345def..."
      # Ref-mode server
      slack:
        image: "ghcr.io/acme/slack-bot:v2"
        digest: "sha256:e4d909..."
        api_surface: "sha256:567ghi..."
    ```

6. **Configure servers for the active platform.** For each resolved server, generate the platform-specific configuration needed to start the server (e.g., MCP server config entries for the active AI assistant). Platform configuration details are handled by the CLI's platform adapters.

**Lockfile-first installs:** If a lockfile already exists, `facet install` uses the pinned versions instead of resolving from the registry. This ensures reproducible installs across team members and environments. Only `facet upgrade` resolves newer versions.

### `facet upgrade`

**Purpose:** Check for newer facet versions and newer MCP server versions in a single interactive flow.

**Steps:**

1. **Read the lockfile and manifest.** Load the currently pinned facet version and server versions.

2. **Check for updates.**
   - **Facet**: Query the registry for the latest version of the installed facet. If a newer version exists, it may contain updated composed text, new server references, changed server floor constraints, or new local content.
   - **Servers**: For each source-mode server, query the registry for the latest version at or above the floor constraint. For each ref-mode server, re-resolve the OCI tag to check for a newer digest.

3. **Present available updates interactively.** Show the consumer what's available:
   - Facet version update (current → available), with a summary of what changed
   - Server version updates (current → available), with API surface change status for each

4. **API surface change detection.** For each server with a newer version:
   - Download the new server artifact and compute its API surface hash.
   - Compare to the API surface hash in the lockfile.
   - If unchanged — the upgrade is structurally safe.
   - If changed — a structural change occurred (tools added/removed, parameters changed, schemas modified). Flag this to the consumer with details about what changed.

5. **Consumer selects updates.** The consumer reviews the available updates and selects which to apply. They can accept all, select individually, or skip.

6. **Apply selected updates.**
   - If the facet version changed: download the new bundle, verify integrity, re-extract text components, and re-resolve any server references that have new floor constraints.
   - If server versions changed: download new server artifacts, verify integrity, update platform configuration.

7. **Write the updated lockfile.** Record the new versions, integrity hashes, and API surface hashes for all updated artifacts.

### Lockfile semantics

The lockfile (`facets.lock`) pins the exact state of an installation:

| Field                        | Description                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `facet.name`                 | The installed facet name.                                                          |
| `facet.version`              | The exact installed facet version.                                                 |
| `facet.integrity`            | Content hash of the facet bundle (ADR-004).                                        |
| `servers.<name>.version`     | Source-mode: the exact resolved server version.                                    |
| `servers.<name>.integrity`   | Source-mode: content hash of the server artifact (ADR-004).                        |
| `servers.<name>.image`       | Ref-mode: the OCI image reference (tag or digest) from the manifest.               |
| `servers.<name>.digest`      | Ref-mode: the resolved OCI digest pinned at install time.                          |
| `servers.<name>.api_surface` | API surface hash at install time — the baseline for change detection (both modes). |

The lockfile ensures reproducible installs. It should be version-controlled so that all team members and CI environments get the same versions.

### What is NOT in the install flow

- **Text resolution** — text is already in the bundle. No install-time fetching of composed facets.
- **Transitive server resolution** — servers are terminal. No multi-level dependency resolution.
- **Local disk layout specifics** — where files are placed on disk is an implementation concern, not a spec-level decision.

## Consequences

### Good

* Install-time resolution is trivially simple — one level deep, no transitive chains, no conflict resolution
* The lockfile provides reproducible installs — same lockfile, same versions, same bytes
* Unified upgrade flow covers both facet and server updates interactively
* API surface hashing catches structural breaking changes before they affect users
* Text installation requires no network access beyond downloading the bundle itself

### Neutral

* The lockfile must be version-controlled by the consumer for reproducibility across team members
* `facet upgrade` requires network access to check for newer versions

### Bad

* Floor-only constraints may resolve to a server version with behavioral changes that don't alter the API surface hash — the hash catches structural changes but not semantic changes
* If the registry is unavailable, server resolution fails — there is no fallback mechanism for resolving servers from alternative sources
* A facet version upgrade may change server floor constraints, which could cascade into server upgrades the consumer didn't expect — the interactive flow mitigates this by showing all changes before applying

## More Information

* **Facets ADR-001**: Manifest schema — defines the `servers` section with floor constraints
* **Facets ADR-002**: Publish flow — how bundles are assembled by the registry
* **Facets ADR-004**: Integrity model — content hashing, API surface hashing, verification
* **Facets ADR-005**: MCP server artifact — the server artifact type being resolved
* **Facets SDR-003**: Dual distribution model — servers are versioned with floor-only constraints, terminal dependencies
