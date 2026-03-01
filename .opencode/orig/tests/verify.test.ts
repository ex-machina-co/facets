import * as bun from '../bun'
import { parseVerifyCommands, runVerifyCommands } from '../verify'

const runCommandSpy = jest.spyOn(bun, 'runCommand')

beforeEach(() => {
  jest.resetAllMocks()
})

const validList = `---
bundle: sentry
verify:
  - "sentry --version"
  - "sentry auth status"
---`

const singleCommand = `---
bundle: jira
verify:
  - "acli --version"
---`

const emptyList = `---
bundle: review
verify: []
---`

const noVerifyField = `---
bundle: review
description: No verify field
---`

const noFrontmatter = '# Just markdown\nNo frontmatter here'

const verifyIsString = `---
bundle: sentry
verify: "sentry --version"
---`

const verifyIsNumber = `---
bundle: sentry
verify: 42
---`

const verifyContainsNonString = `---
bundle: sentry
verify:
  - "sentry --version"
  - 42
---`

const windowsLineEndings = '---\r\nbundle: sentry\r\nverify:\r\n  - "sentry --version"\r\n---'

describe('parseVerifyCommands', () => {
  it.each([
    ['valid list', validList, ['sentry --version', 'sentry auth status']],
    ['single command', singleCommand, ['acli --version']],
    ['empty list', emptyList, []],
    ['windows line endings', windowsLineEndings, ['sentry --version']],
  ])('parses: %s', (_label, content, expected) => {
    expect(parseVerifyCommands(content)).toEqual(expected)
  })

  it.each([
    ['no frontmatter', noFrontmatter],
    ['no verify field', noVerifyField],
    ['verify is a string', verifyIsString],
    ['verify is a number', verifyIsNumber],
    ['verify contains non-string', verifyContainsNonString],
  ])('returns empty array: %s', (_label, content) => {
    expect(parseVerifyCommands(content)).toEqual([])
  })
})

describe('runVerifyCommands', () => {
  it('returns success when all commands pass', async () => {
    runCommandSpy.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })

    const result = await runVerifyCommands(['sentry --version', 'sentry auth status'])

    expect(result).toEqual({ success: true })
    expect(runCommandSpy).toHaveBeenCalledTimes(2)
    expect(runCommandSpy).toHaveBeenCalledWith('sentry --version')
    expect(runCommandSpy).toHaveBeenCalledWith('sentry auth status')
  })

  it('returns success for empty command list', async () => {
    const result = await runVerifyCommands([])

    expect(result).toEqual({ success: true })
    expect(runCommandSpy).not.toHaveBeenCalled()
  })

  it('returns failure on first failing command', async () => {
    runCommandSpy.mockResolvedValue({ exitCode: 127, stdout: '', stderr: 'command not found: sentry' })

    const result = await runVerifyCommands(['sentry --version'])

    expect(result).toEqual({
      success: false,
      command: 'sentry --version',
      exitCode: 127,
      output: 'command not found: sentry',
    })
  })

  it('stops on first failure and does not run subsequent commands', async () => {
    runCommandSpy.mockResolvedValueOnce({ exitCode: 127, stdout: '', stderr: 'not found' })

    const result = await runVerifyCommands(['sentry --version', 'sentry auth status'])

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.command).toBe('sentry --version')
    }
    expect(runCommandSpy).toHaveBeenCalledTimes(1)
  })

  it('returns failure with output when a later command fails', async () => {
    runCommandSpy
      .mockResolvedValueOnce({ exitCode: 0, stdout: '1.0.0', stderr: '' })
      .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: 'not authenticated' })

    const result = await runVerifyCommands(['sentry --version', 'sentry auth status'])

    expect(result).toEqual({
      success: false,
      command: 'sentry auth status',
      exitCode: 1,
      output: 'not authenticated',
    })
    expect(runCommandSpy).toHaveBeenCalledTimes(2)
  })

  it('combines stderr and stdout in output', async () => {
    runCommandSpy.mockResolvedValue({ exitCode: 1, stdout: 'some stdout', stderr: 'some stderr' })

    const result = await runVerifyCommands(['failing-cmd'])

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.output).toBe('some stderrsome stdout')
    }
  })
})
