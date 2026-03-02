import yaml from 'js-yaml'
import { type FacetsLock, FacetsLockSchema, type FacetsYaml, FacetsYamlSchema } from './schemas.ts'

/**
 * Platform-specific paths for facets config files.
 * In v1, this is always .opencode/.
 */
export function facetsYamlPath(projectRoot: string): string {
  return `${projectRoot}/.opencode/facets.yaml`
}

export function facetsLockPath(projectRoot: string): string {
  return `${projectRoot}/.opencode/facets.lock`
}

export function localFacetsDir(projectRoot: string): string {
  return `${projectRoot}/.opencode/facets`
}

// --- facets.yaml ---

export async function readFacetsYaml(projectRoot: string): Promise<FacetsYaml> {
  const filePath = facetsYamlPath(projectRoot)
  try {
    const raw = await Bun.file(filePath).text()
    const parsed = yaml.load(raw)
    const result = FacetsYamlSchema.safeParse(parsed)
    if (result.success) return result.data
    return { remote: {}, local: [] }
  } catch {
    return { remote: {}, local: [] }
  }
}

export async function writeFacetsYaml(projectRoot: string, data: FacetsYaml): Promise<void> {
  const filePath = facetsYamlPath(projectRoot)
  const content = yaml.dump(data, { lineWidth: -1, noRefs: true })
  await Bun.write(filePath, content)
}

// --- facets.lock ---

export async function readFacetsLock(projectRoot: string): Promise<FacetsLock> {
  const filePath = facetsLockPath(projectRoot)
  try {
    const raw = await Bun.file(filePath).text()
    const parsed = yaml.load(raw)
    const result = FacetsLockSchema.safeParse(parsed)
    if (result.success) return result.data
    return { remote: {} }
  } catch {
    return { remote: {} }
  }
}

export async function writeFacetsLock(projectRoot: string, data: FacetsLock): Promise<void> {
  const filePath = facetsLockPath(projectRoot)
  const content = yaml.dump(data, { lineWidth: -1, noRefs: true })
  await Bun.write(filePath, content)
}
