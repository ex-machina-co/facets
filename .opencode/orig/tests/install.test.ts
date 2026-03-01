import * as bun from '../bun'
import { installBundle } from '../install'

const readTextSpy = jest.spyOn(bun, 'readText')
const copyResourceSpy = jest.spyOn(bun, 'copyResource')
const globSpy = jest.spyOn(bun, 'glob')
const runCommandSpy = jest.spyOn(bun, 'runCommand')
const listDirsSpy = jest.spyOn(bun, 'listDirs')

beforeEach(() => {
  jest.resetAllMocks()
  readTextSpy.mockResolvedValue('')
  copyResourceSpy.mockResolvedValue(undefined)
  globSpy.mockResolvedValue([])
  runCommandSpy.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
  listDirsSpy.mockResolvedValue([])
})

const BASE = '/project/.opencode'
const BUNDLES = '/project/.opencode/bundles'

describe('installBundle', () => {
  it('returns not_found when no resources match the bundle', async () => {
    const result = await installBundle('nonexistent', BASE, BUNDLES)
    expect(result).toEqual({ success: false, bundle: 'nonexistent', reason: 'not_found' })
    expect(copyResourceSpy).not.toHaveBeenCalled()
  })

  it('installs a single agent matching the bundle', async () => {
    globSpy.mockImplementation(async (pattern, dir) => {
      if (dir.endsWith('/agents')) return ['build.md']
      return []
    })
    readTextSpy.mockResolvedValue('---\nbundle: build\ndescription: Build agent\n---\n')

    const result = await installBundle('build', BASE, BUNDLES)

    expect(result).toEqual({
      success: true,
      bundle: 'build',
      resources: [{ name: 'build', type: 'agents' }],
    })
    expect(copyResourceSpy).toHaveBeenCalledWith(`${BUNDLES}/agents/build.md`, `${BASE}/agents/build.md`)
  })

  it('installs multiple resources matching the same bundle', async () => {
    globSpy.mockImplementation(async (pattern, dir) => {
      if (dir.endsWith('/agents')) return ['plan.md']
      if (dir.endsWith('/commands')) return ['review.md']
      if (dir.endsWith('/skills')) return ['rspec-structure.md']
      return []
    })
    readTextSpy.mockImplementation(async (p) => {
      if (p.includes('/agents/')) return '---\nbundle: review\n---\n'
      if (p.includes('/commands/')) return '---\nbundle: review\n---\n'
      if (p.includes('/skills/')) return '---\nbundle:\n  - review\n---\n'
      return ''
    })

    const result = await installBundle('review', BASE, BUNDLES)

    expect(result).toEqual({
      success: true,
      bundle: 'review',
      resources: [
        { name: 'plan', type: 'agents' },
        { name: 'rspec-structure', type: 'skills' },
        { name: 'review', type: 'commands' },
      ],
    })
  })

  it('installs resources with different names than the bundle', async () => {
    globSpy.mockImplementation(async (pattern, dir) => {
      if (dir.endsWith('/agents')) return ['plan.md']
      return []
    })
    readTextSpy.mockResolvedValue('---\nbundle: review\n---\n')

    const result = await installBundle('review', BASE, BUNDLES)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.resources).toEqual([{ name: 'plan', type: 'agents' }])
    }
  })

  it('skips resources that belong to a different bundle', async () => {
    globSpy.mockImplementation(async (pattern, dir) => {
      if (dir.endsWith('/agents')) return ['build.md', 'plan.md']
      return []
    })
    readTextSpy.mockImplementation(async (p) => {
      if (p.includes('build')) return '---\nbundle: build\n---\n'
      if (p.includes('plan')) return '---\nbundle: review\n---\n'
      return ''
    })

    const result = await installBundle('review', BASE, BUNDLES)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.resources).toEqual([{ name: 'plan', type: 'agents' }])
    }
  })

  it('returns not_found for resources without bundle field', async () => {
    globSpy.mockImplementation(async (pattern, dir) => {
      if (dir.endsWith('/agents')) return ['orphan.md']
      return []
    })
    readTextSpy.mockResolvedValue('---\ndescription: No bundle\n---\n')

    const result = await installBundle('anything', BASE, BUNDLES)

    expect(result).toEqual({ success: false, bundle: 'anything', reason: 'not_found' })
    expect(copyResourceSpy).not.toHaveBeenCalled()
  })

  it('installs skill as flat file to SKILL.md destination', async () => {
    globSpy.mockImplementation(async (pattern, dir) => {
      if (dir.endsWith('/skills')) return ['investigate-sentry.md']
      return []
    })
    readTextSpy.mockResolvedValue(
      '---\nbundle: sentry\nverify:\n  - "sentry --version"\n  - "sentry auth status"\n---\n'
    )

    const result = await installBundle('sentry', BASE, BUNDLES)

    expect(result).toEqual({
      success: true,
      bundle: 'sentry',
      resources: [{ name: 'investigate-sentry', type: 'skills' }],
    })
    expect(copyResourceSpy).toHaveBeenCalledWith(
      `${BUNDLES}/skills/investigate-sentry.md`,
      `${BASE}/skills/investigate-sentry/SKILL.md`
    )
  })

  it('returns copy failure and stops on first copy error', async () => {
    globSpy.mockImplementation(async (pattern, dir) => {
      if (dir.endsWith('/agents')) return ['build.md', 'plan.md']
      return []
    })
    readTextSpy.mockResolvedValue('---\nbundle: build\n---\n')
    copyResourceSpy.mockRejectedValueOnce(new Error('Permission denied')).mockResolvedValueOnce(undefined)

    const result = await installBundle('build', BASE, BUNDLES)

    expect(result).toEqual({
      success: false,
      bundle: 'build',
      reason: 'copy',
      failedResource: { name: 'build', type: 'agents', error: 'Error: Permission denied' },
    })
    expect(copyResourceSpy).toHaveBeenCalledTimes(1)
  })

  it('handles resource in array bundle format', async () => {
    globSpy.mockImplementation(async (pattern, dir) => {
      if (dir.endsWith('/skills')) return ['rspec-structure.md']
      return []
    })
    readTextSpy.mockResolvedValue('---\nbundle:\n  - review\n  - testing\n---\n')

    const reviewResult = await installBundle('review', BASE, BUNDLES)
    expect(reviewResult.success).toBe(true)
    if (reviewResult.success) {
      expect(reviewResult.resources).toEqual([{ name: 'rspec-structure', type: 'skills' }])
    }

    copyResourceSpy.mockClear()

    const testingResult = await installBundle('testing', BASE, BUNDLES)
    expect(testingResult.success).toBe(true)
    if (testingResult.success) {
      expect(testingResult.resources).toEqual([{ name: 'rspec-structure', type: 'skills' }])
    }
  })
})

