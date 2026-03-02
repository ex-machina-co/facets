import * as bun from '../bun'
import { listBundles } from '../list'
import * as verify from '../verify'

const fileExistsSpy = jest.spyOn(bun, 'fileExists')
const readTextSpy = jest.spyOn(bun, 'readText')
const globSpy = jest.spyOn(bun, 'glob')
const listDirsSpy = jest.spyOn(bun, 'listDirs')
const runVerifySpy = jest.spyOn(verify, 'runVerifyCommands')

beforeEach(() => {
  jest.clearAllMocks()
  fileExistsSpy.mockResolvedValue(false)
  readTextSpy.mockResolvedValue('')
  globSpy.mockResolvedValue([])
  listDirsSpy.mockResolvedValue([])
  runVerifySpy.mockResolvedValue({ success: true })
})

const BASE = '/project/.opencode'
const BUNDLES = '/project/.opencode/bundles'

describe('listBundles', () => {
  it('returns empty bundles when no resources exist', async () => {
    const result = await listBundles(BASE, BUNDLES)
    expect(result.bundles).toEqual({})
    expect(result.errors).toBeUndefined()
  })

  it('groups a single resource under its bundle', async () => {
    globSpy.mockImplementation(async (_pattern, dir) => {
      if (dir.endsWith('/agents')) return ['build.md']
      return []
    })
    readTextSpy.mockResolvedValue('---\nbundle: build\ndescription: Build agent\n---\n')

    const result = await listBundles(BASE, BUNDLES)

    expect(result.bundles).toEqual({
      build: {
        resources: [{ name: 'build', type: 'agents', description: 'Build agent', installed: false }],
        installed: false,
        available: true,
      },
    })
  })

  it('groups multiple resources under the same bundle', async () => {
    globSpy.mockImplementation(async (_pattern, dir) => {
      if (dir.endsWith('/agents')) return ['plan.md']
      if (dir.endsWith('/commands')) return ['review.md']
      return []
    })
    readTextSpy.mockImplementation(async (p) => {
      if (p.includes('/agents/')) return '---\nbundle: review\ndescription: Plan agent\n---\n'
      if (p.includes('/commands/')) return '---\nbundle: review\ndescription: Review command\n---\n'
      return ''
    })

    const result = await listBundles(BASE, BUNDLES)

    expect(result.bundles.review.resources).toHaveLength(2)
    expect(result.bundles.review.resources[0]).toEqual({
      name: 'plan',
      type: 'agents',
      description: 'Plan agent',
      installed: false,
    })
    expect(result.bundles.review.resources[1]).toEqual({
      name: 'review',
      type: 'commands',
      description: 'Review command',
      installed: false,
    })
  })

  it('handles array bundle field (resource in multiple bundles)', async () => {
    globSpy.mockImplementation(async (_pattern, dir) => {
      if (dir.endsWith('/skills')) return ['rspec-structure.md']
      return []
    })
    readTextSpy.mockResolvedValue('---\nbundle:\n  - review\n  - testing\ndescription: RSpec conventions\n---\n')

    const result = await listBundles(BASE, BUNDLES)

    expect(Object.keys(result.bundles)).toEqual(['review', 'testing'])
    expect(result.bundles.review.resources[0].name).toBe('rspec-structure')
    expect(result.bundles.testing.resources[0].name).toBe('rspec-structure')
  })

  it('excludes resources without bundle field', async () => {
    globSpy.mockImplementation(async (_pattern, dir) => {
      if (dir.endsWith('/agents')) return ['orphan.md']
      return []
    })
    readTextSpy.mockResolvedValue('---\ndescription: No bundle field\n---\n')

    const result = await listBundles(BASE, BUNDLES)

    expect(result.bundles).toEqual({})
  })

  it('excludes resources without frontmatter', async () => {
    globSpy.mockImplementation(async (_pattern, dir) => {
      if (dir.endsWith('/agents')) return ['bare.md']
      return []
    })
    readTextSpy.mockResolvedValue('# Just a markdown file\nNo frontmatter here.')

    const result = await listBundles(BASE, BUNDLES)

    expect(result.bundles).toEqual({})
  })

  it('marks bundle as installed when all resources are installed', async () => {
    globSpy.mockImplementation(async (_pattern, dir) => {
      if (dir.endsWith('/agents')) return ['build.md']
      return []
    })
    readTextSpy.mockResolvedValue('---\nbundle: build\n---\n')
    fileExistsSpy.mockResolvedValue(true)

    const result = await listBundles(BASE, BUNDLES)

    expect(result.bundles.build.installed).toBe(true)
    expect(result.bundles.build.resources[0].installed).toBe(true)
  })

  it('marks bundle as not installed when any resource is not installed', async () => {
    globSpy.mockImplementation(async (_pattern, dir) => {
      if (dir.endsWith('/agents')) return ['plan.md']
      if (dir.endsWith('/commands')) return ['review.md']
      return []
    })
    readTextSpy.mockResolvedValue('---\nbundle: review\n---\n')
    fileExistsSpy.mockImplementation(async (p) => p.includes('/agents/'))

    const result = await listBundles(BASE, BUNDLES)

    expect(result.bundles.review.installed).toBe(false)
    expect(result.bundles.review.resources[0].installed).toBe(true)
    expect(result.bundles.review.resources[1].installed).toBe(false)
  })

  it('handles skill names correctly', async () => {
    globSpy.mockImplementation(async (_pattern, dir) => {
      if (dir.endsWith('/skills')) return ['investigate-sentry.md']
      return []
    })
    readTextSpy.mockResolvedValue('---\nbundle: sentry\ndescription: Sentry skill\n---\n')

    const result = await listBundles(BASE, BUNDLES)

    expect(result.bundles.sentry.resources[0]).toEqual({
      name: 'investigate-sentry',
      type: 'skills',
      description: 'Sentry skill',
      installed: false,
    })
    expect(fileExistsSpy).toHaveBeenCalledWith(`${BASE}/skills/investigate-sentry/SKILL.md`)
  })
})

