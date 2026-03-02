# @ex-machina/facets

[![npm](https://img.shields.io/npm/v/@ex-machina/facets)](https://www.npmjs.com/package/@ex-machina/facets)

Core library and CLI for discovering, installing, and managing facets — modular skills, agents, commands, and tools that extend AI coding assistants.

> **Status**: Early development (v0.1.0). APIs may change.

## CLI

```sh
Usage: facets <command> [options]

Commands:
  init                Set up project for facets
  list                List all facets and their status
  add <url>           Cache a remote facet by URL
  install [name]      Install a facet's resources
  remove <name>       Remove a facet
  update [name]       Update cached remote facets
  cache clear         Clear the global facet cache

Options:
  --help, -h          Show this help message
  --version, -v       Show version
```

## Library

The package also exports its core functions for programmatic use:

- **Registry** — `loadManifest`, `FacetManifestSchema`, `FacetsYamlSchema`, `FacetsLockSchema`
- **Discovery** — `listFacets`, `cacheFacet`, `updateFacet`, `updateAllFacets`, `clearCache`
- **Installation** — `installFacet`, `uninstallFacet`

## License

[MIT](../../LICENSE)
