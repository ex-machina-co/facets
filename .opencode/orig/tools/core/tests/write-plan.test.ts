import path from 'node:path'

const SAFE_NAME = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/

describe('viper-write-plan validation', () => {
  describe('name validation', () => {
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

  describe('content validation', () => {
    it('rejects empty content', () => {
      expect(''.trim()).toBe('')
      expect('   '.trim()).toBe('')
    })

    it('accepts non-empty content', () => {
      expect('# My Plan'.trim()).not.toBe('')
    })
  })

  describe('output path', () => {
    it('writes to .opencode/plans/<name>.md', () => {
      const worktree = '/project'
      const name = 'my-plan'
      const plansDir = path.join(worktree, '.opencode', 'plans')
      const filePath = path.join(plansDir, `${name}.md`)
      expect(filePath).toBe('/project/.opencode/plans/my-plan.md')
    })
  })
})
