## ADDED Requirements

### Requirement: AI agents can discover available facets
An AI agent in an OpenCode session SHALL be able to retrieve the list of all facets declared by the project — local and remote — including whether each is currently installed.

#### Scenario: Agent receives facet list
- **WHEN** an AI agent requests the facet list
- **THEN** the system SHALL return all facets declared by the project with their name, version, description, and installed status

### Requirement: AI agents can install a facet
An AI agent SHALL be able to install a named facet on behalf of the developer, making its resources active in the project.

#### Scenario: Facet installed successfully
- **WHEN** an AI agent requests installation of a local or cached facet
- **THEN** the facet SHALL be installed and the agent SHALL receive confirmation

#### Scenario: Failure reason returned to agent
- **WHEN** installation cannot complete
- **THEN** the system SHALL return a clear reason so the agent can inform the developer

### Requirement: AI agents can cache a remote facet
An AI agent SHALL be able to cache a remote facet by URL, making it available to install without further network access.

#### Scenario: Remote facet cached
- **WHEN** an AI agent provides a valid remote facet URL
- **THEN** the system SHALL cache the facet and confirm the name and version resolved

### Requirement: AI agents can update a cached remote facet
An AI agent SHALL be able to check for and apply updates to a cached remote facet.

#### Scenario: Update applied
- **WHEN** an AI agent requests an update and a newer version is available
- **THEN** the system SHALL cache the updated version and report the new version to the agent

#### Scenario: Already up to date
- **WHEN** an AI agent requests an update and no newer version exists
- **THEN** the system SHALL report that the facet is already current

### Requirement: AI agents can remove a facet
An AI agent SHALL be able to remove a facet from the project, uninstalling its resources and removing it from the project's dependencies.

#### Scenario: Facet removed
- **WHEN** an AI agent requests removal of a known facet
- **THEN** the facet SHALL be uninstalled and the agent SHALL receive confirmation
