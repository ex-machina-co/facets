import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import type { ResolvedFacetManifest } from '../loaders/facet.ts'

const DIST_DIR = 'dist'
const MANIFEST_FILE = 'facet.yaml'

/**
 * Writes the build output to dist/.
 *
 * - Cleans (removes and recreates) the dist/ directory
 * - Copies facet.yaml unmodified from the source
 * - Writes resolved prompt files for skills, agents, and commands
 *
 * The dist/ directory mirrors the source project structure with prompts resolved.
 */
export async function writeBuildOutput(resolved: ResolvedFacetManifest, rootDir: string): Promise<void> {
  const distDir = join(rootDir, DIST_DIR)

  // Clean previous output
  await rm(distDir, { recursive: true, force: true })
  await mkdir(distDir, { recursive: true })

  // Copy manifest unmodified
  const manifestSrc = join(rootDir, MANIFEST_FILE)
  const manifestDest = join(distDir, MANIFEST_FILE)
  const manifestContent = await Bun.file(manifestSrc).text()
  await Bun.write(manifestDest, manifestContent)

  // Write resolved skill files
  if (resolved.skills) {
    for (const [name, skill] of Object.entries(resolved.skills)) {
      await writeAssetFile(distDir, 'skills', name, skill.prompt)
    }
  }

  // Write resolved agent files
  if (resolved.agents) {
    for (const [name, agent] of Object.entries(resolved.agents)) {
      await writeAssetFile(distDir, 'agents', name, agent.prompt)
    }
  }

  // Write resolved command files
  if (resolved.commands) {
    for (const [name, command] of Object.entries(resolved.commands)) {
      await writeAssetFile(distDir, 'commands', name, command.prompt)
    }
  }
}

async function writeAssetFile(distDir: string, assetType: string, name: string, content: string): Promise<void> {
  const dir = join(distDir, assetType)
  await mkdir(dir, { recursive: true })
  await Bun.write(join(dir, `${name}.md`), content)
}
