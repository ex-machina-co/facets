## Context

`facet build` currently runs a 6-stage pipeline: load manifest → resolve prompts → validate compact facets → detect naming collisions → validate platform configs → assemble archive. The pipeline is strictly read-only — it reads `facet.json` and `.md` files, validates them, and produces `dist/` output. There is no mechanism to detect or resolve discrepancies between the manifest and what exists on disk.

`facet create` currently requires `name`, `version`, `description`, and at least one asset type. It scaffolds the project directory with `facet.json` and template `.md` files.

Between create and build, authors must manually edit `facet.json` to add or remove assets. This is the friction gap that reconciliation addresses.

### ADR Alignment

ADR-001 (manifest schema) and ADR-002 (publish flow) both state that the manifest is immutable. This immutability applies to the **published artifact** — once the build pipeline computes content hashes and assembles the archive, the manifest included in the archive is frozen. The constraint is about the build/publish pipeline not silently transforming the manifest, not about the source file on disk being read-only.

Reconciliation writes to `facet.json` on disk as an authoring action — the same as the author editing the file by hand. The build pipeline then reads the manifest, hashes it, and packages it as-is. There is no conflict with ADR-001 or ADR-002.

ADR-002 describes the build pipeline steps (parse → resolve composition → validate platform config → validate server refs → package). Reconciliation runs before step 1. The ADR SHOULD be updated to document reconciliation as a pre-pipeline phase, but this is an additive documentation update — not a conflict that blocks implementation.

ADR-006 (manifest serialization) has no conflicts. Reconciliation writes JSON using `JSON.stringify(data, null, 2)`, consistent with the existing codebase.

## Goals / Non-Goals

**Goals:**

- Make `facet build` the primary authoring command by detecting and resolving manifest-vs-disk drift before the existing pipeline runs
- Keep the existing 6-stage build pipeline unchanged except for directory-form skill resolution in `resolvePrompts` — reconciliation is a new pre-pipeline phase
- Support CI/non-interactive builds via `--strict` flag or `CI` env var
- Simplify `facet create` by making version and initial assets optional
- Validate asset content (empty files, YAML frontmatter) as part of the reconciliation phase

**Non-Goals:**

- Rename detection (treat as independent add + remove)
- Recursive directory scanning beyond one level (except the `skills/<name>/SKILL.md` pattern)
- Non-`.md` asset file support
- `facets` composition reconciliation
- `servers` reference reconciliation
- Automatic version bumping
- Auto-detecting descriptions from file content

## Decisions

### 1. Reconciliation is a pre-pipeline phase, not a pipeline modification

**Decision:** Reconciliation runs as a distinct phase before the existing build pipeline. It scans disk, compares to the manifest, prompts the author, writes `facet.json`, and then hands off to the unchanged pipeline.

**Rationale:** The existing pipeline is well-tested (98 tests), well-structured (fail-fast stages with progress callbacks), and has clear separation of concerns. Inserting reconciliation logic into the pipeline would couple authoring concerns with validation concerns. Keeping it as a pre-pipeline phase means the pipeline's contract ("given a valid manifest and files on disk, produce a build") remains untouched.

**One targeted pipeline change:** `resolvePrompts` in the core loader MUST be updated to support the `skills/<name>/SKILL.md` directory form as a fallback when `skills/<name>.md` does not exist. This is a ~5-line change to `resolveAssetPrompt` — check the flat path first, fall back to the directory form for skills only. Agents and commands remain flat-only. This is the sole pipeline modification; all other pipeline stages are unchanged.

**Alternative considered:** Modifying `resolvePrompts` to handle missing files interactively. Rejected because it conflates validation (detecting problems) with authoring (fixing them), and because `resolvePrompts` runs inside the core package which has no UI dependencies.

### 2. Three-phase reconciliation ordering

**Decision:** Reconciliation runs in three ordered phases:

1. **Phase A — Extras** (files on disk not in manifest): prompt to add, collect description
2. **Phase B — Validation** (matched assets): check for missing descriptions, empty content, YAML frontmatter
3. **Phase C — Missing** (manifest entries with no file on disk): prompt to remove or create template

