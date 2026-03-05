---
status: proposed
date: 2026-03-05
decision-makers: julian
---

# ADR-001: Facet Manifest Schema

## Status History

| status   | date       | decision-makers | github |
| -------- | ---------- | --------------- | ------ |
| proposed | 2026-03-05 | julian          |        |

## Context and Problem Statement

A facet is a distributable unit of AI assistant configuration. It contains text components — skills, agents, and commands — that are consumed by an LLM. A facet may also reference MCP servers, which are a separate artifact type containing executable code.

The manifest (`facet.yaml`) is the source of truth for what a facet contains, what other facets it draws from, and which MCP servers it needs. The current manifest schema supports basic components but lacks:

- Text composition from other facets (reusing skills, agents, commands)
- MCP server references (servers are a separate artifact type, not part of the facet)
- A clean separation between text (facet content) and code (MCP servers)

This ADR defines the manifest schema at the spec level — what fields exist, what they mean, and how they relate to composition and server references.

## Decision Drivers

* Facets are text. MCP servers are code. These are separate artifact types with different distribution models (Facets SDR-003).
* Text composition must be resolved before the artifact reaches the registry — pull components from other facets, bundle them into the artifact (Facets SDR-003).
* Source-mode MCP server references must use floor-only version constraints, resolved at install time. Ref-mode servers are OCI image references resolved to digests at install time (Facets SDR-003, ADR-005).
* The manifest must be immutable — the build and publish process does not modify it.
* Platform-agnostic by default, with platform-specific extensions for agent configuration (Facets SDR-001).
* The schema must be forward-compatible — structural choices should not prevent future extensions (selective server activation, server composition, etc.).

## Decision Outcome

The facet manifest (`facet.yaml`) has the following structure:

### Example

```yaml
name: acme-dev
version: 1.0.0
description: "Acme org developer toolkit"
author: acme-org

skills: [code-standards, pr-template]

agents:
  reviewer:
    description: "Org code reviewer"
    prompt: { file: agents/reviewer.md }
    platforms:
      opencode:
        tools: { grep: true, bash: true }

commands:
  review:
    description: "Run a code review"
    prompt: { file: commands/review.md }

facets:
  - "code-review-base@1.0.0"
  - name: typescript-patterns
    version: "2.1.0"
    skills: [ts-conventions, any-usage]

servers:
  jira: "1.0.0"
  github: "2.3.0"
  "@acme/deploy": "0.5.0"
  slack:
    image: "ghcr.io/acme/slack-bot:v2"
```

### Sections

**Identity:**

| Field         | Required | Description                   |
| ------------- | -------- | ----------------------------- |
| `name`        | Yes      | Facet name. Non-empty string. |
| `version`     | Yes      | Semver version string.        |
| `description` | No       | Human-readable description.   |
| `author`      | No       | Author name or identifier.    |

**Text components** — locally authored content included in the facet:

| Field      | Required | Description                                                                  |
| ---------- | -------- | ---------------------------------------------------------------------------- |
| `skills`   | No       | Array of skill names. Each corresponds to a file in the facet.               |
| `agents`   | No       | Map of agent name → agent descriptor (description, prompt, platform config). |
| `commands` | No       | Map of command name → command descriptor (description, prompt).              |

**`facets`** — text composed from other facets. Each entry is either a compact string or a selective object.

Compact form (take all text components from the referenced facet):
```yaml
facets:
  - "code-review-base@1.0.0"
```

Selective form (cherry-pick specific components):
```yaml
facets:
  - name: typescript-patterns
    version: "2.1.0"
    skills: [ts-conventions]
    agents: [baseline-reviewer]
    commands: [lint-check]
```

| Field      | Context   | Required | Description                                          |
| ---------- | --------- | -------- | ---------------------------------------------------- |
| (string)   | Compact   | —        | `"name@version"` — compose all text from this facet. |
| `name`     | Selective | Yes      | Source facet name.                                    |
| `version`  | Selective | Yes      | Exact version to compose from.                       |
| `skills`   | Selective | No       | Array of skill names to include.                     |
| `agents`   | Selective | No       | Array of agent names to include.                     |
| `commands` | Selective | No       | Array of command names to include.                   |

Composition is resolved before the artifact reaches the registry. The `facets` section serves as both the composition directive and the attribution record — it documents exactly where composed content came from. The manifest itself is never modified; the build process reads it, resolves composition sources, and bundles the composed files alongside local files into the artifact.

**`servers`** — MCP server references. MCP servers are a separate artifact type from facets. The `servers` section declares which servers this facet needs. There are two forms depending on the server's execution mode:

**Source-mode** (server published to the facets registry): string value is a floor version constraint.
```yaml
servers:
  jira: "1.0.0"
  "@acme/deploy": "0.5.0"
```

**Ref-mode** (OCI container image): object value with an `image` field referencing an OCI image.
```yaml
servers:
  slack:
    image: "ghcr.io/acme/slack-bot:v2"
```

