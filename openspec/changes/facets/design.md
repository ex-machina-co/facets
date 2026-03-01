## Context

OpenCode has a native npm plugin mechanism for JS/TS tools, but no distribution story for the markdown-based resources (skills, agents, commands) that power most AI agent workflows. The community has filled this gap ad-hoc (plain GitHub repos, copy-paste) or via OCX, which uses a registry URL model and a "copy into your project" philosophy.

This project ports an existing in-repo bundle system (`.opencode/orig/`) into a standalone, publishable npm package with a manifest-based model, a lockfile for reproducibility, and an OpenCode plugin so agents can manage facets themselves.

Terminology used throughout this document follows `openspec/specs/TERMINOLOGY.md`: facets are **local** (in-repo), **cached** (downloaded from a remote URL), or **installed** (resources active in OpenCode). **Linked** facets (cross-project dev symlinks) are out of scope for v1.

## Goals / Non-Goals

**Goals:**
- Publish `@ex-machina/facets` as a usable npm package
- Support local facets and remote facets (cached from a URL, then installed)
- Provide both a CLI (for humans) and an OpenCode plugin (for agents)
- Never execute manifest-declared `requires` commands without explicit user consent

**Non-Goals:**
- A centralized facet registry — distribution is URL-based, no hosted registry in v1
- Semver range resolution — versions are pinned exactly, no `^` or `~` semantics
- Cross-platform adapters (Cursor, Windsurf, etc.) — OpenCode-only in v1
- Facet composition or dependency-between-facets
- Linked facets — cross-project local development workflows are v2+

## Facet Structure

A facet is a directory containing a `facet.yaml` manifest and resource files:

```
my-facet/
  facet.yaml
  prompts/
    my-agent.md       # prompt body only — plain prose, no frontmatter
    my-command.md
  skills/
    my-skill/
      SKILL.md        # agentskills.io format, installed as-is
  opencode/
    tools/
      my-tool.ts      # OpenCode-only; ignored by other platform installers
```

`prompts/` contains bare prompt bodies referenced by agents and commands. They are not full resource definitions — no frontmatter, no metadata. The `facet.yaml` manifest is the single source of truth for what each resource is and how it behaves.

The `facet.yaml` manifest declares the facet's identity and every resource it contains:

```yaml
name: my-facet
version: 1.0.0
description: What this facet does
author: Name <email>

# Shell commands checked before install. String or array. Never run automatically.
requires:
  - "gh --version"

# Installed as-is on all platforms that support the agentskills.io standard
skills:
  - my-skill

# Top-level for portable bits; platform sections for permissions/execution
agents:
  my-agent:
    description: Does a thing
    prompt: prompts/my-agent.md       # string = file path
    platforms:
      opencode:
        tools: {write: false}
      claude-code:
        tools: [Read, Edit, Bash]

# Auto-translated to platform-appropriate format on install
commands:
  my-command:
    description: What it does
    prompt: prompts/my-command.md

# OpenCode-only resources with no cross-platform equivalent
platforms:
  opencode:
    tools: [my-tool]
```

The `prompt` field accepts a string (file path) or an object with a `file` or `url` key:

```yaml
prompt: prompts/my-agent.md          # string → resolved as file path
prompt:
  file: prompts/my-agent.md          # explicit file reference
prompt:
  url: https://example.com/prompt    # remote fetch (future)
```

**Local facets** are tracked in version control alongside the project. **Cached facets** are downloaded from a remote URL and stored in a global machine-level cache — not inside the project. The structure of both is identical — a `facet.yaml` and resource subdirectories — so local and cached facets are interchangeable from the installer's perspective.

Storage paths:

- Local facets: platform-specific, in v1 `.opencode/facets/<name>/`
- Cached facets: global, at `~/.cache/facets/<name>/` (or the OS-appropriate equivalent via `XDG_CACHE_HOME`)

The global cache is shared across all projects on the machine — adding a remote facet in one project makes it available to install in any other project without re-fetching. When support for other platforms is added, local facet paths will vary by platform but the global cache location stays the same.

**Installing** a facet copies each declared resource to the location the target platform expects. For OpenCode (v1):

| Resource type | Source in facet | Installed to |
|---|---|---|
| `skills` | `skills/<name>/SKILL.md` | `.opencode/skills/<name>/SKILL.md` |
| `agents` | path from `prompt` field | `.opencode/agents/<name>.md` (with frontmatter added) |
| `commands` | path from `prompt` field | `.opencode/commands/<name>.md` (with frontmatter added) |
| `platforms.opencode.tools` | `opencode/tools/<name>.ts` | `.opencode/tools/<name>.ts` |

Install destination paths are owned by the platform installer, not the manifest. Future platform installers will produce different destination paths for the same facet resources.

Skills follow the agentskills.io directory convention and are copied verbatim. Agents and commands are assembled at install time — the installer combines the prompt body with platform-specific frontmatter (permissions, metadata) to produce the final resource file.

