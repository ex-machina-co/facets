// Registry — schemas and loaders

export { type CacheResult, cacheFacet, type UpdateResult, updateAllFacets, updateFacet } from './discovery/cache.ts'
export { clearCache } from './discovery/clear.ts'
// Discovery — list, cache, clear
export { type FacetEntry, type ListResult, listFacets } from './discovery/list.ts'
// Installation — install, uninstall, prerequisites
export {
  type InstallCopyFailure,
  type InstallNotFound,
  type InstallPrereqFailure,
  type InstallResult,
  type InstallSuccess,
  installFacet,
} from './installation/install.ts'
export { type UninstallResult, uninstallFacet } from './installation/uninstall.ts'
export { readFacetsLock, readFacetsYaml, writeFacetsLock, writeFacetsYaml } from './registry/files.ts'
export { loadManifest } from './registry/loader.ts'
export {
  FacetManifest,
  FacetsLock,
  FacetsYaml,
} from './registry/schemas.ts'
