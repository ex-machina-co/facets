import { isInstalled } from '../installation/status.ts'
import { localFacetsDir, readFacetsYaml } from '../registry/files.ts'
import { loadManifest } from '../registry/loader.ts'
import { type FacetManifest, normalizeRequires } from '../registry/schemas.ts'
import { getCacheDir } from './cache.ts'

export interface FacetEntry {
  name: string
  version: string
  description?: string
  source: 'local' | 'remote'
  installed: boolean
  requires: string[]
  resources: ResourceSummary[]
}

export interface ResourceSummary {
  type: 'skill' | 'agent' | 'command' | 'tool'
  name: string
}

export interface ListResult {
  facets: FacetEntry[]
  errors?: string[]
}

function extractResources(manifest: FacetManifest): ResourceSummary[] {
  const resources: ResourceSummary[] = []

  for (const skill of manifest.skills ?? []) {
    resources.push({ type: 'skill', name: skill })
  }
  for (const name of Object.keys(manifest.agents ?? {})) {
    resources.push({ type: 'agent', name })
  }
  for (const name of Object.keys(manifest.commands ?? {})) {
    resources.push({ type: 'command', name })
  }
  for (const tool of manifest.platforms?.opencode?.tools ?? []) {
    resources.push({ type: 'tool', name: tool })
  }

  return resources
}

/**
 * List all facets declared by the project — local facets and remote facets
 * from facets.yaml. Read-only: no network, no command execution.
 */
export async function listFacets(projectRoot: string): Promise<ListResult> {
  const facets: FacetEntry[] = []
  const errors: string[] = []
  const facetsYaml = await readFacetsYaml(projectRoot)

  // Scan local facets
  const localDir = localFacetsDir(projectRoot)
  try {
    const entries: string[] = []
    for await (const entry of new Bun.Glob('*/facet.yaml').scan(localDir)) {
      entries.push(entry)
    }

    for (const entry of entries) {
      const facetDir = `${localDir}/${entry.replace(/\/facet\.yaml$/, '')}`
      const manifestPath = `${localDir}/${entry}`
      const result = await loadManifest(manifestPath)
      if (!result.success) {
        errors.push(`Local facet at ${facetDir}: ${result.error}`)
        continue
      }
      const manifest = result.manifest
      facets.push({
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        source: 'local',
        installed: await isInstalled(manifest, projectRoot),
        requires: normalizeRequires(manifest.requires),
        resources: extractResources(manifest),
      })
    }
  } catch {
    // No local facets dir — fine
  }

  // Scan remote facets declared in facets.yaml
  for (const [name, entry] of Object.entries(facetsYaml.remote ?? {})) {
    const cacheDir = getCacheDir(name)
    const manifestPath = `${cacheDir}/facet.yaml`
    const result = await loadManifest(manifestPath)
    if (!result.success) {
      // Cached manifest not available — show minimal info
      facets.push({
        name,
        version: entry.version ?? 'unknown',
        source: 'remote',
        installed: false,
        requires: [],
        resources: [],
      })
      continue
    }
    const manifest = result.manifest
    facets.push({
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      source: 'remote',
      installed: await isInstalled(manifest, projectRoot),
      requires: normalizeRequires(manifest.requires),
      resources: extractResources(manifest),
    })
  }

  // Include local facets declared in facets.yaml that weren't already found
  for (const name of facetsYaml.local ?? []) {
    if (facets.some((f) => f.name === name)) continue
    facets.push({
      name,
      version: 'unknown',
      source: 'local',
      installed: false,
      requires: [],
      resources: [],
    })
  }

  return { facets, ...(errors.length > 0 && { errors }) }
}
