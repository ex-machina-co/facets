## Purpose

A facet author writes a `facet.yaml` to declare their facet's identity, text assets, composed facets, and server references. The system validates and loads this manifest so authors get fast, clear feedback when something is wrong, and downstream tools get a reliable typed representation of the manifest.

## Requirements

### Requirement: Valid facet manifests are accepted

The system SHALL accept a `facet.yaml` that conforms to the manifest schema defined in ADR-001. A valid manifest has a name, a version, and at least one text asset (skills, agents, commands, or composed facets).

#### Scenario: Minimal valid manifest with a skill

- **WHEN** an author provides a manifest with `name`, `version`, and `skills: [code-review]`
- **THEN** the system SHALL accept the manifest

#### Scenario: Manifest with all sections

- **WHEN** an author provides a manifest with identity fields, skills, agents with prompts, commands, composed facets, and server references
- **THEN** the system SHALL accept the manifest

#### Scenario: Manifest with only composed facets is valid

- **WHEN** an author provides a manifest with `name`, `version`, and a `facets` section but no local skills, agents, or commands
- **THEN** the system SHALL accept the manifest

### Requirement: Invalid facet manifests are rejected with actionable errors

The system SHALL reject a `facet.yaml` that does not conform to the manifest schema. Each error SHALL identify the location of the problem (field path) and describe what was expected, so the author can fix it without guessing.

#### Scenario: Missing required identity field

- **WHEN** an author provides a manifest without a `name` or `version` field
- **THEN** the system SHALL reject the manifest
- **AND** the error SHALL identify which required field is missing

#### Scenario: No text assets

- **WHEN** an author provides a manifest with identity fields and server references but no skills, agents, commands, or composed facets
- **THEN** the system SHALL reject the manifest
- **AND** the error SHALL indicate that at least one text asset is required

#### Scenario: Agent missing its prompt

- **WHEN** an author defines an agent without a `prompt` field
- **THEN** the system SHALL reject the manifest
- **AND** the error SHALL identify the agent by name and the missing field

#### Scenario: Selective facets entry with no asset selection

- **WHEN** an author writes a selective facets entry with `name` and `version` but no `skills`, `agents`, or `commands`
- **THEN** the system SHALL reject the manifest
- **AND** the error SHALL indicate that at least one asset type must be selected

#### Scenario: Server reference object without image field

- **WHEN** an author writes a server reference as an object but omits the `image` field
- **THEN** the system SHALL reject the manifest
- **AND** the error SHALL identify the server by name

### Requirement: Unrecognized fields are tolerated

The system SHALL accept manifests containing fields not defined in the current schema. Unrecognized fields SHALL be preserved, not stripped or rejected. This ensures manifests authored against a newer schema version remain loadable by older tooling.

#### Scenario: Top-level unknown field

- **WHEN** an author includes a field not defined in the schema (e.g., `license: "MIT"`)
- **THEN** the system SHALL accept the manifest
- **AND** the field SHALL be present in the loaded result

#### Scenario: Unknown field nested in a descriptor

- **WHEN** an agent descriptor includes a field not defined in the schema
- **THEN** the system SHALL accept the manifest
- **AND** the field SHALL be present in the loaded result

### Requirement: Facet manifests are loaded from disk

The system SHALL load a facet manifest by reading `facet.yaml` from a specified directory. YAML syntax errors and schema validation errors SHALL both be reported through a unified error interface so callers handle one error shape regardless of failure stage.

#### Scenario: Successful load

- **WHEN** a valid `facet.yaml` exists in the specified directory
- **THEN** the system SHALL return the validated manifest data

#### Scenario: File not found

- **WHEN** no `facet.yaml` exists in the specified directory
- **THEN** the system SHALL return an error indicating the file was not found

#### Scenario: Malformed YAML

- **WHEN** the `facet.yaml` contains invalid YAML syntax
- **THEN** the system SHALL return an error indicating a syntax problem

### Requirement: Prompt references are resolved to content

After validation, the system SHALL resolve all prompt fields in agents and commands to their string content. Inline strings are used as-is. File references (`{file: path}`) are read relative to the facet root directory. Resolution failures SHALL identify which prompt failed and why.

#### Scenario: File-based prompt is resolved

- **WHEN** an agent's prompt is `{ file: agents/reviewer.md }` and the file exists
- **THEN** the system SHALL resolve the prompt to the file's content

#### Scenario: Missing file reports an error

- **WHEN** an agent's prompt references a file that does not exist
- **THEN** the system SHALL return an error identifying the agent and the missing file
