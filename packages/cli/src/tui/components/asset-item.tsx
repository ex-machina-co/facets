import { Box, Text, useInput } from 'ink'
import { THEME } from '../theme.ts'

export function AssetItem({
  name,
  isFocused,
  onEdit,
  onRemove,
}: {
  id: string
  name: string
  isFocused: boolean
  onEdit: () => void
  onRemove: () => void
}) {
  useInput(
    (_input, key) => {
      if (key.return) {
        onEdit()
      }
      if (key.delete || key.backspace) {
        onRemove()
      }
    },
    { isActive: isFocused },
  )

  return (
    <Box gap={1} marginLeft={2}>
      {isFocused ? (
        <>
          <Text color={THEME.primary} bold>
            ▸
          </Text>
          <Text color={THEME.primary}>{name}</Text>
          <Text color={THEME.hint}>
            <Text color={THEME.keyword}>Enter</Text> to edit · <Text color={THEME.keyword}>Delete</Text> to remove
          </Text>
        </>
      ) : (
        <>
          <Text color={THEME.success}>•</Text>
          <Text>{name}</Text>
        </>
      )}
    </Box>
  )
}
