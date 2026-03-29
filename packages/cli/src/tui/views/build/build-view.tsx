import { runBuildPipeline, writeBuildOutput } from '@ex-machina/facet-core'
import { Box, Text, useApp } from 'ink'
import { useCallback, useEffect, useState } from 'react'
import type { Stage } from '../../components/stage-row.tsx'
import { StageRow } from '../../components/stage-row.tsx'
import { THEME } from '../../theme.ts'

interface BuildResult {
  name: string
  version: string
  files: string[]
  warnings: string[]
}

export function BuildView({
  rootDir,
  onSuccess,
  onFailure,
}: {
  rootDir: string
  onSuccess?: (name: string, version: string, fileCount: number) => void
  onFailure?: (errorCount: number) => void
}) {
  const { exit } = useApp()
  const [stages, setStages] = useState<Stage[]>([
    { label: 'Validating manifest', status: 'pending' },
    { label: 'Writing output', status: 'pending' },
  ])
  const [result, setResult] = useState<BuildResult | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])

  const updateStage = useCallback((index: number, update: Partial<Stage>) => {
    setStages((prev) => prev.map((s, i) => (i === index ? { ...s, ...update } : s)))
  }, [])

  useEffect(() => {
    async function run() {
      // Stage 1: Validate
      updateStage(0, { status: 'running' })
      const pipelineResult = await runBuildPipeline(rootDir)
      setWarnings(pipelineResult.warnings)

      if (!pipelineResult.ok) {
        updateStage(0, { status: 'failed' })
        setErrors(pipelineResult.errors.map((e) => `${e.path ? `${e.path}: ` : ''}${e.message}`))
        onFailure?.(pipelineResult.errors.length)
        exit(new Error('Build failed'))
        return
      }
      updateStage(0, { status: 'done' })

      // Stage 2: Write output
      updateStage(1, { status: 'running' })
      try {
        await writeBuildOutput(pipelineResult.data, rootDir)

        // Derive file list from resolved manifest
        const files: string[] = ['facet.yaml']
        if (pipelineResult.data.skills) {
          for (const name of Object.keys(pipelineResult.data.skills)) {
            files.push(`skills/${name}.md`)
          }
        }
        if (pipelineResult.data.agents) {
          for (const name of Object.keys(pipelineResult.data.agents)) {
            files.push(`agents/${name}.md`)
          }
        }
        if (pipelineResult.data.commands) {
          for (const name of Object.keys(pipelineResult.data.commands)) {
            files.push(`commands/${name}.md`)
          }
        }

        updateStage(1, { status: 'done' })
        setResult({
          name: pipelineResult.data.name,
          version: pipelineResult.data.version,
          files,
          warnings: pipelineResult.warnings,
        })
        onSuccess?.(pipelineResult.data.name, pipelineResult.data.version, files.length)
        exit()
      } catch (err) {
        updateStage(1, { status: 'failed', detail: String(err) })
        exit(err instanceof Error ? err : new Error(String(err)))
      }
    }

    run()
  }, [rootDir, exit, onSuccess, onFailure, updateStage])

  return (
    <Box flexDirection="column" padding={1} gap={1}>
      <Text bold color={THEME.brand}>
        Building facet...
      </Text>

      <Box flexDirection="column">
        {stages.map((s) => (
          <StageRow key={s.label} stage={s} />
        ))}
      </Box>

      {warnings.length > 0 && (
        <Box flexDirection="column">
          {warnings.map((w) => (
            <Text key={w} color={THEME.warning}>
              {' '}
              ⚠ {w}
            </Text>
          ))}
        </Box>
      )}

      {errors.length > 0 && (
        <Box flexDirection="column">
          <Text bold color={THEME.warning}>
            Errors:
          </Text>
          {errors.map((e) => (
            <Text key={e} color={THEME.warning}>
              {' '}
              {e}
            </Text>
          ))}
        </Box>
      )}

      {result && (
        <Box flexDirection="column">
          <Text color={THEME.success} bold>
            Built successfully → dist/
          </Text>
          {result.files.map((f) => (
            <Text key={f}> {f}</Text>
          ))}
          <Text color={THEME.hint}>
            {result.files.length} artifact{result.files.length !== 1 ? 's' : ''}
          </Text>
          <Box marginTop={1}>
            <Text color={THEME.hint}>Next: facet publish (coming soon)</Text>
          </Box>
        </Box>
      )}
    </Box>
  )
}
