## Purpose

Content hashing provides integrity guarantees for facet artifacts. At build time, the system computes SHA-256 content hashes at two levels — per-asset (for fine-grained change detection) and per-archive (for content integrity). The build assembles a deterministic tar archive, computes the integrity hash from the uncompressed tar bytes, compresses it for delivery, and records all hashes in a build manifest.

## Requirements

### Requirement: Content hashes are computed for individual text assets

The system SHALL compute a SHA-256 content hash for each resolved text asset (skills, agents, commands) and for the facet manifest. Each hash SHALL be computed from the file's resolved string content encoded as UTF-8. The hash format SHALL be `sha256:<hex-encoded hash>` (per ADR-004).

#### Scenario: Per-asset hashes computed during build

- **WHEN** a facet is built successfully with two skills and one agent
- **THEN** the build output SHALL include a content hash for each of the two skill files, the agent file, and the facet manifest
- **AND** each hash SHALL be in `sha256:<hex>` format

#### Scenario: Identical content produces identical hashes

- **WHEN** two assets contain identical resolved content
- **THEN** their content hashes SHALL be identical

#### Scenario: Any content change produces a different hash

- **WHEN** an asset's resolved content changes by even a single character
- **THEN** the content hash SHALL differ from the previous hash

### Requirement: Build output is assembled into a compressed archive

The system SHALL assemble all resolved build output into a single compressed archive file. The archive SHALL contain the facet manifest and all resolved text asset files. The archive SHALL be a gzip-compressed tar with the extension `.facet`. The archive filename SHALL follow the pattern `<name>-<version>.facet` where `name` and `version` come from the facet manifest.

#### Scenario: Successful build produces a .facet archive

- **WHEN** a facet named "example-facet" at version "1.0.0" is built successfully
- **THEN** the system SHALL write `dist/example-facet-1.0.0.facet`
- **AND** the archive SHALL contain the facet manifest and all resolved text asset files

#### Scenario: Archive contains all declared assets

- **WHEN** a facet with two skills, one agent, and one command is built
- **THEN** the archive SHALL contain the facet manifest, two skill files, the agent file, and the command file

#### Scenario: Archive does not contain extraneous files

- **WHEN** a facet is built
- **THEN** the archive SHALL contain only the facet manifest and resolved text assets
- **AND** the archive SHALL NOT contain the build manifest or any other metadata files

### Requirement: Archive assembly is deterministic

The system SHALL produce identical archive bytes from identical inputs. Archive entries SHALL be sorted lexicographically by path. File metadata within the archive (timestamps, ownership, permissions) SHALL be set to fixed values so that they do not vary across builds or platforms.

#### Scenario: Rebuilding the same facet produces identical bytes

- **WHEN** a facet is built twice without changing any source files
- **THEN** the two archive files SHALL be byte-identical

#### Scenario: Build determinism is platform-independent

- **WHEN** the same facet source is built on different operating systems
- **THEN** the uncompressed tar archive SHALL be byte-identical
- **AND** the integrity hash SHALL be identical across platforms

#### Scenario: Archive entry ordering is stable

- **WHEN** a facet with assets named "b-agent", "a-skill", and "c-command" is built
- **THEN** the archive entries SHALL be sorted lexicographically by their path within the archive

### Requirement: An integrity hash is computed for the uncompressed tar archive

The system SHALL compute a SHA-256 content hash of the uncompressed tar archive bytes. The hash SHALL be computed from the deterministic tar before compression is applied. The hash format SHALL be `sha256:<hex-encoded hash>` (per ADR-004). This integrity hash is the primary integrity value for the artifact. Compression is a delivery concern — hashing the uncompressed tar ensures integrity verification is independent of the compression algorithm.

#### Scenario: Integrity hash is computed from uncompressed tar bytes

- **WHEN** a facet is built successfully
- **THEN** the system SHALL compute the SHA-256 hash of the uncompressed tar archive bytes (before gzip compression)
- **AND** the hash SHALL be in `sha256:<hex>` format

#### Scenario: Integrity hash changes when any asset changes

- **WHEN** any source asset's content changes
- **THEN** the integrity hash SHALL differ from the previous build's integrity hash

### Requirement: A build manifest records content hashes

The system SHALL write a build manifest file named `build-manifest.json` to the `dist/` directory alongside the archive. The manifest SHALL contain a `facetVersion` field (integer, currently `1`), the archive filename, the integrity hash, and a map of per-asset content hashes keyed by relative path within the archive. The manifest SHALL be a flat JSON object.

#### Scenario: Build manifest is written on successful build

- **WHEN** a facet is built successfully
- **THEN** the system SHALL write `dist/build-manifest.json`
- **AND** the manifest SHALL contain a `facetVersion` field set to `1`
- **AND** the manifest SHALL contain an `archive` field with the archive filename
- **AND** the manifest SHALL contain an `integrity` field with the integrity hash
- **AND** the manifest SHALL contain an `assets` object mapping relative paths to content hashes

#### Scenario: Build manifest integrity hash matches actual archive contents

- **WHEN** a consumer reads `build-manifest.json`, decompresses the `.facet` file, and hashes the resulting tar bytes
- **THEN** the computed hash SHALL match the `integrity` value in the manifest

#### Scenario: Build manifest asset hashes match archive contents

- **WHEN** a consumer extracts the archive and hashes each individual file
- **THEN** each computed hash SHALL match the corresponding entry in the manifest's `assets` map

#### Scenario: Build manifest points to the correct archive filename

- **WHEN** a facet named "my-facet" at version "2.1.0" is built
- **THEN** the manifest's `archive` field SHALL be `my-facet-2.1.0.facet`

### Requirement: Build output contains only the archive and manifest

The `dist/` directory SHALL contain exactly the compressed archive and the build manifest after a successful build. The system SHALL NOT write loose resolved asset files or manifest copies to `dist/`. The archive is the single distributable artifact; the build manifest is metadata about the archive.

#### Scenario: dist/ contains exactly two files

- **WHEN** a facet is built successfully
- **THEN** `dist/` SHALL contain exactly the `.facet` archive file and `build-manifest.json`
- **AND** `dist/` SHALL NOT contain loose facet manifest, `skills/`, `agents/`, or `commands/` files

#### Scenario: Previous build output is cleaned

- **WHEN** a facet is rebuilt and the previous `dist/` directory contains loose files from an older build format
- **THEN** the system SHALL remove the previous `dist/` contents before writing the new archive and manifest

### Requirement: Integrity hash information is displayed in build output

The system SHALL display the integrity hash to the author after a successful build. The build progress display SHALL show the archive assembly as a visible stage. After completion, the system SHALL list the contents of the archive and display the integrity hash. The plain-text summary printed to stdout SHALL include the integrity hash.

#### Scenario: Build displays integrity hash on success

- **WHEN** a facet is built successfully
- **THEN** the system SHALL display the integrity hash in `sha256:<hex>` format
- **AND** the system SHALL list the files contained in the archive

#### Scenario: Stdout summary includes integrity hash

- **WHEN** a facet named "my-facet" at version "1.0.0" with 3 assets is built successfully
- **THEN** the stdout summary SHALL include the facet name, version, asset count, and a truncated integrity hash

#### Scenario: Build progress shows archive assembly stage

- **WHEN** a facet build is in progress
- **THEN** the build progress display SHALL show an archive assembly stage alongside the existing validation and output stages
