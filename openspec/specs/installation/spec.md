## Purpose

The lockfile (`facets.lock`) records the exact resolved state of an installed facet so that installations are reproducible across machines and environments. This spec defines what a valid lockfile contains. Install and upgrade flows are future work.

## Requirements

### Requirement: Lockfile captures the installed facet's identity and integrity

The lockfile SHALL record the installed facet's name, version, and content integrity hash. A lockfile missing any of these SHALL be rejected.

#### Scenario: Valid facet section

- **WHEN** a lockfile contains a facet name, version, and integrity hash
- **THEN** the system SHALL accept the lockfile

#### Scenario: Missing integrity hash

- **WHEN** a lockfile's facet section omits the integrity hash
- **THEN** the system SHALL reject the lockfile

### Requirement: Lockfile captures source-mode server resolution

For each source-mode server, the lockfile SHALL record the resolved version, content integrity hash, and API surface hash. All three are necessary — the version identifies what was installed, the integrity hash verifies it hasn't been tampered with, and the API surface hash enables breaking-change detection during upgrades.

#### Scenario: Valid source-mode server entry

- **WHEN** a lockfile server entry has a resolved version, integrity hash, and API surface hash
- **THEN** the system SHALL accept the entry

#### Scenario: Incomplete source-mode server entry

- **WHEN** a lockfile server entry has a version but is missing its integrity or API surface hash
- **THEN** the system SHALL reject the lockfile

### Requirement: Lockfile captures ref-mode server resolution

For each ref-mode server, the lockfile SHALL record the original OCI image reference, the resolved OCI digest, and the API surface hash. Both the image reference and digest are necessary because OCI tags are mutable — the digest pins the exact image for reproducibility while the image reference preserves the original tag for upgrade resolution.

#### Scenario: Valid ref-mode server entry

- **WHEN** a lockfile server entry has an image reference, resolved digest, and API surface hash
- **THEN** the system SHALL accept the entry

#### Scenario: Missing digest

- **WHEN** a lockfile server entry has an image reference but no resolved digest
- **THEN** the system SHALL reject the lockfile

### Requirement: Lockfile without servers is valid

A facet that references no servers SHALL produce a valid lockfile with only the facet identity section. The servers section SHALL be optional.

#### Scenario: Facet with no servers

- **WHEN** a lockfile contains a valid facet section and no servers section
- **THEN** the system SHALL accept the lockfile

### Requirement: Unrecognized fields are tolerated

The system SHALL accept lockfiles containing fields not defined in the current schema. Unrecognized fields SHALL be preserved, not stripped or rejected.

#### Scenario: Unknown field in lockfile

- **WHEN** a lockfile contains a field not defined in the schema (e.g., `generatedAt: "2026-03-08"`)
- **THEN** the system SHALL accept the lockfile
- **AND** the field SHALL be present in the loaded result
