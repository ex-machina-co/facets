import { useInput } from 'ink'
import { useFocusMode } from '../context/focus-mode-context.ts'
import { useFocusOrder } from '../context/focus-order-context.ts'

export function useNavigationKeys() {
  const { mode } = useFocusMode()
  const { focusNext, focusPrevious } = useFocusOrder()

  const isActive = mode === 'form-navigation' || mode === 'form-confirmation'

  useInput(
    (_input, key) => {
      if (key.downArrow || key.tab) {
        focusNext()
        return
      }
      if (key.upArrow || (key.shift && key.tab)) {
        focusPrevious()
        return
      }
      if (mode === 'form-confirmation') {
        if (key.rightArrow) {
          focusNext()
          return
        }
        if (key.leftArrow) {
          focusPrevious()
          return
        }
      }
    },
    { isActive },
  )
}
