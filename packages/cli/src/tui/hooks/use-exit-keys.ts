import { useInput } from 'ink'
import { useCallback, useEffect, useRef } from 'react'
import { useFocusMode } from '../context/focus-mode-context.ts'

const EXIT_WINDOW_MS = 3000

/**
 * Handles exit via double-tap Escape with a visible countdown toast.
 *
 * First Escape (when not editing): sets mode to 'exit-modal', starts countdown.
 * Second Escape (while in exit-modal): exits.
 * After 3 seconds: returns to 'form-navigation'.
 * Any other key while in exit-modal: returns to previous mode.
 */
export function useExitKeys(onExit: () => void) {
  const { mode, setMode, setExitSecondsLeft } = useFocusMode()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const previousModeRef = useRef(mode)

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [])

  const dismiss = useCallback(() => {
    setExitSecondsLeft(0)
    clearTimers()
    setMode(previousModeRef.current === 'exit-modal' ? 'form-navigation' : previousModeRef.current)
  }, [clearTimers, setMode, setExitSecondsLeft])

  const startExitWindow = useCallback(() => {
    previousModeRef.current = mode
    setMode('exit-modal')
    setExitSecondsLeft(3)

    clearTimers()

    countdownRef.current = setInterval(() => {
      setExitSecondsLeft((prev: number) => {
        if (prev <= 1) return 0
        return prev - 1
      })
    }, 1000)

    timerRef.current = setTimeout(() => {
      dismiss()
    }, EXIT_WINDOW_MS)
  }, [clearTimers, dismiss, mode, setMode, setExitSecondsLeft])

  useEffect(() => clearTimers, [clearTimers])

  useInput((_input, key) => {
    if (key.escape) {
      if (mode === 'exit-modal') {
        clearTimers()
        onExit()
      } else if (mode !== 'field-revision') {
        startExitWindow()
      }
      return
    }

    // Any other key while in exit-modal dismisses it
    if (mode === 'exit-modal') {
      dismiss()
    }
  })
}
