## Purpose

The terminal CLI for bootstrapping and managing facets outside of an AI session.

## Requirements

### Requirement: Developer can set up a project for facets in one step
A developer SHALL be able to run a single command to register the facets MCP server with their OpenCode project and initialize the structure needed to start using facets.

#### Scenario: Project set up successfully
- **WHEN** a developer runs the setup command in a project
- **THEN** the system SHALL configure OpenCode to load the facets MCP server and create the necessary project structure

#### Scenario: Setup is safe to run more than once
- **WHEN** a developer runs the setup command on an already-configured project
- **THEN** the system SHALL make no changes and SHALL confirm the project is already set up

### Requirement: Developer can manage remote facets from the terminal
A developer SHALL be able to cache, uninstall, and update remote facets from the terminal, independent of any AI session.

#### Scenario: Remote facet cached
- **WHEN** a developer provides a remote facet URL from the terminal
- **THEN** the system SHALL cache the facet and add it to the project's dependencies

#### Scenario: Facet uninstalled and removed
- **WHEN** a developer removes a facet by name from the terminal
- **THEN** the facet SHALL be uninstalled, its cached files removed, and it SHALL be removed from the project's dependencies

#### Scenario: Cached facets updated
- **WHEN** a developer runs the update command
- **THEN** the system SHALL check all cached remote facets for newer versions and apply any available updates

### Requirement: Developer can clear the cache from the terminal
A developer SHALL be able to clear all cached facets from the terminal. This does not affect local facets or currently installed resources.

#### Scenario: Cache cleared from terminal
- **WHEN** a developer runs the cache clear command
- **THEN** all cached facets SHALL be removed

### Requirement: Developer can view facet status from the terminal
A developer SHALL be able to list all facets and their current status from the terminal at any time.

#### Scenario: Facet list printed
- **WHEN** a developer runs the list command
- **THEN** the system SHALL print a summary of all facets declared by the project with their name, version, and installed status
