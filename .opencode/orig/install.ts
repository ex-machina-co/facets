import path from 'node:path'
import yaml from 'js-yaml'
import * as bun from './bun'
import { parseVerifyCommands, runVerifyCommands, type VerifyFailure } from './verify'

interface ResourceInfo {
  name: string
  type: 'agents' | 'skills' | 'commands' | 'tools'
  src: string
  dst: string
}

interface CollectedFacet {
  resources: ResourceInfo[]
  verifyCommands: string[]
}

export interface InstallSuccess {
  success: true
  facet: string
  resources: { name: string; type: string }[]
}

export interface InstallVerifyFailure {
  success: false
  facet: string
  reason: 'verify'
  verifyFailure: VerifyFailure
}

export interface InstallCopyFailure {
  success: false
  facet: string
  reason: 'copy'
  failedResource: { name: string; type: string; error: string }
}

export interface InstallNotFound {
  success: false
  facet: string
  reason: 'not_found'
}

export type InstallResult = InstallSuccess | InstallVerifyFailure | InstallCopyFailure | InstallNotFound

function extractFacets(content: string): string[] {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return []

  try {
    const frontmatter = yaml.load(match[1]) as Record<string, unknown>
    const facet = frontmatter?.facet

    if (typeof facet === 'string') return [facet]
    if (Array.isArray(facet) && facet.every((f) => typeof f === 'string')) return facet

    return []
  } catch {
    return []
  }
}

async function collectResources(facetName: string, base: string, facetsDir: string): Promise<CollectedFacet> {
  const resources: ResourceInfo[] = []
  const seenVerify = new Set<string>()
  const verifyCommands: string[] = []

  for (const resourceType of ['agents', 'skills', 'commands'] as const) {
    const typeDir = path.join(facetsDir, resourceType)

    let hits: string[]
    try {
      hits = await bun.glob('*.md', typeDir)
    } catch {
      continue
    }

    for (const hit of hits) {
      const name = hit.replace(/\.md$/, '')
      const filePath = path.join(typeDir, hit)

      let content: string
      try {
        content = await bun.readText(filePath)
      } catch {
        continue
      }

      const facets = extractFacets(content)
      if (!facets.includes(facetName)) continue

      const src = filePath
      const dst =
        resourceType === 'skills'
          ? path.join(base, 'skills', name, 'SKILL.md')
          : path.join(base, resourceType, `${name}.md`)

      resources.push({ name, type: resourceType, src, dst })

      for (const cmd of parseVerifyCommands(content)) {
        if (!seenVerify.has(cmd)) {
          seenVerify.add(cmd)
          verifyCommands.push(cmd)
        }
      }
    }
  }

  // Scan facets/tools/<facetName>/ for tool files (convention-based: directory name = facet name)
  const toolsDir = path.join(facetsDir, 'tools', facetName)
  try {
    const toolHits = await bun.glob('*.ts', toolsDir)
    for (const hit of toolHits) {
      const name = hit.replace(/\.ts$/, '')
      const src = path.join(toolsDir, hit)
      const dst = path.join(base, 'tools', hit)
      resources.push({ name, type: 'tools', src, dst })
    }
  } catch {
    // No tools directory for this facet — that's fine
  }

  return { resources, verifyCommands }
}

export async function installFacet(facetName: string, base: string, facetsDir: string): Promise<InstallResult> {
  const { resources, verifyCommands } = await collectResources(facetName, base, facetsDir)
  if (resources.length === 0) {
    return { success: false, facet: facetName, reason: 'not_found' }
  }

  if (verifyCommands.length > 0) {
    const verifyResult = await runVerifyCommands(verifyCommands)
    if (!verifyResult.success) {
      return { success: false, facet: facetName, reason: 'verify', verifyFailure: verifyResult }
    }
  }

  const installed: { name: string; type: string }[] = []
  for (const resource of resources) {
    try {
      await bun.copyResource(resource.src, resource.dst)
      installed.push({ name: resource.name, type: resource.type })
    } catch (err) {
      return {
        success: false,
        facet: facetName,
        reason: 'copy',
        failedResource: { name: resource.name, type: resource.type, error: String(err) },
      }
    }
  }

  return { success: true, facet: facetName, resources: installed }
}
