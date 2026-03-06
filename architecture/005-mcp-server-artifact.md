---
status: proposed
date: 2026-03-05
decision-makers: julian
---

# ADR-005: MCP Server Artifact

## Status History

| status   | date       | decision-makers | github |
| -------- | ---------- | --------------- | ------ |
| proposed | 2026-03-05 | julian          |        |

## Context and Problem Statement

Facets are text artifacts (skills, agents, commands). MCP servers are code. This ADR establishes that source-mode MCP servers are a separate artifact type published to the facets registry, while ref-mode MCP servers are external OCI images referenced directly from a facet's manifest.

A facet references servers by name in its `servers` section (ADR-001). This ADR defines what a source-mode server artifact looks like, how it's published, and how the CLI runs both source-mode and ref-mode servers.

## Decision Drivers

* Facets are text, MCP servers are code — fundamentally different artifacts with different lifecycles, update cadences, and security profiles (Facets SDR-003).
* Two execution modes: source (bundled code, managed runtime) and ref (OCI container image) (Facets SDR-002).
* Source-mode servers are artifacts published to the facets registry with semver versions. Floor constraints apply.
* Ref-mode servers are OCI images in external registries. They have tags and digests, not semver. There is no facets-registry artifact for ref-mode servers. There is no floor constraint. A facet simply points at an OCI image reference.
* No arbitrary command/args execution — the CLI controls what runs (Facets SDR-002).
* Server authors and facet authors may be different people.

## Decision Outcome

### Two kinds of server references, two different models

**Source-mode** servers are artifacts in the facets registry. They have semver versions, content hashes, and API surface hashes. They are published, resolved, and upgraded through the facets system.

**Ref-mode** servers are NOT in the facets registry. They are OCI container images hosted in external OCI registries (GHCR, Docker Hub, ECR, etc.). A facet's manifest points directly at an OCI image reference. The facets registry knows nothing about them. The CLI resolves the tag to a digest at install time and pins it in the lockfile.

| Property           | Source-mode                                | Ref-mode                                            |
| ------------------ | ------------------------------------------ | --------------------------------------------------- |
| Where it lives     | Facets registry                            | External OCI registry                               |
| Versioning         | Semver in the facets registry              | OCI tags and digests (no semver, no floor)           |
| Facet manifest ref | `server-name: "1.0.0"` (floor constraint) | `server-name: { image: "registry/image:tag" }`      |
| Resolution         | Registry resolves latest above floor       | CLI resolves tag to digest at install time           |
| Integrity          | Content hash + API surface hash            | OCI digest + API surface hash                       |
| Published artifact | Yes — source code bundle in facets registry| No — just an OCI image reference in the facet manifest |
| Upgrade mechanism  | `facet upgrade` resolves newer above floor | `facet upgrade` re-resolves tag, checks for new digest |

### Source-mode server manifest

Source-mode servers are published to the facets registry. Each has a manifest:

```yaml
name: jira
version: "1.5.0"
description: "Jira integration — create, search, update, and transition issues"
author: acme-org
runtime: bun
entry: index.ts
```

| Field         | Required | Description                                                     |
| ------------- | -------- | --------------------------------------------------------------- |
| `name`        | Yes      | Server name. Must be unique in the registry's server namespace. |
| `version`     | Yes      | Semver version string.                                          |
| `description` | No       | Human-readable description.                                     |
| `author`      | No       | Author name or identifier.                                      |
| `runtime`     | Yes      | Managed runtime identifier. Day-one supported: `"bun"`.        |
| `entry`       | Yes      | Entry point file path, relative to the artifact root.           |

There is no `type` field — if it's published to the facets registry as a server artifact, it's source-mode by definition.

### Ref-mode: no artifact, just a reference

Ref-mode servers have no manifest in the facets registry. They are declared directly in a facet's `servers` section:

```yaml
servers:
  slack:
    image: "ghcr.io/acme/slack-bot:v2"
```

That's it. The image reference follows standard OCI conventions — `:` for tags, `@` for digests. The CLI resolves tags to digests at install time and pins the digest in the lockfile (ADR-004).