The project-level dependency file declares which facets the project depends on. In v1 this lives at `.opencode/facets.yaml` (OpenCode's config directory):

```yaml
remote:
  viper:
    url: https://example.com/facets/viper/facet.yaml
    version: "1.2.0"
local:
  - my-local-facet
```

The lockfile (`.opencode/facets.lock`) is auto-generated and pins resolved versions and integrity hashes for remote facets. It SHOULD be committed to version control for reproducibility. The lockfile path is also platform-specific in the same way.

## Decisions

### Manifest-based discovery over frontmatter tagging

The original system discovers resources via YAML frontmatter in each file (e.g., `facet: github-read`). This is convenient for single-repo use but breaks down for distribution — you can't ship a facet as a directory without also shipping every file's frontmatter convention.

The new model uses a standalone `facet.yaml` manifest that declares the facet's contents explicitly. This makes facets self-contained and distributable as a directory from any URL. Local facets live in the project repo; remote facets are cached locally after fetching.

### URL-based distribution over a hosted registry

Rather than building a registry (with auth, hosting, trust, maintenance), remote facets are referenced by the URL of their `facet.yaml`. Any git host, CDN, or static file server works. This is the simplest model that supports sharing and is analogous to how Nix flakes and some Homebrew taps work.

The trade-off: discoverability is weaker — there's no `search` command. Accepted for v1; a registry layer can be added later without changing the manifest format.

### The cache is global and opaque

The global cache (`~/.cache/facets/`) is a machine-level implementation detail — not a project concept. Following the npm/Bun model, users never think about whether something is "cached": they add remote facets (which silently caches them), install them, update them, or remove them. The cache just makes offline installs work.

The facet list shows what the project declares in `facets.yaml` and whether each is installed — not what happens to be in the global cache. Cache state is never surfaced in the list. The only explicit cache operation is `cache clear`, matching `bun pm cache rm`.

### Copy-into-project installation, not node_modules

Installing a facet copies its resources into the active OpenCode directories. Users own the installed files and can inspect or modify them. This matches OCX's approach and the existing `orig/` system.

The trade-off: updates must be explicitly pulled; there's no automatic "reinstall from lockfile" like npm. Accepted — the lockfile enables reproducibility without sacrificing transparency. Installing a facet that is neither local nor cached is an explicit error, not a silent network fetch.

### `requires` commands need explicit user consent, run once

Manifest-declared `requires` commands (e.g., `gh --version`) are a shell execution surface. Running them automatically on every list or install would be a significant attack vector if a facet manifest were compromised. Listing facets is always read-only — no commands are ever run during discovery.

The decision: `requires` commands are displayed to the user before any are run, require explicit approval, and are not re-run automatically after a successful check. The check result is remembered per-machine.

`requires` accepts a string or array:

```yaml
requires: "gh --version"           # single command
requires:
  - "gh --version"
  - "jq --version"
```

**Alternative considered**: skip prerequisite checks entirely and let installation always proceed. Rejected — surfacing missing prerequisites clearly is genuine user value, but only when run safely.

### Manifest format is cross-platform by design; v1 installer targets OpenCode only

The `facet.yaml` format is designed to describe resources for multiple platforms from day one, even though the v1 installer only targets OpenCode. This avoids a format-breaking migration when Claude Code or other platform support is added later.

**No neutral tool vocabulary.** Platform-specific execution metadata (tool permissions, step limits, permission modes) lives in `platforms:` sections within each agent descriptor. OpenCode and Claude Code use incompatible mental models — OpenCode is a capability deny-list (`{write: false}`), Claude Code is a named tool allowlist (`[Read, Edit, Bash]`). A neutral mapping between them would be lossy and require ongoing maintenance as platforms evolve. Platform sections are explicit and authoritative.

**Top-level descriptor for portable bits.** Agent `description` and `prompt` are genuinely the same across platforms and live at the top level of the agent entry. Only platform-specific bits (permissions, execution model) go in `platforms:` sections. This avoids duplicating content that is identical everywhere.

**Commands auto-translate on install.** OpenCode has a `commands/` resource type; Claude Code does not — but the semantic is representable as a skill with `disable-model-invocation: true`. This mapping is lossless (a user-invokable prompt is a user-invokable prompt). The installer handles the translation automatically; facet authors write commands once.

**Platform-specific resources live under `platforms.<name>`.** Custom tools (`.ts` files) are OpenCode-only and have no cross-platform equivalent. They live under `platforms.opencode.tools` in the manifest, making their platform-specificity explicit. This leaves room for future additions like `platforms.opencode.plugins` without restructuring the format.

### Single npm package with dual entry points

The plugin and CLI are shipped as one package with two entry points — one for the OpenCode plugin, one for the CLI binary. This simplifies versioning and distribution — one package to install, one version to track.

**Alternative considered**: separate CLI package. Rejected — unnecessary complexity for v1 given the small surface area.

## Risks / Trade-offs

- **Remote fetch trust** — caching a facet from an arbitrary URL and running its `requires` commands (after approval) is inherently a trust decision. The consent prompt mitigates silent execution, but users still need to trust the source URL. → Mitigation: show the full source URL prominently at cache-time and before any command execution.

- **Cache/installed divergence** — a user can modify installed resources directly (since they're copied, not symlinked). Those changes will be silently overwritten on next install. → Mitigation: document clearly that installed resources are managed files; user edits should be upstreamed to the facet source.

- **Stale cache** — a cached facet can diverge from its remote source if the URL serves different content at the same version. → Mitigation: the lockfile pins an integrity hash; re-caching re-checks the hash and warns on mismatch.

- **No semver ranges** — exact version pinning means no automatic patch updates. → Accepted trade-off for v1; the `update` command handles explicit upgrades.

## Open Questions

- Should the lockfile be committed to version control? (Probably yes, for reproducibility — but worth documenting the recommendation explicitly.)
- What happens when a remote URL becomes unavailable at install time? Should install fall back to the cache silently, or require an explicit `--offline` flag?
- Should local facets support a `version` field, or is versioning only meaningful for cached remote facets?