describe('installBundle verification', () => {
  it('runs verify commands before copying files', async () => {
    const callOrder: string[] = []
    globSpy.mockImplementation(async (pattern, dir) => {
      if (dir.endsWith('/skills')) return ['investigate-sentry.md']
      return []
    })
    readTextSpy.mockResolvedValue('---\nbundle: sentry\nverify:\n  - "sentry --version"\n---\n')
    runCommandSpy.mockImplementation(async () => {
      callOrder.push('verify')
      return { exitCode: 0, stdout: '', stderr: '' }
    })
    copyResourceSpy.mockImplementation(async () => {
      callOrder.push('copy')
    })

    await installBundle('sentry', BASE, BUNDLES)

    expect(callOrder).toEqual(['verify', 'copy'])
  })

  it('does not copy files when verification fails', async () => {
    globSpy.mockImplementation(async (pattern, dir) => {
      if (dir.endsWith('/skills')) return ['investigate-sentry.md']
      return []
    })
    readTextSpy.mockResolvedValue('---\nbundle: sentry\nverify:\n  - "sentry --version"\n---\n')
    runCommandSpy.mockResolvedValue({ exitCode: 127, stdout: '', stderr: 'command not found: sentry' })

    const result = await installBundle('sentry', BASE, BUNDLES)

    expect(copyResourceSpy).not.toHaveBeenCalled()
    expect(result).toEqual({
      success: false,
      bundle: 'sentry',
      reason: 'verify',
      verifyFailure: {
        success: false,
        command: 'sentry --version',
        exitCode: 127,
        output: 'command not found: sentry',
      },
    })
  })

  it('copies files when all verifications pass', async () => {
    globSpy.mockImplementation(async (pattern, dir) => {
      if (dir.endsWith('/skills')) return ['investigate-sentry.md']
      if (dir.endsWith('/commands')) return ['sentry.md']
      return []
    })
    readTextSpy.mockImplementation(async (p) => {
      if (p.includes('/skills/'))
        return '---\nbundle: sentry\nverify:\n  - "sentry --version"\n  - "sentry auth status"\n---\n'
      if (p.includes('/commands/')) return '---\nbundle: sentry\n---\n'
      return ''
    })

    const result = await installBundle('sentry', BASE, BUNDLES)

    expect(runCommandSpy).toHaveBeenCalledTimes(2)
    expect(copyResourceSpy).toHaveBeenCalledTimes(2)
    expect(result).toEqual({
      success: true,
      bundle: 'sentry',
      resources: [
        { name: 'investigate-sentry', type: 'skills' },
        { name: 'sentry', type: 'commands' },
      ],
    })
  })

  it('skips verification when no resources have verify commands', async () => {
    globSpy.mockImplementation(async (pattern, dir) => {
      if (dir.endsWith('/agents')) return ['plan.md']
      return []
    })
    readTextSpy.mockResolvedValue('---\nbundle: review\n---\n')

    const result = await installBundle('review', BASE, BUNDLES)

    expect(runCommandSpy).not.toHaveBeenCalled()
    expect(copyResourceSpy).toHaveBeenCalledTimes(1)
    expect(result.success).toBe(true)
  })

  it('deduplicates verify commands across resources', async () => {
    globSpy.mockImplementation(async (pattern, dir) => {
      if (dir.endsWith('/skills')) return ['investigate-sentry.md']
      if (dir.endsWith('/commands')) return ['sentry.md']
      return []
    })
    readTextSpy.mockImplementation(async (p) => {
      if (p.includes('/skills/')) return '---\nbundle: sentry\nverify:\n  - "sentry --version"\n---\n'
      if (p.includes('/commands/')) return '---\nbundle: sentry\nverify:\n  - "sentry --version"\n---\n'
      return ''
    })

    await installBundle('sentry', BASE, BUNDLES)

    expect(runCommandSpy).toHaveBeenCalledTimes(1)
    expect(runCommandSpy).toHaveBeenCalledWith('sentry --version')
  })
})

