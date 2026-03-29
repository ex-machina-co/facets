import { Box, Text, useInput } from 'ink'
import { useState } from 'react'

export function VersionSelector({
  value,
  onChange,
  onSubmit,
  active,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  active: boolean
}) {
  const parts = value.split('.').map(Number)
  const [cursor, setCursor] = useState(0) // 0=major, 1=minor, 2=patch

  useInput(
    (input, key) => {
      if (!active) return

      if (key.return) {
        onSubmit()
        return
      }
      // Tab and left/right all move between segments
      if (key.leftArrow || (key.shift && key.tab)) {
        setCursor((c) => Math.max(0, c - 1))
        return
      }
      if (key.rightArrow || key.tab) {
        setCursor((c) => Math.min(2, c + 1))
        return
      }
      if (key.upArrow) {
        const next = [...parts]
        next[cursor] = (next[cursor] ?? 0) + 1
        onChange(next.join('.'))
        return
      }
      if (key.downArrow) {
        const next = [...parts]
        next[cursor] = Math.max(0, (next[cursor] ?? 0) - 1)
        onChange(next.join('.'))
        return
      }
      // Allow typing a full version directly
      if (key.backspace) {
        onChange(value.slice(0, -1))
        return
      }
      if (/[0-9.]/.test(input)) {
        onChange(value + input)
        return
      }
    },
    { isActive: active },
  )

  const segments = value.split('.')
  return (
    <Box gap={0}>
      {segments.map((seg, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: version segments are always positional (major.minor.patch)
        <Box key={i}>
          {i > 0 && <Text dimColor>.</Text>}
          <Text
            bold={active && cursor === i}
            color={active && cursor === i ? 'cyan' : undefined}
            inverse={active && cursor === i}
          >
            {seg}
          </Text>
        </Box>
      ))}
      {active && <Text dimColor>← → to select, ↑ ↓ to change, Enter to confirm</Text>}
    </Box>
  )
}