describe('listBundles tools', () => {
  it('discovers tools from bundles/tools/ subdirectories', async () => {
    listDirsSpy.mockResolvedValue(['viper'])
    globSpy.mockImplementation(async (pattern, dir) => {
      if (dir.endsWith('/tools/viper') && pattern === '*.ts') return ['viper-write-plan.ts', 'viper-delete-plan.ts']
      return []
    })

    const result = await listBundles(BASE, BUNDLES)

    expect(result.bundles.viper).toBeDefined()
    expect(result.bundles.viper.resources).toEqual([
      { name: 'viper-write-plan', type: 'tools', installed: false },
      { name: 'viper-delete-plan', type: 'tools', installed: false },
    ])
  })

  it('checks install status of tools in .opencode/tools/', async () => {
    listDirsSpy.mockResolvedValue(['viper'])
    globSpy.mockImplementation(async (pattern, dir) => {
      if (dir.endsWith('/tools/viper') && pattern === '*.ts') return ['viper-write-plan.ts']
      return []
    })
    fileExistsSpy.mockImplementation(async (p) => p.endsWith('/tools/viper-write-plan.ts'))

    const result = await listBundles(BASE, BUNDLES)

    expect(result.bundles.viper.resources[0].installed).toBe(true)
    expect(result.bundles.viper.installed).toBe(true)
  })

  it('marks bundle not installed when tool is missing', async () => {
    listDirsSpy.mockResolvedValue(['viper'])
    globSpy.mockImplementation(async (pattern, dir) => {
      if (dir.endsWith('/tools/viper') && pattern === '*.ts') return ['viper-write-plan.ts', 'viper-delete-plan.ts']
      return []
    })
    fileExistsSpy.mockImplementation(async (p) => p.endsWith('/viper-write-plan.ts'))

    const result = await listBundles(BASE, BUNDLES)

    expect(result.bundles.viper.installed).toBe(false)
    expect(result.bundles.viper.resources[0].installed).toBe(true)
    expect(result.bundles.viper.resources[1].installed).toBe(false)
  })

  it('combines tools with other resource types in the same bundle', async () => {
    listDirsSpy.mockResolvedValue(['viper'])
    globSpy.mockImplementation(async (pattern, dir) => {
      if (dir.endsWith('/commands') && pattern === '*.md') return ['viper-plan.md']
      if (dir.endsWith('/tools/viper') && pattern === '*.ts') return ['viper-write-plan.ts']
      return []
    })
    readTextSpy.mockResolvedValue('---\nbundle: viper\ndescription: Plan command\n---\n')

    const result = await listBundles(BASE, BUNDLES)

    expect(result.bundles.viper.resources).toHaveLength(2)
    expect(result.bundles.viper.resources[0]).toEqual({
      name: 'viper-plan',
      type: 'commands',
      description: 'Plan command',
      installed: false,
    })
    expect(result.bundles.viper.resources[1]).toEqual({
      name: 'viper-write-plan',
      type: 'tools',
      installed: false,
    })
  })

  it('lists tools from multiple bundles', async () => {
    listDirsSpy.mockResolvedValue(['viper', 'core'])
    globSpy.mockImplementation(async (pattern, dir) => {
      if (dir.endsWith('/tools/viper') && pattern === '*.ts') return ['viper-write-plan.ts']
      if (dir.endsWith('/tools/core') && pattern === '*.ts') return ['install-facet.ts']
      return []
    })

    const result = await listBundles(BASE, BUNDLES)

    expect(result.bundles.viper.resources).toEqual([{ name: 'viper-write-plan', type: 'tools', installed: false }])
    expect(result.bundles.core.resources).toEqual([{ name: 'install-facet', type: 'tools', installed: false }])
  })
})

