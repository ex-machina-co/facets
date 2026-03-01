## ADDED Requirements

### Requirement: Installing a facet makes its resources active in the project
A developer SHALL be able to install a named facet, causing all of its declared resources to become active in OpenCode. The facet MUST be either local or cached before it can be installed.

#### Scenario: Local facet installed
- **WHEN** a developer installs a local facet
- **THEN** all of its declared resources SHALL be active in OpenCode

#### Scenario: Cached facet installed
- **WHEN** a developer installs a cached facet
- **THEN** all of its declared resources SHALL be active in OpenCode

#### Scenario: Installing a facet that is neither local nor cached fails
- **WHEN** a developer attempts to install a facet that is neither local nor cached
- **THEN** the system SHALL report an error and make no changes

### Requirement: User must explicitly approve prerequisite commands before they run
Before running any commands a facet declares as prerequisites, the system SHALL show the developer the full list of commands and MUST require explicit approval. The system SHALL NOT run any facet-declared command without this approval.

#### Scenario: Developer shown commands and approves
- **WHEN** a facet has prerequisites and the developer initiates installation
- **THEN** the system SHALL display each prerequisite command and ask for approval before running any of them

#### Scenario: Developer declines
- **WHEN** the developer does not approve the prerequisite commands
- **THEN** the system SHALL cancel installation and make no changes

#### Scenario: Prerequisites satisfied, installation completes
- **WHEN** the developer approves and all prerequisite checks pass
- **THEN** the facet SHALL be installed and the developer SHALL receive confirmation

#### Scenario: Prerequisite unsatisfied, installation aborted
- **WHEN** the developer approves but a prerequisite check fails
- **THEN** the system SHALL make no changes and SHALL tell the developer which prerequisite is missing

### Requirement: Prerequisite checks are not repeated automatically
Once a facet's prerequisites have been confirmed on a machine, the system SHALL NOT re-run those checks on subsequent installs unless the developer explicitly requests it.

#### Scenario: Subsequent install skips re-checking
- **WHEN** a facet's prerequisites were already confirmed on this machine
- **THEN** the system SHALL install the facet without prompting or re-running checks

#### Scenario: Developer can force a re-check
- **WHEN** a developer explicitly requests re-verification
- **THEN** the system SHALL show the commands, ask for approval, and re-run them