**Rationale:** Missing file resolution is terminal — if the author chooses "create template," the build MUST exit because the template needs manual editing before it can be built. By running missing last, all non-terminal work (extras and validation) is completed and written to disk before any terminal exit. This means the author gets maximum value from each build invocation even when it can't complete.

Note that extras added during Phase A become matched entries in the manifest, so Phase B validates all matched entries including those just added.

**Alternative considered:** Running missing first (so authors see the most serious problems first). Rejected because it would discard the work done in the extras and validation phases if the build exits early.

### 3. Core package owns scan and diff logic; CLI package owns interactive prompts

**Decision:** The core package (`@ex-machina/facet-core`) provides:
- `scanProjectDir(rootDir)` — returns a disk manifest (what `.md` files exist in conventional paths)
- `computeDrift(diskManifest, facetManifest)` — returns `{ extras, missing, matched }` per asset type
- `writeManifest(manifest, filePath)` — JSON serialization with 2-space indent
- `validateAssetContent(filePath)` — checks for empty content and YAML frontmatter

The CLI package (`@ex-machina/facet`) provides:
- Interactive TUI components for reconciliation prompts
- Strict mode logic (detect `CI` env var or `--strict` flag, fail on any drift)

**Rationale:** Core is headless and reusable. It MUST NOT have UI dependencies (Ink, React, readline). The scan/diff/write operations are pure logic. The CLI is the only consumer that presents interactive prompts. This separation also means the core's scan and diff functions are independently testable.

**Alternative considered:** Putting everything in the CLI package. Rejected because the scan and diff logic is business logic, not presentation logic. Other consumers (e.g., a future LSP server, a programmatic API) should be able to detect drift without pulling in Ink.

### 4. Disk scanning: flat files plus skills directory form

**Decision:** The scanner checks three conventional directories:

| Directory    | Patterns                                                      |
| ------------ | ------------------------------------------------------------- |
| `skills/`    | `skills/<name>.md` (flat) and `skills/<name>/SKILL.md` (directory form) |
| `agents/`    | `agents/<name>.md` (flat only)                                |
| `commands/`  | `commands/<name>.md` (flat only)                              |

If both `skills/<name>.md` and `skills/<name>/SKILL.md` exist for the same `<name>`, this is a hard error.

**Rationale:** The `skills/<name>/SKILL.md` directory form is the agentskills.io convention and is widely used. Supporting it in the scanner means authors using that convention get reconciliation for free. Agents and commands do not have an equivalent directory convention, so they stay flat-only. The collision between both forms for the same name is a hard error because there is no safe automatic resolution — the author must choose which form to use.

**Alternative considered:** Supporting `<type>/<name>/<TYPE>.md` for all three types (e.g., `agents/reviewer/AGENT.md`). Rejected as over-engineering — there's no established convention for this outside of skills.

### 5. `facet build` without a manifest runs create, then exits

**Decision:** When `facet build` is invoked and no `facet.json` exists, it reuses the create wizard's scaffolding logic (shared functions, not a command-calls-command dependency), then exits with a message: "Created facet.json — run `facet build` again."

**Rationale:** Making create terminal (rather than flowing directly into build) eliminates an entire class of edge cases around the create→reconcile transition. After create runs, the manifest and disk are guaranteed to be in sync (create writes both). The next `facet build` invocation starts clean with a valid manifest. This is the simplest UX that works — we can optimize later if the two-step flow feels cumbersome.

