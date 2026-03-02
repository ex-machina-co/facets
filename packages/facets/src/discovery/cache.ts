import path from 'node:path'
import { type } from 'arktype'
import yaml from 'js-yaml'
import { readFacetsLock, readFacetsYaml, writeFacetsLock, writeFacetsYaml } from '../registry/files.ts'
import { type FacetManifest, resolvePromptPath } from '../registry/schemas.ts'

const DEFAULT_CACHE_DIR = `${process.env.XDG_CACHE_HOME ?? `${process.env.HOME}/.cache`}/facets`

/** Get the cache directory for a facet by name */
export function getCacheDir(name: string): string {
  return `${DEFAULT_CACHE_DIR}/${name}`
}

/** Get the root cache directory */
export function getCacheRoot(): string {
  return DEFAULT_CACHE_DIR
}

export interface CacheSuccess {
  success: true
  name: string
  version: string
}

export interface CacheError {
  success: false
  error: string
}

export type CacheResult = CacheSuccess | CacheError

/**
 * Compute a SHA-256 integrity hash for a string.
 */
async function computeIntegrity(content: string): Promise<string> {
  const hash = new Bun.CryptoHasher('sha256').update(content).digest('hex')
  return `sha256-${hash}`
}

/**
 * Fetch a remote URL and return its text content.
 */
async function fetchText(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  return response.text()
}

/**
 * Resolve a relative URL against a base URL.
 */
export function resolveUrl(base: string, relative: string): string {
  const baseUrl = new URL(base)
  // Navigate to parent directory of the base file
  const basePath = baseUrl.pathname.replace(/\/[^/]*$/, '/')
  const resolved = new URL(relative, `${baseUrl.origin}${basePath}`)
  return resolved.href
}

/**
 * Collect all resource file paths referenced by a manifest.
 * Returns paths relative to the facet root directory.
 */
function collectResourcePaths(manifest: FacetManifest): string[] {
  const paths: string[] = []

  // Skills
  for (const skill of manifest.skills ?? []) {
    paths.push(`skills/${skill}/SKILL.md`)
  }

  // Agent prompts
  for (const agent of Object.values(manifest.agents ?? {})) {
    const promptPath = resolvePromptPath(agent.prompt)
    if (promptPath) paths.push(promptPath)
  }

  // Command prompts
  for (const command of Object.values(manifest.commands ?? {})) {
    const promptPath = resolvePromptPath(command.prompt)
    if (promptPath) paths.push(promptPath)
  }

  // Platform-specific tools
  for (const tool of manifest.platforms?.opencode?.tools ?? []) {
    paths.push(`opencode/tools/${tool}.ts`)
  }

  return paths
}

/**
 * Cache a remote facet by URL. Fetches the manifest and all referenced
 * resources, stores them in the global cache, and records the dependency
 * in the project's facets.yaml and facets.lock.
 */
export async function cacheFacet(url: string, projectRoot: string): Promise<CacheResult> {
  // Fetch the manifest
  let manifestText: string
  try {
    manifestText = await fetchText(url)
  } catch (err) {
    return { success: false, error: `Failed to fetch manifest: ${err}` }
  }

  // Parse and validate
  let parsed: unknown
  try {
    parsed = yaml.load(manifestText)
  } catch (err) {
    return { success: false, error: `Invalid YAML at ${url}: ${err}` }
  }

  const { FacetManifest } = await import('../registry/schemas.ts')
  const validation = FacetManifest(parsed)
  if (validation instanceof type.errors) {
    return { success: false, error: `Invalid manifest: ${validation.summary}` }
  }

  const manifest = validation
  const cacheDir = getCacheDir(manifest.name)

  // Write the manifest
  await Bun.$`mkdir -p ${cacheDir}`
  await Bun.write(`${cacheDir}/facet.yaml`, manifestText)

  // Fetch and cache all referenced resource files
  const resourcePaths = collectResourcePaths(manifest)
  for (const relPath of resourcePaths) {
    const resourceUrl = resolveUrl(url, relPath)
    try {
      const content = await fetchText(resourceUrl)
      const destPath = `${cacheDir}/${relPath}`
      await Bun.$`mkdir -p ${path.dirname(destPath)}`
      await Bun.write(destPath, content)
    } catch (err) {
      return { success: false, error: `Failed to fetch resource ${relPath}: ${err}` }
    }
  }

  // Update facets.yaml
  const facetsYaml = await readFacetsYaml(projectRoot)
  if (!facetsYaml.remote) facetsYaml.remote = {}
  facetsYaml.remote[manifest.name] = {
    url,
    version: manifest.version,
  }
  await writeFacetsYaml(projectRoot, facetsYaml)

  // Update facets.lock
  const lock = await readFacetsLock(projectRoot)
  if (!lock.remote) lock.remote = {}
  lock.remote[manifest.name] = {
    url,
    version: manifest.version,
    integrity: await computeIntegrity(manifestText),
  }
  await writeFacetsLock(projectRoot, lock)

  return { success: true, name: manifest.name, version: manifest.version }
}

export interface UpdateSuccess {
  success: true
  name: string
  version: string
  updated: boolean
}

export interface UpdateError {
  success: false
  name: string
  error: string
}

export type UpdateResult = UpdateSuccess | UpdateError

/**
 * Re-fetch a single cached remote facet and update if newer.
 */
export async function updateFacet(name: string, projectRoot: string): Promise<UpdateResult> {
  const facetsYaml = await readFacetsYaml(projectRoot)
  const entry = facetsYaml.remote?.[name]
  if (!entry) {
    return { success: false, name, error: `No remote facet named "${name}" declared` }
  }

  const lock = await readFacetsLock(projectRoot)
  const lockEntry = lock.remote?.[name]

  // Re-fetch
  const result = await cacheFacet(entry.url, projectRoot)
  if (!result.success) {
    return { success: false, name, error: result.error }
  }

  // Check if the version changed
  const updated = lockEntry ? lockEntry.version !== result.version : true

  return { success: true, name, version: result.version, updated }
}

/**
 * Update all remote facets declared in facets.yaml.
 */
export async function updateAllFacets(projectRoot: string): Promise<UpdateResult[]> {
  const facetsYaml = await readFacetsYaml(projectRoot)
  const results: UpdateResult[] = []

  for (const name of Object.keys(facetsYaml.remote ?? {})) {
    results.push(await updateFacet(name, projectRoot))
  }

  return results
}
