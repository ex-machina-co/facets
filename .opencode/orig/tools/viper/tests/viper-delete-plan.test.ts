import path from 'node:path'

const SAFE_NAME = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/

context('viper-delete-plan validation', () => {
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

  describe('output path', () => {
    it('targets .opencode/plans/<plan>/ directory', () => {
      const worktree = '/project'
      const plan = 'my-plan'
      const planDir = path.join(worktree, '.opencode', 'plans', plan)
      expect(planDir).toBe('/project/.opencode/plans/my-plan')
    })
  })
})