**Alternative considered:** Running create and then continuing directly into build. Rejected because it adds complexity (what if create scaffolds templates the user hasn't filled in yet?) and the two-step flow is a safe default.

### 6. `facet create` pre-discovers existing files

**Decision:** When `facet create` runs in a directory that already contains `.md` files in conventional paths (`skills/`, `agents/`, `commands/`), it discovers them and presents them as selectable checkboxes in the wizard. The author can accept/reject found files and scaffold new ones.

**Rationale:** This makes `facet create` useful for existing projects, not just greenfield. An author who has been writing `.md` files without a manifest can run `facet create` and have their files pre-loaded into the wizard. Combined with version and assets being optional, the minimal create flow becomes: provide a name and description → select discovered files → done.

### 7. Content validation as part of reconciliation

**Decision:** During Phase B (matched asset validation), the reconciliation phase checks:
- File MUST NOT be empty or whitespace-only
- File MUST NOT start with YAML frontmatter (`---\n...\n---`)
- Manifest entry MUST have a `description` field

In interactive mode, missing descriptions are recoverable — the user is prompted to provide one. Empty files and frontmatter issues are non-recoverable errors collected and reported all at once. In strict mode, all validation issues (including missing descriptions) are non-recoverable errors.

**Rationale:** Frontmatter is managed by platform tooling at install time — it is not authored content. Detecting it early (before the build pipeline) gives the author a clear message rather than a confusing build error. Missing descriptions are caught here rather than at schema validation time because reconciliation can interactively prompt for them, turning a hard error into a recoverable flow.

**Alternative considered:** Leaving content validation to the existing pipeline's `resolvePrompts` stage. Rejected because `resolvePrompts` only checks file existence, not content quality. Adding content checks there would require changes to the pipeline, which we want to leave unchanged.

### 8. Strict mode for CI

**Decision:** When the `CI` environment variable is set (truthy) or the `--strict` flag is passed, reconciliation runs in non-interactive mode: scan disk, compute drift, and if ANY discrepancy exists (extras, missing, validation issues), fail with exit code 1 and a complete listing of all issues. No prompts, no manifest writes.

**Rationale:** CI builds MUST be deterministic. Interactive prompts in CI are a fatal UX error. The `CI` env var is a widely-adopted convention (GitHub Actions, GitLab CI, CircleCI, Travis all set it). The `--strict` flag provides an explicit opt-in for local usage. Both paths produce identical behavior.

## Risks / Trade-offs

**[Risk] Reconciliation + validation conflation** → Reconciliation (authoring) and content validation (quality checks) are conceptually different concerns running in the same phase. This could make the code harder to reason about. Mitigation: keep them as separate functions called in sequence, even though they share the "pre-pipeline" phase.

**[Risk] Manifest write-back loses formatting** → `JSON.stringify` output may differ from the author's original key ordering or whitespace. This is acceptable — ADR-006 explicitly chose JSON for its machine-authoring properties, and the manifest is CLI-managed.

**[Risk] YAML frontmatter false positive** → A markdown file starting with `---` as a horizontal rule (not frontmatter) could be flagged as invalid. Mitigation: YAML frontmatter detection requires `---\n` at the very start of the file (byte position 0) followed by a closing `---\n`. A horizontal rule after any content would not trigger this. The false positive risk is minimal and acceptable for v1.

**[Trade-off] Create is terminal, not flowing into build** → Authors must run two commands (`facet create` then `facet build`) instead of one. This is a deliberate simplicity trade-off. The terminal approach eliminates edge cases and can be optimized later.

**[Trade-off] No rename detection** → Authors who rename a file must answer two prompts (remove old, add new) instead of one (confirm rename). This is acceptable for v1 — rename detection adds significant complexity (fuzzy matching, edit distance) for a marginal UX improvement.

## Documentation Updates Required

### Major rewrites
- `docs/cli/build.md` — Add reconciliation step, `--strict` flag, CI mode, new exit codes
- `docs/cli/create.md` — Version and assets now optional, pre-discovery of existing files

### Moderate updates
- `docs/specification/publish.mdx` — Insert reconciliation as step 0 in build flow, update build vs. publish table
- `docs/specification/terminology.mdx` — Add "reconciliation," "drift," and "strict mode" terms
- `architecture/TERMINOLOGY.md` — Add same three terms (canonical internal source)

### Minor updates
- `docs/specification/architecture.mdx` — Update authoring lifecycle description
- `docs/specification/index.mdx` — Update lifecycle table authoring/publishing rows
- `docs/cli.mdx` — Update `facet build` description in common commands
- `docs/cli/index.md` — Update card descriptions for build and create
- `docs/docs.json` — Add missing `cli/create` to navigation group (existing bug)
- `architecture/002-publish-flow.md` — Document reconciliation as a pre-pipeline phase (additive update)

## Resolved Questions

- **`version` optionality**: The ArkType schema keeps `version` as required. `facet create` defaults to `0.1.0` when the author omits it. This avoids any pipeline changes for handling missing versions.
