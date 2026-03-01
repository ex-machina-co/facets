import type { FacetManifest } from '../registry/schemas.ts'

/**
 * Check whether a facet's resources are currently installed by
 * verifying that expected destination files exist.
 */
export async function isInstalled(manifest: FacetManifest, projectRoot: string): Promise<boolean> {
  const base = `${projectRoot}/.opencode`

  // Check skills
  for (const skill of manifest.skills ?? []) {
    const exists = await Bun.file(`${base}/skills/${skill}/SKILL.md`).exists()
    if (!exists) return false
  }

  // Check agents
  for (const name of Object.keys(manifest.agents ?? {})) {
    const exists = await Bun.file(`${base}/agents/${name}.md`).exists()
    if (!exists) return false
  }

  // Check commands
  for (const name of Object.keys(manifest.commands ?? {})) {
    const exists = await Bun.file(`${base}/commands/${name}.md`).exists()
    if (!exists) return false
  }

  // Check platform tools
  for (const tool of manifest.platforms?.opencode?.tools ?? []) {
    const exists = await Bun.file(`${base}/tools/${tool}.ts`).exists()
    if (!exists) return false
  }

  // At least one resource must exist for a facet to be considered installed
  const hasResources =
    (manifest.skills?.length ?? 0) > 0 ||
    Object.keys(manifest.agents ?? {}).length > 0 ||
    Object.keys(manifest.commands ?? {}).length > 0 ||
    (manifest.platforms?.opencode?.tools?.length ?? 0) > 0

  return hasResources
}