There is no facets-registry artifact for ref-mode servers. There is no semver version in the facets registry. There is no floor constraint. The facet author specifies the image reference, and the CLI pins it.

### Source-mode server publish flow

1. The server author runs a publish command from the server source directory.
2. The CLI reads the server manifest and validates it.
3. The CLI packages the source code into an artifact (tar archive containing the manifest and all source files).
4. The CLI uploads the artifact to the registry.
5. The registry computes the content hash (ADR-004).
6. The registry computes the API surface hash — by starting the server temporarily using the declared runtime and entry point, querying its MCP tool declarations, and hashing them (ADR-004).
7. The registry stores the artifact, content hash, and API surface hash.

**Immutability:** Once a server version is published, it cannot be re-published with different content.

### Execution contract

The facets CLI guarantees the following when running an MCP server:

**Source-mode:**
1. The CLI downloads the server artifact from the facets registry.
2. The CLI starts the server using the declared managed runtime (`bun` day-one) with the declared entry point.
3. The server communicates via MCP over stdio.
4. The CLI manages the server process lifecycle — start, stop, restart.

**Ref-mode:**
1. The CLI pulls the container image by the pinned digest (from the lockfile).
2. The CLI starts the container using a container runtime (Docker/Podman).
3. The server communicates via MCP over stdio (container stdin/stdout) or HTTP (mapped port).
4. The CLI manages the container lifecycle.

**What the CLI guarantees:**
- The server is started with the correct runtime/image.
- The server process/container is stopped when the AI assistant session ends.
- No arbitrary command/args — the CLI controls exactly what executes.
- The server's MCP tools are exposed to the AI assistant through the platform's MCP integration.

**What the CLI does NOT guarantee:**
- Network access for the server (server-specific concern).
- File system access beyond what the runtime/container provides.
- Inter-server communication (servers are terminal — they don't depend on other servers).

### Runtime enumeration

Each supported source-mode runtime is an explicit security surface commitment. Adding a new runtime (e.g., Python) requires:
- Audit of the runtime's security model
- Implementation of the runtime adapter in the CLI
- Ongoing maintenance of the runtime integration

Runtimes are enumerated, not discovered. Day-one: `bun` (TypeScript/JavaScript). Additional runtimes are future ADR additions.

## Consequences

### Good

* Clean separation — source-mode servers are independently versioned and published, decoupled from facet lifecycles
* Ref-mode requires no facets-registry involvement — just an OCI image reference in the facet manifest
* Two execution modes cover the breadth of MCP servers: TypeScript (source, trivially easy) and any language (ref, containerized)
* Server authors don't need to think about facets — they publish source-mode servers, facet authors reference them
* No arbitrary execution — the CLI controls all server processes

### Neutral

* Server publishing is a separate workflow from facet publishing — authors who ship both manage two publications
* Container runtime (Docker/Podman) is required for ref-mode servers
* Ref-mode servers have no version history in the facets registry — their history lives in the OCI registry

### Bad

* Each new source runtime increases the security audit and maintenance burden
* API surface hashing for source-mode requires the registry to start the server temporarily — adds publish-time processing cost
* Server authors who also want to ship companion text (skills about how to use their server) must publish a separate facet
* Ref-mode servers have no upgrade path through the facets system beyond re-resolving the tag — if the facet author changes the image reference, consumers get the new one on next facet upgrade

## More Information

* **Facets ADR-001**: Manifest schema — how facets reference servers in the `servers` section (string for source-mode, object for ref-mode)
* **Facets ADR-002**: Publish flow — facet publishing (separate from server publishing)
* **Facets ADR-003**: Install & resolve flow — how server references are resolved at install time
* **Facets ADR-004**: Integrity model — content hashing for source-mode, OCI digest pinning for ref-mode, API surface hashing for both
* **Facets SDR-002**: Tool execution model — strategic decision for source-mode and ref-mode
* **Facets SDR-003**: Dual distribution model — servers are versioned separately from text
