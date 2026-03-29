import { useApp } from 'ink'
import { useCallback, useState } from 'react'
import type { CreateOptions } from '../../../commands/create-scaffold.ts'
import { FocusModeProvider, useFocusMode } from '../../context/focus-mode-context.ts'
import { FocusOrderProvider } from '../../context/focus-order-context.ts'
import { FormStateProvider, useFormState } from '../../context/form-state-context.ts'
import { useExitKeys } from '../../hooks/use-exit-keys.ts'
import { useNavigationKeys } from '../../hooks/use-navigation-keys.ts'
import { ConfirmView } from './confirm-view.tsx'
import { CreateView } from './create-view.tsx'

export interface CreateWizardProps {
  onComplete: (opts: CreateOptions) => void
  onCancel: () => void
}

function CreateWizardInner({ onComplete, onCancel }: CreateWizardProps) {
  const { exit } = useApp()
  const { setMode } = useFocusMode()
  const { toCreateOptions } = useFormState()

  const [confirming, setConfirming] = useState(false)

  const cancel = useCallback(() => {
    onCancel()
    exit()
  }, [onCancel, exit])

  useExitKeys(cancel)
  useNavigationKeys()

  if (confirming) {
    return (
      <ConfirmView
        opts={toCreateOptions()}
        onConfirm={() => {
          onComplete(toCreateOptions())
          exit()
        }}
        onBack={() => {
          setConfirming(false)
          setMode('form-navigation')
        }}
      />
    )
  }

  return (
    <CreateView
      onSubmit={() => {
        setConfirming(true)
        setMode('form-confirmation')
      }}
    />
  )
}

export function CreateWizard(props: CreateWizardProps) {
  return (
    <FocusModeProvider>
      <FocusOrderProvider>
        <FormStateProvider>
          <CreateWizardInner {...props} />
        </FormStateProvider>
      </FocusOrderProvider>
    </FocusModeProvider>
  )
}
