import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { writeScaffold } from '../commands/create/index.ts'

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
    env: { ...process.env, NO_COLOR: '1' },
  })
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited

  // Don't let build errors flood test output — capture but don't dump
  if (exitCode !== 0 && stderr.trim()) {
    const lines = stderr.trim().split('\n')
    const summary =
      lines.length > 3 ? [...lines.slice(0, 3), `... (${lines.length - 3} more lines)`].join('\n') : stderr.trim()
    return { stdout: stdout.trim(), stderr: summary, exitCode }
  }

  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode }
}

// --- Scaffold generation (unit) ---

describe('writeScaffold', () => {
  test('scaffolds with named assets across all types', async () => {
    const dir = await createFixtureDir('scaffold-all')
    const files = await writeScaffold(
      {
        name: 'my-facet',
        version: '0.1.0',
        description: 'A test facet',
        skills: ['code-review', 'testing-guide'],
        agents: ['reviewer'],
        commands: ['deploy'],
      },
      dir,
    )

    expect(files).toContain('facet.yaml')
    expect(files).toContain('skills/code-review.md')
    expect(files).toContain('skills/testing-guide.md')
    expect(files).toContain('agents/reviewer.md')
    expect(files).toContain('commands/deploy.md')

    // Verify manifest content
    const manifest = await Bun.file(join(dir, 'facet.yaml')).text()
    expect(manifest).toContain('name: my-facet')
    expect(manifest).toContain('version: "0.1.0"')
    expect(manifest).toContain('description: "A test facet"')
    expect(manifest).toContain('skills:')
    expect(manifest).toContain('code-review:')
    expect(manifest).toContain('testing-guide:')
    expect(manifest).toContain('agents:')
    expect(manifest).toContain('reviewer:')
    expect(manifest).toContain('commands:')
    expect(manifest).toContain('deploy:')

    // Verify starter files exist and have named template content
    const skill = await Bun.file(join(dir, 'skills/code-review.md')).text()
    expect(skill).toContain('# Code Review')

    const skill2 = await Bun.file(join(dir, 'skills/testing-guide.md')).text()
    expect(skill2).toContain('# Testing Guide')

    const agent = await Bun.file(join(dir, 'agents/reviewer.md')).text()
    expect(agent).toContain('# Reviewer')

    const command = await Bun.file(join(dir, 'commands/deploy.md')).text()
    expect(command).toContain('# Deploy')
  })

  test('scaffolds with only one skill', async () => {
    const dir = await createFixtureDir('scaffold-skills-only')
    const files = await writeScaffold(
      {
        name: 'minimal',
        version: '0.1.0',
        description: '',
        skills: ['minimal'],
        agents: [],
        commands: [],
      },
      dir,
    )

    expect(files).toContain('facet.yaml')
    expect(files).toContain('skills/minimal.md')
    expect(files).not.toContain('agents/')
    expect(files).not.toContain('commands/')

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
        description: 'A buildable facet',
        skills: ['helper'],
        agents: ['assistant'],
        commands: [],
      },
      dir,
    )

    // Run facet build against the scaffolded project
    const result = await runCli('build', dir)
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Built buildable')

    // Verify dist/ output exists — archive + build manifest
    const distArchive = await Bun.file(join(dir, 'dist/buildable-0.1.0.facet')).exists()
    expect(distArchive).toBe(true)

    const distManifest = await Bun.file(join(dir, 'dist/build-manifest.json')).exists()
    expect(distManifest).toBe(true)

    // No loose files
    const looseManifest = await Bun.file(join(dir, 'dist/facet.yaml')).exists()
    expect(looseManifest).toBe(false)
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
    expect(result.stdout).toContain('Built test-facet')
    expect(result.stdout).toContain('sha256:')
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
  })
})
