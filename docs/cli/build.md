---
title: facet build
sidebarTitle: ' '
description: Build a facet from the current directory
tag: facet build
---

## Usage

```sh
facet build [directory]
```

Validates and builds the facet in the specified directory (defaults to the current directory).

## What it does

The build command runs a validation pipeline and produces distributable output:

1. **Load manifest** — reads `facet.yaml`, parses YAML, validates against the schema, checks business-rule constraints (at least one text asset, etc.)
2. **Resolve prompts** — reads all file-based prompt references for skills, agents, and commands. If a referenced file doesn't exist, the build fails with an error identifying the asset and the missing file.
3. **Validate compact facets** — checks that compact entries in the `facets` section match the `name@version` format.
4. **Detect naming collisions** — fails if the same name is used across different asset types (e.g., a skill and a command both named "review").
5. **Validate platform config** — validates platform configuration for known platforms (e.g., `opencode`, `claude-code`). Unknown platforms produce a warning but do not fail the build.

On success, the build writes output to `dist/`:

- `dist/facet.yaml` — the manifest, copied unmodified
- `dist/skills/<name>.md` — resolved skill prompt files
- `dist/agents/<name>.md` — resolved agent prompt files
- `dist/commands/<name>.md` — resolved command prompt files

## Exit codes

| Code | Meaning |
| ---- | ------- |
| `0`  | Build succeeded |
| `1`  | Build failed (validation errors) |
