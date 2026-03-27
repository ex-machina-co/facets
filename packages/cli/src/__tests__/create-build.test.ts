import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { writeScaffold } from '../commands/create.ts'

let testDir: string

beforeAll(async () => {
  testDir = await mkdtemp(join(tmpdir(), 'cli-create-build-test-'))
})

afterAll(async () => {
  await rm(testDir, { recursive: true, force: true })
})

async function createFixtureDir(name: string): Promise<string> {
  const dir = join(testDir, name)
  await Bun.write(join(dir, '.keep'), '')
  return dir
}

const CLI_PATH = resolve(import.meta.dir, '../../dist/facet')

async function runCli(...args: string[]) {
  const proc = Bun.spawn([CLI_PATH, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode }
}

// --- Scaffold generation (unit) ---

describe('writeScaffold', () => {
  test('scaffolds with all asset types', async () => {
    const dir = await createFixtureDir('scaffold-all')
    const files = await writeScaffold(
      {
        name: 'my-facet',
        version: '0.1.0',
        description: 'A test facet',
        skills: true,
        agents: true,
        commands: true,
      },
      dir,
    )

    expect(files).toContain('facet.yaml')
    expect(files).toContain('skills/example-skill.md')
    expect(files).toContain('agents/example-agent.md')
    expect(files).toContain('commands/example-command.md')

    // Verify manifest content
    const manifest = await Bun.file(join(dir, 'facet.yaml')).text()
    expect(manifest).toContain('name: my-facet')
    expect(manifest).toContain('version: "0.1.0"')
    expect(manifest).toContain('description: "A test facet"')
    expect(manifest).toContain('skills:')
    expect(manifest).toContain('agents:')
    expect(manifest).toContain('commands:')

    // Verify starter files exist and have template content
    const skill = await Bun.file(join(dir, 'skills/example-skill.md')).text()
    expect(skill).toContain('# Example Skill')

    const agent = await Bun.file(join(dir, 'agents/example-agent.md')).text()
    expect(agent).toContain('# Example Agent')

    const command = await Bun.file(join(dir, 'commands/example-command.md')).text()
    expect(command).toContain('# Example Command')
  })

  test('scaffolds with only skills', async () => {
    const dir = await createFixtureDir('scaffold-skills-only')
    const files = await writeScaffold(
      {
        name: 'minimal',
        version: '0.1.0',
        description: '',
        skills: true,
        agents: false,
        commands: false,
      },
      dir,
    )

    expect(files).toContain('facet.yaml')
    expect(files).toContain('skills/example-skill.md')
    expect(files).not.toContain('agents/example-agent.md')
    expect(files).not.toContain('commands/example-command.md')

    const manifest = await Bun.file(join(dir, 'facet.yaml')).text()
    expect(manifest).toContain('skills:')
    expect(manifest).not.toContain('agents:')
    expect(manifest).not.toContain('commands:')
  })

  test('scaffolded project passes build', async () => {
    const dir = await createFixtureDir('scaffold-buildable')
    await writeScaffold(
      {
        name: 'buildable',
        version: '0.1.0',
        description: '',
        skills: true,
        agents: true,
        commands: false,
      },
      dir,
    )

    // Run facet build against the scaffolded project
    const result = await runCli('build', dir)
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Build succeeded')

    // Verify dist/ output exists
    const distManifest = await Bun.file(join(dir, 'dist/facet.yaml')).exists()
    expect(distManifest).toBe(true)

    const distSkill = await Bun.file(join(dir, 'dist/skills/example-skill.md')).exists()
    expect(distSkill).toBe(true)

    const distAgent = await Bun.file(join(dir, 'dist/agents/example-agent.md')).exists()
    expect(distAgent).toBe(true)
  })
})

// --- Build command (e2e) ---

describe('facet build', () => {
  test('build succeeds on valid project', async () => {
    const dir = await createFixtureDir('build-valid')
    await Bun.write(join(dir, 'skills/review.md'), '# Review skill content')
    await Bun.write(
      join(dir, 'facet.yaml'),
      `
name: test-facet
version: "1.0.0"
skills:
  review:
    description: "Code review skill"
    prompt: { file: skills/review.md }
`,
    )

    const result = await runCli('build', dir)
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Build succeeded')
    expect(result.stdout).toContain('dist/')
  })

  test('build fails on missing manifest', async () => {
    const dir = await createFixtureDir('build-no-manifest')

    const result = await runCli('build', dir)
    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain('Build failed')
  })

  test('build fails on missing asset file', async () => {
    const dir = await createFixtureDir('build-missing-file')
    await Bun.write(
      join(dir, 'facet.yaml'),
      `
name: test-facet
version: "1.0.0"
skills:
  review:
    description: "Code review skill"
    prompt: { file: skills/nonexistent.md }
`,
    )

    const result = await runCli('build', dir)
    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain('Build failed')
    expect(result.stdout).toContain('nonexistent.md')
  })
})
