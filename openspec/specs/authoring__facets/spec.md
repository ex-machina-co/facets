## Purpose

A facet author writes a `facet.yaml` to declare their facet's identity, text assets, composed facets, and server references. The system validates and loads this manifest so authors get fast, clear feedback when something is wrong, and downstream tools get a reliable typed representation of the manifest.

## Requirements

### Requirement: Valid facet manifests are accepted

The system SHALL accept a `facet.yaml` that conforms to the manifest schema. A valid manifest has a name, a version, and at least one text asset (skills, agents, commands, or composed facets). All three text asset types — skills, agents, and commands — use the same descriptor model: a map of asset name to a descriptor with a prompt reference and optional metadata. Skill descriptors SHALL require a description — consumers need to know what a skill does to decide whether to use it.

#### Scenario: Minimal valid manifest with a skill

- **WHEN** an author provides a manifest with a name, version, and a single skill descriptor that includes a description and prompt reference
- **THEN** the system SHALL accept the manifest

#### Scenario: Manifest with all sections

- **WHEN** an author provides a manifest with identity fields, skill descriptors with prompts, agent descriptors with prompts, command descriptors with prompts, composed facets, and server references
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

After validation, the system SHALL resolve all prompt fields in skills, agents, and commands to their string content. Inline strings are used as-is. File-based prompt references are read relative to the facet root directory. Resolution failures SHALL identify which asset's prompt failed and why.

#### Scenario: File-based prompt is resolved

- **WHEN** an asset's prompt references an external file and that file exists
- **THEN** the system SHALL resolve the prompt to the file's content

#### Scenario: Missing file reports an error

- **WHEN** an asset's prompt references a file that does not exist
- **THEN** the system SHALL return an error identifying the asset and the missing file

### Requirement: Authors can scaffold a new facet project interactively

The system SHALL provide an interactive wizard that guides the author through creating a new facet project. The wizard SHALL prompt for the facet's name, version, description, and which asset types to include (skills, agents, commands). Upon completion, the system SHALL create a project directory containing a valid manifest and starter files for each selected asset type, with each starter file containing commented template content that guides authors on what belongs in each section.

The scaffolded project SHALL be immediately buildable — running the build command on a freshly scaffolded project SHALL succeed with no errors.

#### Scenario: Author scaffolds a project with skills and agents

- **WHEN** the author runs the create wizard and provides a name, version, and selects skills and agents
- **THEN** the system SHALL create a project directory containing a manifest with the provided identity fields, skill descriptors referencing starter skill files, and agent descriptors referencing starter agent files
- **AND** the manifest SHALL reference all starter files correctly

#### Scenario: Author scaffolds a minimal project with one skill

- **WHEN** the author runs the create wizard and provides only a name and version, selecting only skills
- **THEN** the system SHALL create a project directory containing a manifest and a single starter skill file
- **AND** the manifest SHALL pass validation

#### Scenario: Author cancels the wizard

- **WHEN** the author cancels the create wizard before completion
- **THEN** the system SHALL not create any files or directories
- **AND** the system SHALL display a cancellation message

#### Scenario: Target directory already contains a manifest

- **WHEN** the author runs the create wizard and a manifest already exists in the target directory
- **THEN** the system SHALL warn the author and ask for confirmation before overwriting

### Requirement: Authors can build a facet locally for validation and inspection

The system SHALL compile a facet project into a build output directory. The build command SHALL read the manifest, validate it, verify that every declared asset file exists, resolve all file-based prompts to their content, run all validation checks, and write the resolved output to a `dist/` directory. The build output SHALL contain the manifest and all text asset files with prompts resolved to their final string content.

#### Scenario: Successful build of a valid facet

- **WHEN** the author runs the build command in a directory with a valid manifest and all referenced files exist
- **THEN** the system SHALL write the resolved manifest and all text asset files to `dist/`
- **AND** all file-based prompts SHALL be resolved to their string content in the output

#### Scenario: Build fails on invalid manifest

- **WHEN** the author runs the build command and the manifest fails schema validation
- **THEN** the system SHALL report the validation errors
- **AND** the system SHALL NOT write any output to `dist/`

#### Scenario: Build fails on missing asset file

- **WHEN** the author runs the build command and any asset (skill, agent, or command) references a file that does not exist
- **THEN** the system SHALL report which file is missing and which asset references it
- **AND** the system SHALL NOT write any output to `dist/`

#### Scenario: Build with no manifest

- **WHEN** the author runs the build command in a directory with no manifest
- **THEN** the system SHALL report that no manifest was found
- **AND** the system SHALL NOT write any output to `dist/`

#### Scenario: Build cleans previous output

- **WHEN** the author runs the build command and a `dist/` directory already exists from a previous build
- **THEN** the system SHALL remove the previous `dist/` directory before writing new output

### Requirement: Build detects naming collisions between local assets

The system SHALL detect when the same name is used across different asset types within a single facet. Skills, agents, and commands share a namespace — if an author declares a skill and a command with the same name, this is a naming collision. Collisions SHALL cause the build to fail with an error identifying the conflicting names and their asset types.

#### Scenario: Skill and command share a name

- **WHEN** a facet declares a skill and a command with the same name
- **THEN** the build SHALL fail
- **AND** the error SHALL identify the name as a collision between skill and command

#### Scenario: No collisions across distinct names

- **WHEN** a facet declares assets with distinct names across all asset types
- **THEN** the build SHALL succeed with no collision errors

### Requirement: Build validates platform configuration for assets

The system SHALL validate `platforms` entries on any asset that declares them during build. The set of known platforms and their expected configuration is maintained by the system. Invalid configuration for a known platform SHALL cause the build to fail. Unknown platform names SHALL produce a warning but SHALL NOT cause the build to fail.

#### Scenario: Valid platform config for a known platform

- **WHEN** an asset declares platform configuration for a known platform with valid configuration
- **THEN** the build SHALL accept the platform configuration

#### Scenario: Invalid platform config for a known platform

- **WHEN** an asset declares platform configuration for a known platform with configuration that violates the expected shape
- **THEN** the build SHALL fail
- **AND** the error SHALL identify the asset, the platform, and what is invalid

#### Scenario: Unknown platform name produces a warning

- **WHEN** an asset declares platform configuration for an unknown platform
- **THEN** the build SHALL succeed
- **AND** the system SHALL emit a warning that the platform is not known

### Requirement: Build validates the facets section structurally without resolving composition

The system SHALL validate the `facets` section of the manifest for structural correctness during build. Compact entries SHALL conform to the expected name-and-version format. Selective entries SHALL include at least one asset type. The system SHALL NOT attempt to resolve or fetch composed facets during build — composition resolution is deferred to a future phase.

#### Scenario: Valid compact facets entry

- **WHEN** the manifest includes a compact facets entry with a name and version
- **THEN** the build SHALL accept the entry

#### Scenario: Malformed compact facets entry

- **WHEN** the manifest includes a compact facets entry that does not conform to the expected format
- **THEN** the build SHALL fail
- **AND** the error SHALL indicate the expected format

#### Scenario: Facets section is not resolved during build

- **WHEN** the manifest includes facets entries referencing other facets
- **THEN** the build SHALL validate the entries structurally
- **AND** the build SHALL NOT attempt to fetch or include composed files in the output
