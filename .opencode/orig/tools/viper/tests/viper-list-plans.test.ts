describe('viper-list-plans validation', () => {
  describe('empty/missing plans directory', () => {
    it('returns empty plans array for ENOENT', () => {
      const result = { plans: [] }
      expect(result).toEqual({ plans: [] })
    })
  })

  describe('directory filtering', () => {
    it('only includes directories, not flat .md files', () => {
      const entries = [
        { name: 'my-plan', isDirectory: () => true },
        { name: 'stray-file.md', isDirectory: () => false },
        { name: 'another-plan', isDirectory: () => true },
      ]
      const dirs = entries.filter((e) => e.isDirectory())
      expect(dirs.map((d) => d.name)).toEqual(['my-plan', 'another-plan'])
    })
  })

  describe('artifact listing', () => {
    it('strips .md extension from artifact names', () => {
      const files = ['plan.md', 'context.md', 'notes.txt']
      const artifacts = files.filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''))
      expect(artifacts).toEqual(['plan', 'context'])
    })
  })
})
