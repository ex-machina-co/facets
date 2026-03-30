---
title: facet create
sidebarTitle: ' '
description: Create a new facet project interactively
tag: facet create
---

## Usage

```sh
facet create [directory]
```

Creates a new facet project in the specified directory (defaults to the current directory). Walks through an interactive wizard to configure the facet.

## Wizard flow

1. **Existing manifest check** — if `facet.json` already exists, prompts for confirmation before overwriting.
2. **Name** — the facet name, in kebab-case (e.g., `my-facet`).
3. **Version** — defaults to `0.1.0`.
4. **Description** — optional.
5. **Asset types** — select which asset types to include: skills, agents, commands. At least one is required.
6. **Confirmation** — review the summary and confirm.

## Generated files

On confirmation, the wizard writes:

- `facet.json` — the manifest with named asset descriptors
- `skills/<name>.md` — starter skill template for each named skill
- `agents/<name>.md` — starter agent template for each named agent
- `commands/<name>.md` — starter command template for each named command

After creating the project, run `facet build` to validate it.

## Exit codes

| Code | Meaning |
| ---- | ------- |
| `0`  | Facet created successfully |
| `1`  | Cancelled or invalid input |
