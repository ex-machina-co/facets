import yaml from 'js-yaml'
import * as bun from './bun'

export interface VerifySuccess {
  success: true
}

export interface VerifyFailure {
  success: false
  command: string
  exitCode: number
  output: string
}

export type VerifyResult = VerifySuccess | VerifyFailure

export function parseVerifyCommands(content: string): string[] {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return []

  let frontmatter: Record<string, unknown>
  try {
    frontmatter = yaml.load(match[1]) as Record<string, unknown>
  } catch {
    return []
  }

  const verify = frontmatter?.verify
  if (!Array.isArray(verify)) return []
  if (!verify.every((v) => typeof v === 'string')) return []

  return verify
}

export async function runVerifyCommands(commands: string[]): Promise<VerifyResult> {
  for (const command of commands) {
    const result = await bun.runCommand(command)
    if (result.exitCode !== 0) {
      return {
        success: false,
        command,
        exitCode: result.exitCode,
        output: (result.stderr + result.stdout).trim(),
      }
    }
  }

  return { success: true }
}
