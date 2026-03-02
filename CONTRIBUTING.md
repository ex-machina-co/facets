# Contributing

Thanks for your interest in contributing to Facets! This guide will help you get set up.

## Prerequisites

- [Bun](https://bun.sh) v1.3.10+

## Setup

```sh
git clone <repo-url>
cd facets
bun install
```

## Scripts

| Command          | Description                                                       |
| ---------------- | ----------------------------------------------------------------- |
| `bun check`      | Lint + typecheck + build + test (run this before submitting a PR) |
| `bun run lint`   | Biome lint only                                                   |
| `bun run format` | Biome auto-fix and format                                         |
| `bun run test`   | Run tests                                                         |
| `bun run types`  | Typecheck only                                                    |
| `bun run build`  | Build only                                                        |

## Pull Requests

- Keep PRs focused on a single change
- Run `bun check` before submitting — CI runs the same command
- Add a changeset with `bun changeset` for any user-facing changes