| Key         | Value type | Description                                                                    |
| ----------- | ---------- | ------------------------------------------------------------------------------ |
| server name | string     | Source-mode: floor version — minimum acceptable version (e.g., `"1.0.0"`).     |
| server name | object     | Ref-mode: `image` field with an OCI image reference (tag or digest).           |

**Source-mode resolution:** Server versions are resolved at install time to the latest version at or above the floor. The lockfile pins the exact resolved version and integrity hash.

**Ref-mode resolution:** At install time, if the image reference uses a tag (`:v2`), the CLI resolves it to a digest and pins the digest in the lockfile. If the reference is already a digest (`@sha256:abc123`), it is used as-is. Tags follow standard OCI convention — `:` for tags, `@` for digests.

`facet upgrade` checks for newer versions of both source-mode and ref-mode servers. For source-mode, it resolves the latest above the floor. For ref-mode, it re-resolves the tag to check for a newer digest.

**Agent descriptor:**

| Field         | Required | Description                                                            |
| ------------- | -------- | ---------------------------------------------------------------------- |
| `description` | No       | Human-readable description of the agent.                               |
| `prompt`      | Yes      | The agent's prompt — a string, `{ file: path }`, or `{ url: url }`.   |
| `platforms`   | No       | Map of platform name → platform-specific agent config (tools, etc.).   |

Agents are partially platform-specific. The prompt is portable across AI assistants. Platform-specific wiring (tool access, permissions, model preferences) lives under `platforms`. Authors target the platforms they care about.

The CLI validates platform config against known platform schemas at build and publish time. At install time, platform config is composed into the agent's platform-native format (e.g., YAML frontmatter). The set of known platforms and their schemas is maintained by the CLI, not the manifest spec.

**Command descriptor:**

| Field         | Required | Description                                                            |
| ------------- | -------- | ---------------------------------------------------------------------- |
| `description` | No       | Human-readable description of the command.                             |
| `prompt`      | Yes      | The command's prompt — a string, `{ file: path }`, or `{ url: url }`. |

### Key Properties

1. **The manifest is immutable.** The build and publish process does not modify the manifest. It reads the manifest, resolves composition sources, bundles the composed files into the artifact, and includes the manifest as-is. The `facets` section is both the composition directive and the attribution record.

2. **Facets and MCP servers are separate artifact types.** A facet contains text (skills, agents, commands). An MCP server contains code. They are published independently, versioned independently, and stored separately in the registry. The `servers` section in a facet manifest is a reference to server artifacts, not a declaration of embedded code.

3. **Text composition is exact-pinned.** The `facets` section pins exact versions (`"name@1.0.0"`) because composition is a copy operation resolved before publish. The composed text is frozen at that version in the bundle. This is safe because stale text is safe (SDR-003).

4. **Server references are floor-constrained.** The `servers` section declares minimum versions. The CLI resolves to the latest at or above the floor at install time. This ensures MCP servers can be updated for security fixes without requiring the facet author to re-publish (SDR-003).

5. **The schema is forward-compatible.** The `servers` map values are strings today but can become objects in the future (e.g., selective server activation). The `facets` selective form uses component-type keys (`skills`, `agents`, `commands`) that can be extended if new component types are added. No structural change made today prevents future extensions.

### Constraints

1. A facet must have at least one text component — either locally authored or composed from other facets.
2. `facets` entries with the selective form must include at least one component type (`skills`, `agents`, or `commands`).
3. Composed component names must not collide with locally-authored component names. Collisions are detected at build time and are an error.
4. The `facets` compact form uses `@` as the version separator: `"name@version"`. Scoped names use the `@scope/name@version` pattern.

## Consequences

### Good

* Single file describes everything about a facet — contents, composition sources, server needs
* Clean separation between text (facet content) and code (MCP server references)
* The manifest doubles as an attribution record — `facets` section shows provenance of composed content
* Immutable manifest means what you write is what gets published — no surprising transformations
* Forward-compatible schema allows future extensions without breaking changes

### Neutral

* Two entry forms in `facets` (compact string, selective object) add minor complexity
* Authors must understand the facet/server separation — servers are referenced, not embedded

### Bad

* The `@` symbol is overloaded — used for both scoping (`@acme/tool`) and version pinning (`name@1.0.0`). Scoped + versioned is `@acme/tool@1.0.0` which has two `@` symbols. Reads fine but may trip up parsers that split naively on `@`.
* No mechanism to declare that a composed facet's text is specifically about using a particular MCP server — the semantic link between a skill and a server is implicit, not declared.

## More Information

* **Facets SDR-001**: Platform-agnostic positioning — agents use `platforms` for cross-platform support
* **Facets SDR-002**: Tool execution model — defines source and ref modes for MCP servers
* **Facets SDR-003**: Dual distribution model — bundle text at publish time, version MCP servers separately
* **Facets ADR-002**: Publish flow — how `facets` composition is resolved and the bundle is created
* **Facets ADR-003**: Install & resolve flow — how `servers` references are resolved at install time
* **Facets ADR-005**: MCP server artifact — the server artifact type that `servers` references
