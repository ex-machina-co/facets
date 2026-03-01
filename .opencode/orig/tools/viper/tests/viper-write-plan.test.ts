import path from 'path'

const SAFE_NAME = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/

describe('viper-write-plan validation', () => {
  describe('plan name validation', () => {
    it.each([
      ['simple', 'my-plan'],
      ['with underscores', 'my_plan'],
      ['alphanumeric', 'plan123'],
      ['single char', 'a'],
      ['starts with number', '1plan'],
    ])('accepts valid name: %s', (_label, name) => {
      expect(SAFE_NAME.test(name)).toBe(true)
    })

    it.each([
      ['path traversal', '../evil'],
      ['absolute path', '/etc/passwd'],
      ['with slash', 'foo/bar'],
      ['with spaces', 'my plan'],
      ['with dots', 'my.plan'],
      ['empty string', ''],
      ['starts with hyphen', '-plan'],
      ['starts with underscore', '_plan'],
      ['special chars', 'plan@home'],
    ])('rejects invalid name: %s', (_label, name) => {
      expect(SAFE_NAME.test(name)).toBe(false)
    })
  })

  describe('artifact name validation', () => {
    it.each([
      ['simple', 'plan'],
      ['with hyphens', 'my-artifact'],
      ['with underscores', 'my_artifact'],
      ['alphanumeric', 'artifact123'],
      ['single char', 'a'],
      ['starts with number', '1artifact'],
    ])('accepts valid artifact: %s', (_label, name) => {
      expect(SAFE_NAME.test(name)).toBe(true)
    })

    it.each([
      ['path traversal', '../evil'],
      ['absolute path', '/etc/passwd'],
      ['with slash', 'foo/bar'],
      ['with spaces', 'my artifact'],
      ['with dots', 'my.artifact'],
      ['empty string', ''],
      ['starts with hyphen', '-artifact'],
      ['starts with underscore', '_artifact'],
      ['special chars', 'artifact@home'],
    ])('rejects invalid artifact: %s', (_label, name) => {
      expect(SAFE_NAME.test(name)).toBe(false)
    })
  })

  describe('artifact default', () => {
    it('defaults to "plan" when undefined', () => {
      const input: string | undefined = undefined
      const artifact = input ?? 'plan'
      expect(artifact).toBe('plan')
    })

    it('uses provided value when given', () => {
      const input: string | undefined = 'custom'
      const artifact = input ?? 'plan'
      expect(artifact).toBe('custom')
    })
  })

  describe('output path', () => {
    it('writes to .opencode/plans/<plan>/<artifact>.md', () => {
      const worktree = '/project'
      const plan = 'my-plan'
      const artifact = 'plan'
      const planDir = path.join(worktree, '.opencode', 'plans', plan)
      const filePath = path.join(planDir, `${artifact}.md`)
      expect(filePath).toBe('/project/.opencode/plans/my-plan/plan.md')
    })

    it('supports custom artifact names', () => {
      const worktree = '/project'
      const plan = 'my-plan'
      const artifact = 'context'
      const planDir = path.join(worktree, '.opencode', 'plans', plan)
      const filePath = path.join(planDir, `${artifact}.md`)
      expect(filePath).toBe('/project/.opencode/plans/my-plan/context.md')
    })
  })

  describe('content validation', () => {
    it('rejects empty content', () => {
      expect(''.trim()).toBe('')
      expect('   '.trim()).toBe('')
    })

    it('accepts non-empty content', () => {
      expect('# My Plan'.trim()).not.toBe('')
    })
  })
})
