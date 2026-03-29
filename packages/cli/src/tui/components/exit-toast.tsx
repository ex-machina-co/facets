import { Box, Text } from 'ink'
import { useFocusMode } from '../context/focus-mode-context.ts'
import { THEME } from '../theme.ts'

export function ExitFooter() {
  const { mode, exitSecondsLeft } = useFocusMode()
  const visible = mode === 'exit-modal' && exitSecondsLeft > 0

  return (
    <Box marginTop={1}>
      {visible ? (
        <Text color={THEME.warning} bold>
          Press Escape again to exit ({exitSecondsLeft}s) — any other key to cancel
        </Text>
      ) : (
        <Text> </Text>
      )}
    </Box>
  )
}
