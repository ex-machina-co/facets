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

The system SHALL provide an interactive wizard that guides the author through creating a new facet project. The wizard SHALL collect the following required information:

- **Name**: A valid kebab-case facet name. The system SHALL validate the name in real-time and reject invalid input.
- **Description**: A non-empty description. The system SHALL NOT allow the author to complete the wizard without providing a description.
- **Version**: A valid SemVer version (N.N.N format). The system SHALL provide a sensible default (0.1.0) that the author can accept or change.

The wizard SHALL also allow the author to manage assets (skills, commands, and agents):

- The author SHALL be able to add multiple named assets of any type
- The author SHALL be able to edit the name of an existing asset
- The author SHALL be able to remove an existing asset
- All asset names SHALL be validated as kebab-case in real-time
- Asset names SHALL be unique within their type — the system SHALL reject duplicates within the same asset type
- Assets of different types MAY share the same name
- The first asset added to each type SHOULD default its name to the facet name as a suggestion

The wizard SHALL NOT allow the author to complete without at least one asset (skill, command, or agent).

All fields SHALL remain editable throughout the wizard — the author SHALL be able to go back and change any previously entered value.

Before completing, the wizard SHALL display a confirmation summary showing only the asset types that have entries and a preview of the files to be created. The author SHALL be able to confirm or go back.

The wizard SHALL provide an exit confirmation mechanism that prevents accidental loss of unsaved work.

Upon confirmation, the system SHALL create a project directory containing a valid manifest and named starter files for each asset the author specified, with each starter file containing template content that guides authors on what belongs in each section.

The scaffolded project SHALL be immediately buildable — running the build command on a freshly scaffolded project SHALL succeed with no errors.

#### Scenario: Author scaffolds a project with named skills

- **WHEN** the author runs the create wizard, provides a name "viper-plans" and description "VIPER planning tools", and adds two skills named "viper-planning" and "viper-execution-rules"
- **THEN** the system SHALL create a project directory containing a manifest with the provided identity fields and skill descriptors
- **AND** starter files SHALL be created for each named skill
- **AND** the manifest SHALL reference all starter files correctly

#### Scenario: Author scaffolds a minimal project accepting the default skill name

- **WHEN** the author runs the create wizard, provides a name "code-review" and a description, then adds a skill accepting the default name suggestion
- **THEN** the system SHALL create a project with a skill named "code-review" (matching the facet name)

#### Scenario: Author cannot complete without a description

- **WHEN** the author attempts to complete the wizard without providing a description
- **THEN** the system SHALL NOT allow completion
- **AND** the system SHALL indicate that a description is required

#### Scenario: Author cannot complete without at least one asset

- **WHEN** the author has not added any skills, agents, or commands
- **THEN** the completion action SHALL be unavailable

#### Scenario: Asset names are validated as kebab-case

- **WHEN** the author enters an asset name containing uppercase letters, spaces, or underscores
- **THEN** the system SHALL indicate the name is invalid
- **AND** the system SHALL NOT accept the invalid name

#### Scenario: Duplicate asset names within a type are rejected

- **WHEN** the author attempts to add a skill with the same name as an existing skill
- **THEN** the system SHALL reject the duplicate name

#### Scenario: Same name across different asset types is allowed

- **WHEN** the author adds a skill named "viper-plans" and an agent named "viper-plans"
- **THEN** the system SHALL accept both assets without error

#### Scenario: Author edits an existing asset name

- **WHEN** the author selects an existing asset and changes its name to a valid, unique kebab-case name
- **THEN** the system SHALL update the asset name

#### Scenario: Author removes an asset

- **WHEN** the author removes a previously added asset
- **THEN** the asset SHALL no longer appear in the wizard or the confirmation summary
- **AND** if no assets remain, the completion action SHALL become unavailable

#### Scenario: Author exits the wizard with unsaved work

