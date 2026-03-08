## Step Types

- **Verify** → CHECK. Run automated checks (tests, lint, type checks).
  If all checks pass, proceed. If anything fails, STOP and notify the user.
- **Implement** → WRITE. Make code changes — create, edit, or delete files.
- **Propose** → READ-ONLY + USER GATE. Show the user intended changes and ask for approval
  using the `question` tool. Do not write anything. Do not proceed until the user approves.
- **Explore** → READ-ONLY. Read files, search the codebase, investigate broadly.
  No writes allowed. Use this to understand the problem space before acting.
- **Review** → READ-ONLY + USER GATE. Analyze what was done or found, present findings
  to the user, and wait for feedback before proceeding.

## 1. Project scaffolding and shared types

- [ ] 1.1 Explore: Read the existing `packages/facets/` structure and ArkType API docs to understand available schema primitives (type inference, unions, object schemas, custom constraints)
- [ ] 1.2 Propose: Present the module layout, shared types (`ValidationError`, result type), and ArkType schema approach for user approval
- [ ] 1.3 Implement: Create directory structure (`schemas/`, `loaders/`), shared types file (`types.ts`), and stub `index.ts`
- [ ] 1.4 Verify: Run type-check to confirm the scaffolding compiles

## 2. Facet manifest schema

- [ ] 2.1 Implement: Create `packages/facets/src/schemas/facet-manifest.ts` — ArkType schema for the full facet manifest (identity, skills, agents with prompt union, commands with prompt union, facets entry union, servers entry union) with inferred `FacetManifest` type. Include custom validation: at least one text asset required, selective facets entries must select at least one asset type
- [ ] 2.2 Implement: Write tests for facet manifest schema — valid manifests (minimal with skill, full manifest, composed-only), invalid manifests (missing name, missing version, no text assets, agent missing prompt, selective facets with no selections, server object missing image), and unknown field pass-through at top level and nested
- [ ] 2.3 Verify: Run tests and type-check for the facet manifest schema

## 3. Server manifest schema

- [ ] 3.1 Implement: Create `packages/facets/src/schemas/server-manifest.ts` — ArkType schema for the server manifest (name, version, runtime, entry, optional description/author) with inferred `ServerManifest` type
- [ ] 3.2 Implement: Write tests for server manifest schema — valid manifests (minimal, with optionals), invalid manifests (missing runtime, missing entry, wrong field type), and unknown field pass-through
- [ ] 3.3 Verify: Run tests and type-check for the server manifest schema

## 4. Lockfile schema

- [ ] 4.1 Implement: Create `packages/facets/src/schemas/lockfile.ts` — ArkType schema for the lockfile (facet identity with integrity, optional servers map with source-mode and ref-mode entry unions) with inferred `Lockfile` type
- [ ] 4.2 Implement: Write tests for lockfile schema — valid lockfiles (with source-mode servers, ref-mode servers, mixed, no servers), invalid lockfiles (missing facet integrity, incomplete source-mode entry, ref-mode missing digest), and unknown field pass-through
- [ ] 4.3 Verify: Run tests and type-check for the lockfile schema

## 5. Facet manifest loader

- [ ] 5.1 Implement: Create `packages/facets/src/loaders/facet.ts` — implement `loadManifest(dir: string)` that reads `facet.yaml`, parses YAML, validates against schema, maps ArkErrors to `ValidationError[]`, handles file-not-found and YAML syntax errors, returns discriminated result type
- [ ] 5.2 Implement: Implement `resolvePrompts(manifest, rootDir)` in the same file — walks agents and commands, resolves `{file: path}` prompts to file content relative to rootDir, returns new manifest with all prompts as strings, reports errors identifying the agent/command name and missing file path
- [ ] 5.3 Implement: Write tests for facet loader — successful load from disk, file not found, malformed YAML, schema validation errors with correct paths, prompt resolution for file-based and inline prompts, missing prompt file error
- [ ] 5.4 Verify: Run tests and type-check for the facet loader

## 6. Server manifest loader

- [ ] 6.1 Implement: Create `packages/facets/src/loaders/server.ts` — implement `loadServerManifest(dir: string)` that reads `server.yaml`, parses YAML, validates against schema, reuses ArkErrors-to-ValidationError mapping (extract to shared utility), handles file-not-found and YAML syntax errors, returns discriminated result type
- [ ] 6.2 Implement: Write tests for server loader — successful load, file not found, malformed YAML, validation errors
- [ ] 6.3 Verify: Run tests and type-check for the server loader

## 7. Public API and final verification

- [ ] 7.1 Implement: Update `packages/facets/src/index.ts` to export the public API — schemas, inferred types (`FacetManifest`, `ServerManifest`, `Lockfile`), loader functions (`loadManifest`, `loadServerManifest`), `resolvePrompts`, `ValidationError`, and the result type
- [ ] 7.2 Verify: Run full test suite and type-check (`bun check`) to verify everything passes
- [ ] 7.3 Review: Present final module structure, public API surface, and test coverage summary to the user
