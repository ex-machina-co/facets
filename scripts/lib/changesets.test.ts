import { describe, expect, test } from 'bun:test'
import { filterPendingChangesets, shouldPublish } from './changesets'

describe('filterPendingChangesets', () => {
  test('returns empty array when no files', () => {
    expect(filterPendingChangesets([])).toEqual([])
  })

  test('filters out README.md', () => {
    expect(filterPendingChangesets(['README.md'])).toEqual([])
  })

  test('returns only .md files that are not README.md', () => {
    const files = ['README.md', 'funny-turtle.md', 'brave-lion.md']
    expect(filterPendingChangesets(files)).toEqual(['funny-turtle.md', 'brave-lion.md'])
  })

  test('filters out non-.md files', () => {
    const files = ['funny-turtle.md', 'config.json', 'notes.txt']
    expect(filterPendingChangesets(files)).toEqual(['funny-turtle.md'])
  })

  test('handles mix of everything', () => {
    const files = ['README.md', 'funny-turtle.md', 'config.json', 'brave-lion.md', '.gitkeep']
    expect(filterPendingChangesets(files)).toEqual(['funny-turtle.md', 'brave-lion.md'])
  })
})

describe('shouldPublish', () => {
  test('returns true when no pending changesets', () => {
    expect(shouldPublish([])).toBe(true)
  })

  test('returns false when there are pending changesets', () => {
    expect(shouldPublish(['funny-turtle.md'])).toBe(false)
  })

  test('returns false when multiple pending changesets', () => {
    expect(shouldPublish(['funny-turtle.md', 'brave-lion.md'])).toBe(false)
  })
})
