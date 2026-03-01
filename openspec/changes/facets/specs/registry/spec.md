## ADDED Requirements

### Requirement: Facet authors can declare a distributable resource collection
A facet author SHALL be able to define a named, versioned collection of OpenCode resources (skills, agents, commands, tools) in a single manifest file. The manifest MUST include a name and version.

#### Scenario: Valid manifest is accepted
- **WHEN** a developer provides a manifest with a name, version, and resource entries
- **THEN** the system SHALL accept and use the manifest

#### Scenario: Manifest missing required fields is rejected
- **WHEN** a manifest omits the name or version
- **THEN** the system SHALL reject it with a descriptive error identifying what is missing

#### Scenario: Manifest with unrecognized fields is tolerated
- **WHEN** a manifest contains fields the system does not recognize
- **THEN** the system SHALL accept the manifest, ignoring the unrecognized fields

### Requirement: Facet authors can declare prerequisites
A facet author MAY declare prerequisites that a developer's machine must satisfy before the facet can be installed. Prerequisites are informational until the developer initiates installation.

#### Scenario: Prerequisites visible to developer
- **WHEN** a developer views a facet's details
- **THEN** the system SHALL show any declared prerequisites so the developer knows what is required before installing

### Requirement: Developers can declare project facet dependencies
A developer SHALL be able to declare which facets their project depends on — both local and remote (by URL) — in a project-level dependency file.

#### Scenario: Local dependency declared
- **WHEN** a developer declares a local facet dependency
- **THEN** the system SHALL resolve it from the project's local facets

#### Scenario: Remote dependency declared with version
- **WHEN** a developer declares a remote facet dependency with a source URL and version
- **THEN** the system SHALL use the declared version when caching the facet

### Requirement: Facet dependencies are reproducibly pinned
The system SHALL maintain a lockfile that records the exact resolved version and an integrity hash for every remote facet dependency. Installing from the same lockfile on any machine MUST produce identical results.

#### Scenario: Lockfile updated when remote dependency added
- **WHEN** a developer adds a new remote facet dependency
- **THEN** the system SHALL record the resolved version and integrity hash in the lockfile

#### Scenario: Install honours the lockfile
- **WHEN** a developer installs facets from an existing lockfile
- **THEN** the system SHALL use the exact pinned versions, not newer ones