describe('listBundles availability', () => {
  it('marks bundle as available when verify commands pass', async () => {
    globSpy.mockImplementation(async (_pattern, dir) => {
      if (dir.endsWith('/commands')) return ['sentry.md']
      return []
    })
    readTextSpy.mockResolvedValue('---\nbundle: sentry\nverify:\n  - sentry --version\n---\n')
    runVerifySpy.mockResolvedValue({ success: true })

    const result = await listBundles(BASE, BUNDLES)

    expect(result.bundles.sentry.available).toBe(true)
    expect(runVerifySpy).toHaveBeenCalledWith(['sentry --version'])
  })

  it('marks bundle as unavailable with verifyFailure when verify commands fail', async () => {
    globSpy.mockImplementation(async (_pattern, dir) => {
      if (dir.endsWith('/commands')) return ['sentry.md']
      return []
    })
    readTextSpy.mockResolvedValue('---\nbundle: sentry\nverify:\n  - sentry --version\n---\n')
    runVerifySpy.mockResolvedValue({
      success: false,
      command: 'sentry --version',
      exitCode: 127,
      output: 'command not found: sentry',
    })

    const result = await listBundles(BASE, BUNDLES)

    expect(result.bundles.sentry.available).toBe(false)
    if (!result.bundles.sentry.available) {
      expect(result.bundles.sentry.verifyFailure).toEqual({
        success: false,
        command: 'sentry --version',
        exitCode: 127,
        output: 'command not found: sentry',
      })
    }
  })

  it('marks bundle as available when it has no verify commands', async () => {
    globSpy.mockImplementation(async (_pattern, dir) => {
      if (dir.endsWith('/agents')) return ['build.md']
      return []
    })
    readTextSpy.mockResolvedValue('---\nbundle: core\n---\n')

    const result = await listBundles(BASE, BUNDLES)

    expect(result.bundles.core.available).toBe(true)
    expect(runVerifySpy).not.toHaveBeenCalled()
  })

  it('one bundle failing does not block other bundles', async () => {
    globSpy.mockImplementation(async (_pattern, dir) => {
      if (dir.endsWith('/commands')) return ['sentry.md', 'snowflake-setup.md']
      return []
    })
    readTextSpy.mockImplementation(async (p) => {
      if (p.includes('sentry')) return '---\nbundle: sentry\nverify:\n  - sentry --version\n---\n'
      if (p.includes('snowflake')) return '---\nbundle: snowflake\nverify:\n  - snow --version\n---\n'
      return ''
    })
    runVerifySpy.mockImplementation(async (commands) => {
      if (commands.includes('sentry --version')) {
        return { success: false, command: 'sentry --version', exitCode: 127, output: 'not found' }
      }
      return { success: true }
    })

    const result = await listBundles(BASE, BUNDLES)

    expect(result.bundles.sentry.available).toBe(false)
    expect(result.bundles.snowflake.available).toBe(true)
  })

  it('deduplicates verify commands across resources in the same bundle', async () => {
    globSpy.mockImplementation(async (_pattern, dir) => {
      if (dir.endsWith('/commands')) return ['sentry.md']
      if (dir.endsWith('/skills')) return ['investigate-sentry.md']
      return []
    })
    readTextSpy.mockImplementation(async (p) => {
      if (p.includes('commands/sentry'))
        return '---\nbundle: sentry\nverify:\n  - sentry --version\n  - sentry auth status\n---\n'
      if (p.includes('skills/investigate-sentry'))
        return '---\nbundle: sentry\nverify:\n  - sentry --version\n  - sentry auth status\n---\n'
      return ''
    })
    runVerifySpy.mockResolvedValue({ success: true })

    await listBundles(BASE, BUNDLES)

    expect(runVerifySpy).toHaveBeenCalledTimes(1)
    expect(runVerifySpy).toHaveBeenCalledWith(['sentry --version', 'sentry auth status'])
  })

  it('tools-only bundles are always available', async () => {
    listDirsSpy.mockResolvedValue(['viper'])
    globSpy.mockImplementation(async (pattern, dir) => {
      if (dir.endsWith('/tools/viper') && pattern === '*.ts') return ['viper-write-plan.ts']
      return []
    })

    const result = await listBundles(BASE, BUNDLES)

    expect(result.bundles.viper.available).toBe(true)
    expect(runVerifySpy).not.toHaveBeenCalled()
  })
})
