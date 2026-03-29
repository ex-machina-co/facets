import { Box, Text } from 'ink'
import { useState } from 'react'
import { useFocusMode } from '../context/focus-mode-context.ts'
import { useFocusOrder } from '../context/focus-order-context.ts'
import type { AssetSectionKey } from '../context/form-state-context.ts'
import { useFormState } from '../context/form-state-context.ts'
import { AssetInlineInput } from './asset-inline-input.tsx'
import { AssetItem } from './asset-item.tsx'
import { Button } from './button.tsx'

export function AssetSection({
  section,
  label,
  defaultName,
  dimmed,
  validate,
}: {
  section: AssetSectionKey
  label: string
  defaultName?: string
  dimmed?: boolean
  validate?: (value: string) => string | undefined
}) {
  const { form, addAsset, removeAsset, renameAsset, setAssetAdding, setAssetEditing } = useFormState()
  const { items, editing, adding } = form.assets[section]
  const { setMode } = useFocusMode()
  const { focusedId, focus } = useFocusOrder()
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')

  const startAdding = () => {
    setAssetAdding(section, true)
    setInputValue('')
    setError('')
    setMode('field-revision')
  }

  const startEditing = (name: string) => {
    setAssetEditing(section, name)
    setInputValue(name)
    setError('')
    setMode('field-revision')
  }

  const closeInput = () => {
    setAssetAdding(section, false)
    setAssetEditing(section, undefined)
    setInputValue('')
    setError('')
    setMode('form-navigation')
    focus(`add-${section}`)
  }

  const handleRemove = (name: string) => {
    const index = items.indexOf(name)
    removeAsset(section, name)

    if (index < items.length - 1) {
      focus(`item-${section}-${index}`)
    } else if (index > 0) {
      focus(`item-${section}-${index - 1}`)
    } else {
      focus(`add-${section}`)
    }
  }

  return (
    <Box flexDirection="column" gap={0}>
      <Box gap={1}>
        <Text bold dimColor={dimmed}>
          {label}
        </Text>
        {items.length === 0 && !adding && <Text dimColor>(none)</Text>}
      </Box>

      {items.map((item, i) => {
        const itemId = `item-${section}-${i}`
        const isFocusedItem = focusedId === itemId

        if (editing === item) {
          return (
            <AssetInlineInput
              key={itemId}
              id={itemId}
              value={inputValue}
              placeholder={item}
              error={error}
              isFocused={isFocusedItem}
              onChange={setInputValue}
              validate={validate}
              onError={setError}
              onSubmit={(newName) => {
                renameAsset(section, item, newName)
                closeInput()
              }}
              onCancel={closeInput}
            />
          )
        }

        return (
          <AssetItem
            key={itemId}
            id={itemId}
            name={item}
            isFocused={isFocusedItem}
            onEdit={() => startEditing(item)}
            onRemove={() => handleRemove(item)}
          />
        )
      })}

      {adding ? (
        <AssetInlineInput
          id={`add-${section}`}
          value={inputValue}
          placeholder={defaultName}
          error={error}
          isFocused={focusedId === `add-${section}`}
          onChange={setInputValue}
          validate={validate}
          onError={setError}
          onSubmit={(name) => {
            addAsset(section, name)
            closeInput()
          }}
          onCancel={closeInput}
        />
      ) : (
        <Box marginLeft={2}>
          <Button
            id={`add-${section}`}
            label="+ Add"
            hint={
              <Text dimColor>
                <Text>Enter</Text> to add
              </Text>
            }
            onPress={startAdding}
          />
        </Box>
      )}
    </Box>
  )
}
