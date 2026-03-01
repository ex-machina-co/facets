# Terminology

This document defines the canonical terms used across all specs in this project. All specifications MUST use these terms consistently.

---

## Facet States

### Local
A facet defined within the project's own repository. Local facets are always available without any network access and are tracked in version control alongside the project.

### Cached
A remote facet that has been downloaded and stored on the machine for offline use. The cache is an implementation detail — users do not need to think about it during normal use, but can clear it when needed.

### Installed
A facet whose resources (skills, agents, commands, tools) have been copied into the active OpenCode directories where OpenCode reads them. A facet must be either local or cached before it can be installed.

### Linked
_(Planned — not available in v1)_
A locally-developed facet from another directory on the machine, referenced directly without copying. Analogous to `bun link` / `npm link`. Intended for cross-project facet development workflows.

---

## Lifecycle

```
remote URL → cached → installed → resources active in OpenCode
local facet          → installed → resources active in OpenCode
```

A facet can be cached without being installed. Installing a facet that is not yet cached or local is an error.
