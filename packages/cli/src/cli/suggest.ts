function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const row: number[] = []

  for (let j = 0; j <= n; j++) row.push(j)

  for (let i = 1; i <= m; i++) {
    let prev = row[0] ?? 0
    row[0] = i
    for (let j = 1; j <= n; j++) {
      const current = row[j] ?? 0
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(current + 1, (row[j - 1] ?? 0) + 1, prev + cost)
      prev = current
    }
  }

  return row[n] ?? 0
}

export function findClosestCommand(input: string, commandNames: string[]): string | undefined {
  let best: string | undefined
  let bestDistance = Infinity

  for (const name of commandNames) {
    const distance = levenshtein(input, name)
    if (distance < bestDistance) {
      bestDistance = distance
      best = name
    }
  }

  return bestDistance <= 3 ? best : undefined
}
