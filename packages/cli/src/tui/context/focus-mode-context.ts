import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { createContext, createElement, useContext, useMemo, useState } from 'react'

export type FocusMode =
  | 'form-navigation'
  | 'field-initial-entry'
  | 'field-revision'
  | 'exit-modal'
  | 'form-confirmation'

interface FocusModeState {
  mode: FocusMode
  setMode: (mode: FocusMode) => void
  exitSecondsLeft: number
  setExitSecondsLeft: Dispatch<SetStateAction<number>>
}

const FocusModeContext = createContext<FocusModeState>({
  mode: 'form-navigation',
  setMode: () => {},
  exitSecondsLeft: 0,
  setExitSecondsLeft: () => {},
})

export function FocusModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<FocusMode>('form-navigation')
  const [exitSecondsLeft, setExitSecondsLeft] = useState(0)

  const value = useMemo(() => ({ mode, setMode, exitSecondsLeft, setExitSecondsLeft }), [mode, exitSecondsLeft])

  return createElement(FocusModeContext.Provider, { value }, children)
}

export function useFocusMode() {
  return useContext(FocusModeContext)
}