describe('installBundle tools', () => {
  it('installs tool files from bundles/tools/<bundle>/', async () => {
    globSpy.mockImplementation(async (pattern, dir) => {
      if (dir.endsWith('/tools/viper') && pattern === '*.ts') return ['viper-write-plan.ts', 'viper-delete-plan.ts']
      return []
    })

    const result = await installBundle('viper', BASE, BUNDLES)

    expect(result).toEqual({
      success: true,
      bundle: 'viper',
      resources: [
        { name: 'viper-write-plan', type: 'tools' },
        { name: 'viper-delete-plan', type: 'tools' },
      ],
    })
    expect(copyResourceSpy).toHaveBeenCalledWith(
      `${BUNDLES}/tools/viper/viper-write-plan.ts`,
      `${BASE}/tools/viper-write-plan.ts`
    )
    expect(copyResourceSpy).toHaveBeenCalledWith(
      `${BUNDLES}/tools/viper/viper-delete-plan.ts`,
      `${BASE}/tools/viper-delete-plan.ts`
    )
  })

  it('installs tools alongside agents/skills/commands', async () => {
    globSpy.mockImplementation(async (pattern, dir) => {
      if (dir.endsWith('/commands') && pattern === '*.md') return ['viper-plan.md']
      if (dir.endsWith('/tools/viper') && pattern === '*.ts') return ['viper-write-plan.ts']
      return []
    })
    readTextSpy.mockResolvedValue('---\nbundle: viper\n---\n')

    const result = await installBundle('viper', BASE, BUNDLES)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.resources).toEqual([
        { name: 'viper-plan', type: 'commands' },
        { name: 'viper-write-plan', type: 'tools' },
      ])
    }
  })

  it('returns not_found when bundle has no tools and no other resources', async () => {
    const result = await installBundle('empty', BASE, BUNDLES)
    expect(result).toEqual({ success: false, bundle: 'empty', reason: 'not_found' })
  })

  it('does not install tools from other bundles', async () => {
    globSpy.mockImplementation(async (pattern, dir) => {
      if (dir.endsWith('/tools/viper') && pattern === '*.ts') return ['viper-write-plan.ts']
      return []
    })

    const result = await installBundle('core', BASE, BUNDLES)

    expect(result).toEqual({ success: false, bundle: 'core', reason: 'not_found' })
    expect(copyResourceSpy).not.toHaveBeenCalled()
  })
})
