## ADDED Requirements

### Requirement: Developer can see all facets declared by their project
A developer SHALL be able to retrieve a list of all facets declared by their project — local facets and remote facets listed in the dependency file — including each facet's name, version, description, and whether it is currently installed.

#### Scenario: Local and remote facets both shown
- **WHEN** a developer requests the facet list
- **THEN** the system SHALL include all local facets and all remote facets declared in the project's dependency file

#### Scenario: Install status reported per facet
- **WHEN** a developer requests the facet list
- **THEN** each facet SHALL indicate whether it is currently installed

#### Scenario: No facets declared
- **WHEN** no facets are declared by the project
- **THEN** the system SHALL return an empty list without error

### Requirement: Listing facets never runs any commands
Retrieving the facet list SHALL NOT execute any commands. It MUST be a read-only operation that only inspects what is already present on disk.

#### Scenario: List is read-only
- **WHEN** a developer requests the facet list
- **THEN** the system SHALL return results without executing any commands from any facet

#### Scenario: Prerequisites shown as declared metadata only
- **WHEN** a facet declares prerequisites
- **THEN** the list SHALL show them as informational metadata — not as a live pass/fail check

### Requirement: Developers can cache a remote facet for local use
A developer SHALL be able to cache a remote facet by URL, making it available to install without network access at install time.

#### Scenario: Remote facet cached successfully
- **WHEN** a developer adds a remote facet by URL
- **THEN** the facet SHALL be available to install offline

#### Scenario: Relative resource references resolved correctly
- **WHEN** a remote facet references resources by relative path
- **THEN** the system SHALL resolve those paths correctly against the facet's source location when caching

### Requirement: Developer can clear the cache
A developer SHALL be able to clear all cached facets from the machine. This does not affect local facets or currently installed resources.

#### Scenario: Cache cleared
- **WHEN** a developer clears the cache
- **THEN** all cached facets SHALL be removed from the machine
