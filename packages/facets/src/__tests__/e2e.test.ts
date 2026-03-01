import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import yaml from 'js-yaml'
import { initProject } from '../cli/init.ts'
import { listFacets } from '../discovery/list.ts'
import { installFacet } from '../installation/install.ts'
import { uninstallFacet } from '../installation/uninstall.ts'

let projectRoot: string

beforeEach(async () => {
  projectRoot = await mkdtemp(path.join(tmpdir(), 'facets-e2e-'))
})

afterEach(async () => {
  await rm(projectRoot, { recursive: true, force: true })
})

async function writeLocalFacet(name: string, manifest: Record<string, unknown>, files?: Record<string, string>) {
  const dir = `${projectRoot}/.opencode/facets/${name}`
  await Bun.$`mkdir -p ${dir}`
  await Bun.write(`${dir}/facet.yaml`, yaml.dump(manifest))
  for (const [relPath, content] of Object.entries(files ?? {})) {
    const fullPath = `${dir}/${relPath}`
    await Bun.$`mkdir -p ${path.dirname(fullPath)}`
    await Bun.write(fullPath, content)
  }
}

describe('End-to-end', () => {
  test('init → list → install → verify resources → uninstall', async () => {
    // 1. Init the project
    await initProject(projectRoot)

    // Verify opencode.jsonc was created with MCP server registered
    const configText = await Bun.file(`${projectRoot}/.opencode/opencode.jsonc`).text()
    expect(configText).toContain('facets-mcp')

    // Verify facets.yaml was created
    expect(await Bun.file(`${projectRoot}/.opencode/facets.yaml`).exists()).toBe(true)

    // 2. Create a local facet
    await writeLocalFacet(
      'test-facet',
      {
        name: 'test-facet',
        version: '1.0.0',
        description: 'End-to-end test facet',
        skills: ['e2e-skill'],
        agents: {
          'e2e-agent': {
            description: 'E2E test agent',
            prompt: 'prompts/e2e-agent.md',
            platforms: {
              opencode: { tools: { write: false } },
            },
          },
        },
        commands: {
          'e2e-cmd': {
            description: 'E2E test command',
            prompt: 'prompts/e2e-cmd.md',
          },
        },
      },
      {
        'skills/e2e-skill/SKILL.md': '# E2E Skill\nThis is a test skill.',
        'prompts/e2e-agent.md': 'You are an end-to-end test agent.',
        'prompts/e2e-cmd.md': 'Run the e2e test command.',
      },
    )

    // 3. List — should show the facet as not installed
    let list = await listFacets(projectRoot)
    expect(list.facets).toHaveLength(1)
    expect(list.facets[0]?.name).toBe('test-facet')
    expect(list.facets[0]?.installed).toBe(false)

    // 4. Install
    const installResult = await installFacet('test-facet', projectRoot)
    expect(installResult.success).toBe(true)
    if (installResult.success) {
      expect(installResult.resources).toHaveLength(3)
    }

    // 5. Verify resource files are present
    expect(await Bun.file(`${projectRoot}/.opencode/skills/e2e-skill/SKILL.md`).exists()).toBe(true)
    expect(await Bun.file(`${projectRoot}/.opencode/agents/e2e-agent.md`).exists()).toBe(true)
    expect(await Bun.file(`${projectRoot}/.opencode/commands/e2e-cmd.md`).exists()).toBe(true)

    // Verify agent file has assembled frontmatter
    const agentContent = await Bun.file(`${projectRoot}/.opencode/agents/e2e-agent.md`).text()
    expect(agentContent).toContain('description: E2E test agent')
    expect(agentContent).toContain('You are an end-to-end test agent.')

    // 6. List — should now show as installed
    list = await listFacets(projectRoot)
    expect(list.facets[0]?.installed).toBe(true)

    // 7. Uninstall
    const uninstallResult = await uninstallFacet('test-facet', projectRoot)
    expect(uninstallResult.success).toBe(true)

    // 8. Verify resources removed
    expect(await Bun.file(`${projectRoot}/.opencode/skills/e2e-skill/SKILL.md`).exists()).toBe(false)
    expect(await Bun.file(`${projectRoot}/.opencode/agents/e2e-agent.md`).exists()).toBe(false)
    expect(await Bun.file(`${projectRoot}/.opencode/commands/e2e-cmd.md`).exists()).toBe(false)

    // 9. List — should be back to not installed
    list = await listFacets(projectRoot)
    expect(list.facets[0]?.installed).toBe(false)
  })

  test('init is idempotent', async () => {
    await initProject(projectRoot)
    await initProject(projectRoot)

    // MCP server should only be registered once
    const configText = await Bun.file(`${projectRoot}/.opencode/opencode.jsonc`).text()
    const matches = configText.match(/facets-mcp/g)
    expect(matches).toHaveLength(1)
  })
})
