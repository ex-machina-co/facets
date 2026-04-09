## Why

There is a friction gap between `facet create` (scaffolding) and `facet build` (packaging). Authors must manually edit `facet.json` to register new assets or remove stale ones before building. This is error-prone — authors forget to add new files, leave dangling references to deleted files, and get opaque validation errors from the build pipeline instead of actionable guidance. The authoring model should be "edit content files, let the CLI manage the manifest" — analogous to how package managers manage dependency manifests rather than requiring hand-editing.

## What Changes

- **`facet build` gains a reconciliation step before validation.** The command scans the project directory for `.md` files in conventional asset paths (`skills/`, `agents/`, `commands/`), compares what's on disk to what's declared in the manifest, and interactively prompts the author to resolve discrepancies (add new files, remove stale entries).
- **Manifest is updated on disk when reconciliation produces changes.** After the author confirms reconciliation decisions, the CLI writes the updated `facet.json` before proceeding to the existing validation and packaging pipeline.
- **`facet create` makes version and initial assets optional.** The create wizard currently requires version and at least one asset. Since `facet build` now reconciles assets from disk, authors can scaffold a minimal project (name + description) and add content files at their own pace. Version defaults to `0.1.0` when omitted.
- **CI/non-interactive mode fails on drift.** When running non-interactively (detected via `CI` env var or `--strict` flag), `facet build` MUST skip prompts and fail with a clear error listing all discrepancies. This ensures deterministic CI builds.
- **The existing validation pipeline is unchanged.** Reconciliation runs _before_ the current 6-stage pipeline (`loadManifest` → `resolvePrompts` → `validateCompactFacets` → `detectNamingCollisions` → `validatePlatformConfigs` → assemble archive). The pipeline itself is not modified.

## Non-goals

- **Automatic version bumping**: Detecting content changes and prompting for version increments is out of scope.
- **Text composition management**: The `facets` section (composed assets from other facets) is not reconciled — it requires registry access and is a publish-time concern.
- **Server reference management**: The `servers` section is not reconciled — server references are managed independently.
- **Auto-detecting descriptions from file content**: Extracting descriptions from `.md` frontmatter or headings is a potential future enhancement, not part of this change.

## Capabilities

### New Capabilities

- `reconciliation`: Disk-to-manifest drift detection and interactive resolution for text assets during the build workflow.

### Modified Capabilities

- `authoring__facets`: Build behavior changes to include a reconciliation step before validation. The create wizard makes version and initial assets optional. The system MUST scan disk, detect discrepancies, and either resolve them interactively or fail in strict mode before proceeding to the existing pipeline.

## Impact

- **`packages/core/src/build/`**: New reconciliation module(s) for disk scanning, diff computation, and manifest rewriting.
- **`packages/cli/src/commands/build.ts`** and **`packages/cli/src/tui/views/build/`**: New TUI components for interactive reconciliation prompts (add/remove/skip per asset).
- **`packages/cli/src/commands/create-scaffold.ts`** and **`packages/cli/src/commands/create-wizard.ts`**: Version and asset entries become optional in `CreateOptions` and the wizard flow.
- **`packages/core/src/schemas/facet-manifest.ts`**: No schema changes — `version` remains required. `facet create` defaults to `0.1.0` when the author omits it.
- **`packages/core/src/build/`**: New manifest write-back function for writing updated manifests to disk.
- **ADR-001** (manifest schema): No schema changes — reconciliation works within the existing schema. Manifest immutability applies to the published artifact, not the source file on disk. Reconciliation writes to `facet.json` as an authoring action before the pipeline runs — no conflict.
- **ADR-002** (publish flow): The local build phase gains a pre-pipeline reconciliation step before the existing step 1 (parse manifest). ADR-002 SHOULD be updated to document this (additive, not a conflict).
- **ADR-006** (manifest serialization): Reconciliation writes JSON per ADR-006.
- **Roadmap**: This work does not correspond to a specific roadmap phase. It is an orthogonal enhancement to Phase 2 (Local Authoring, status: `complete`) that improves the authoring experience independently of Phases 3–4.
- **SDR-003** (Dual Distribution Model): Directly addresses the identified risk that "build-time composition tooling is hard to use" — reconciliation makes the build workflow self-guiding rather than requiring manual manifest editing.
