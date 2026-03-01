import path from 'node:path'
import yaml from 'js-yaml'
import * as bun from './bun'
import { parseVerifyCommands, runVerifyCommands, type VerifyFailure } from './verify'

export interface Resource {
  name: string
  type: 'agents' | 'commands' | 'skills' | 'tools'
  description?: string
  installed: boolean
}

export interface AvailableFacet {
  resources: Resource[]
  installed: boolean
  available: true
}

export interface UnavailableFacet {
  resources: Resource[]
  installed: boolean
  available: false
  verifyFailure: VerifyFailure
}

export type Facet = AvailableFacet | UnavailableFacet

export type FacetMap = Record<string, Facet>

export interface ListResult {
  facets: FacetMap
  errors?: string[]
}

function parseFrontmatter(content: string): Record<string, unknown> | undefined {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return undefined

  try {
    return yaml.load(match[1]) as Record<string, unknown>
  } catch {
    return undefined
  }
}

function extractFacets(frontmatter: Record<string, unknown>): string[] {
  const facet = frontmatter.facet
  if (typeof facet === 'string') return [facet]
  if (Array.isArray(facet) && facet.every((f) => typeof f === 'string')) return facet
  return []
}

interface ScannedFacet {
  resources: Resource[]
  installed: boolean
  verifySeen: Set<string>
  verifyCommands: string[]
}

function getOrCreateScanned(map: Map<string, ScannedFacet>, name: string): ScannedFacet {
  let facet = map.get(name)
  if (!facet) {
    facet = { resources: [], installed: true, verifySeen: new Set(), verifyCommands: [] }
    map.set(name, facet)
  }
  return facet
}

export async function listFacets(base: string, facetsDir: string): Promise<ListResult> {
  const scanned = new Map<string, ScannedFacet>()
  const errors: string[] = []

  for (const type of ['agents', 'skills', 'commands'] as const) {
    const pattern = '*.md'
    const typeDir = path.join(facetsDir, type)

    let hits: string[]
    try {
      hits = await bun.glob(pattern, typeDir)
    } catch (err) {
      errors.push(`Failed to scan ${type}: ${err}`)
      continue
    }

    for (const hit of hits) {
      const name = hit.replace(/\.md$/, '')
      const filePath = path.join(typeDir, hit)

      let content: string
      try {
        content = await bun.readText(filePath)
      } catch (err) {
        errors.push(`Failed to read ${filePath}: ${err}`)
        continue
      }

      const frontmatter = parseFrontmatter(content)
      if (!frontmatter) continue

      const facetNames = extractFacets(frontmatter)
      if (facetNames.length === 0) continue

      const description = typeof frontmatter.description === 'string' ? frontmatter.description : undefined

      const livePath =
        type === 'skills' ? path.join(base, 'skills', name, 'SKILL.md') : path.join(base, type, `${name}.md`)
      const installed = await bun.fileExists(livePath)

      const resource: Resource = { name, type, installed, ...(description && { description }) }
      const verifyCommands = parseVerifyCommands(content)

      for (const facetName of facetNames) {
        const facet = getOrCreateScanned(scanned, facetName)
        facet.resources.push(resource)
        if (!installed) {
          facet.installed = false
        }
        for (const cmd of verifyCommands) {
          if (!facet.verifySeen.has(cmd)) {
            facet.verifySeen.add(cmd)
            facet.verifyCommands.push(cmd)
          }
        }
      }
    }
  }

  // Scan facets/tools/ subdirectories (convention-based: directory name = facet name)
  const toolsBaseDir = path.join(facetsDir, 'tools')
  const facetDirs = await bun.listDirs(toolsBaseDir)

  for (const facetName of facetDirs) {
    const facetToolsDir = path.join(toolsBaseDir, facetName)

    let hits: string[]
    try {
      hits = await bun.glob('*.ts', facetToolsDir)
    } catch (err) {
      errors.push(`Failed to scan tools/${facetName}: ${err}`)
      continue
    }

    for (const hit of hits) {
      const name = hit.replace(/\.ts$/, '')
      const livePath = path.join(base, 'tools', hit)
      const installed = await bun.fileExists(livePath)

      const resource: Resource = { name, type: 'tools', installed }
      const facet = getOrCreateScanned(scanned, facetName)
      facet.resources.push(resource)
      if (!installed) {
        facet.installed = false
      }
    }
  }

  // Verify all facets concurrently, sequentially within each facet
  const facets: FacetMap = {}
  await Promise.all(
    Array.from(scanned.entries()).map(async ([name, { resources, installed, verifyCommands }]) => {
      if (verifyCommands.length === 0) {
        facets[name] = { resources, installed, available: true }
        return
      }
      const result = await runVerifyCommands(verifyCommands)
      if (!result.success) {
        facets[name] = { resources, installed, available: false, verifyFailure: result }
      } else {
        facets[name] = { resources, installed, available: true }
      }
    }),
  )

  return { facets, ...(errors.length > 0 && { errors }) }
}
