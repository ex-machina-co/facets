import path from 'path'

export interface ShellResult {
  exitCode: number
  stdout: string
  stderr: string
}

export async function fileExists(p: string): Promise<boolean> {
  return Bun.file(p).exists()
}

export async function readText(p: string): Promise<string> {
  return Bun.file(p).text()
}

export async function glob(pattern: string, dir: string): Promise<string[]> {
  const hits: string[] = []
  for await (const hit of new Bun.Glob(pattern).scan(dir)) {
    hits.push(hit)
  }
  return hits
}

export async function copyResource(src: string, dst: string): Promise<void> {
  await Bun.$`mkdir -p ${path.dirname(dst)} && cp ${src} ${dst}`
}

export async function listDirs(dir: string): Promise<string[]> {
  try {
    const result = await Bun.$`ls -d ${dir}/*/`.nothrow().quiet()
    if (result.exitCode !== 0) return []
    return result.stdout
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((p) => path.basename(p.replace(/\/$/, '')))
  } catch {
    return []
  }
}

export async function runCommand(command: string): Promise<ShellResult> {
  const result = await Bun.$`${{ raw: command }}`.nothrow().quiet()
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  }
}