- **WHEN** the author triggers an exit action during the wizard
- **THEN** the system SHALL confirm the author's intent to exit
- **AND** if the author confirms exit, the system SHALL not create any files or directories

#### Scenario: Version field accepts valid SemVer input

- **WHEN** the author sets the version to a valid SemVer value (e.g., "1.0.0" or "100.2.1")
- **THEN** the system SHALL accept the version

#### Scenario: Version field rejects invalid input

- **WHEN** the author enters a version that does not match the N.N.N pattern
- **THEN** the system SHALL indicate the version is invalid

#### Scenario: Target directory already contains a manifest

- **WHEN** the author runs the create wizard and a manifest already exists in the target directory
- **THEN** the system SHALL warn the author and ask for confirmation before overwriting

### Requirement: Authors can build a facet locally for validation and inspection

The system SHALL compile a facet project into a build output directory. The build command SHALL read the manifest, validate it, verify that every declared asset file exists, resolve all file-based prompts to their content, run all validation checks, assemble the resolved output into a deterministic compressed archive, compute content hashes, and write the archive and build manifest to a `dist/` directory. The build output SHALL contain a compressed archive (`.facet` file) with the manifest and all text asset files with prompts resolved to their final string content, and a build manifest (`build-manifest.json`) recording content hashes.

The build command SHALL render its progress as a step-by-step display, showing each pipeline stage as it completes — including the archive assembly stage. On success, the system SHALL display the archive contents listing and the archive content hash. On failure, the system SHALL indicate which stage failed and display errors with their field paths. After the display exits, the system SHALL print a brief plain-text summary to stdout — including the content hash — so it persists in terminal scroll-back.

#### Scenario: Successful build of a valid facet

- **WHEN** the author runs the build command in a directory with a valid manifest and all referenced files exist
- **THEN** the system SHALL write a compressed archive and build manifest to `dist/`
- **AND** the archive SHALL contain the facet manifest and all text asset files with prompts resolved to their string content
- **AND** the build manifest SHALL contain the archive content hash and per-asset content hashes
- **AND** the system SHALL display the archive contents and content hash
- **AND** the system SHALL print a brief success summary to stdout including the content hash

#### Scenario: Build fails on invalid manifest

- **WHEN** the author runs the build command and the manifest fails schema validation
- **THEN** the system SHALL report the validation errors with field paths
- **AND** the system SHALL NOT write any output to `dist/`

#### Scenario: Build fails on missing asset file

- **WHEN** the author runs the build command and any asset references a file that does not exist
- **THEN** the system SHALL report which file is missing and which asset references it
- **AND** the system SHALL NOT write any output to `dist/`

#### Scenario: Build with no manifest

- **WHEN** the author runs the build command in a directory with no manifest
- **THEN** the system SHALL report that no manifest was found

#### Scenario: Build cleans previous output

- **WHEN** the author runs the build command and a `dist/` directory already exists from a previous build
- **THEN** the system SHALL remove the previous `dist/` directory before writing new output

### Requirement: Build detects naming collisions between local assets

The system SHALL detect when the same name is used by multiple assets within the same asset type. Skills SHALL have unique names within the skills section, agents SHALL have unique names within the agents section, and commands SHALL have unique names within the commands section. Assets of different types MAY share the same name — cross-type collisions SHALL NOT be treated as errors. Intra-type collisions SHALL cause the build to fail with an error identifying the conflicting names and their asset type.

#### Scenario: Two skills share a name

- **WHEN** a facet declares two skills with the same name
- **THEN** the build SHALL fail
- **AND** the error SHALL identify the collision within the skills section

#### Scenario: Skill and command share a name

- **WHEN** a facet declares a skill and a command with the same name
- **THEN** the build SHALL succeed with no collision errors

#### Scenario: Skill and agent share a name

- **WHEN** a facet declares a skill and an agent with the same name
- **THEN** the build SHALL succeed with no collision errors

#### Scenario: No collisions across distinct names within each type

- **WHEN** a facet declares assets with distinct names within each asset type
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
