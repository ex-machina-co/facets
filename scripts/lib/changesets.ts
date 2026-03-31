/**
 * Given a list of filenames from the .changeset directory,
 * returns only the ones that are actual changesets (not README.md).
 */
export function filterPendingChangesets(files: string[]): string[] {
  return files.filter((f) => f.endsWith('.md') && f !== 'README.md')
}

/**
 * Determine whether we should publish (no pending changesets)
 * or create a version PR (pending changesets exist).
 */
export function shouldPublish(pendingChangesets: string[]): boolean {
  return pendingChangesets.length === 0
}
