# Facets Terminology

Canonical terms for the Facets ecosystem. All SDRs and ADRs (Facets OSS and Facet.cafe) should use these terms consistently.

## Core Concepts

| Term             | Definition                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Facet**        | The manifest (`facet.yaml`) + raw authored content. What the author creates locally, and what gets extracted and loaded after install. Bookends the authoring and consumption sides of the lifecycle. |
| **Bundle**       | The published, self-contained unit stored in the registry. Contains the manifest, all artifacts (local and composed), and integrity hashes. The transport form between publish and install. |
| **Artifact**     | A discrete unit of content within a bundle — a skill, an agent prompt, a command prompt, or an MCP server reference. Artifacts can be locally authored or composed from other facets. |
| **MCP server**   | An artifact type containing code (not text). Published independently from facets, versioned independently, resolved at install time. Two execution modes: source-mode and ref-mode. Use "servers" as shorthand after first use in a document. |
| **Text artifact** | An artifact containing text — a skill, an agent prompt, or a command prompt. Distinguishes text content from code content (MCP servers). |

## Execution Modes

| Term              | Definition                                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Source-mode**   | MCP server execution mode where source code is published to the registry and run using a managed runtime. Always hyphenated. |
| **Ref-mode**      | MCP server execution mode where the facet manifest references an OCI container image. Always hyphenated.                |

Do not use: `OCI-mode`, `source mode` (unhyphenated), `ref mode` (unhyphenated).

## Version Constraints

| Term                 | Definition                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Floor constraint** | The version constraint mechanism for source-mode MCP servers. Declares a minimum acceptable version; the CLI resolves to the latest at or above the floor at install time. |
| **Floor version**    | The specific minimum version value declared in a floor constraint (e.g., `"1.0.0"`).                         |

Use "floor-only" as an adjective when describing the constraint type (e.g., "floor-only constraints, no upper bounds"). Do not use: `floor-only version constraint` (verbose), `floor-constrained`, `minimum version`.

## Integrity

| Term                  | Definition                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Content hash**      | A SHA-256 hash of a published artifact (bundle or server artifact). Verifies that downloaded bytes match what was published. |
| **Content hashing**   | The process of computing and verifying content hashes.                                                        |
| **API surface hash**  | A SHA-256 hash of an MCP server's tool declarations (names, descriptions, parameters, schemas). Detects structural breaking changes between versions. |
| **OCI digest**        | An immutable content hash for a container image. Used to pin ref-mode MCP servers in the lockfile.            |

Use "integrity" when referring to the verification process ("integrity verification"), not as a synonym for the hash itself. Do not use: `integrity hash`, `content integrity hash`.

## Lifecycle

| Stage         | What exists                                                          |
| ------------- | -------------------------------------------------------------------- |
| **Authoring** | A facet — manifest + raw content in a local directory.               |
| **Publishing** | The facet is built into a bundle — artifacts assembled, hashes computed, stored in registry. |
| **Installing** | The bundle is downloaded, verified, extracted. Text artifacts are placed locally. MCP server references are resolved. The result is a facet ready to load. |
| **Running**   | The installed facet is loaded by the AI assistant. Text artifacts are in context. MCP servers are running processes. |
