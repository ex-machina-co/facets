import { Box, Text } from 'ink'
import Gradient from 'ink-gradient'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { ExitFooter } from '../components/exit-toast.tsx'
import { GRADIENT_STOPS, getAnimatedGradient } from '../gradient.ts'
import { THEME } from '../theme.ts'

const ANIMATION_INTERVAL_MS = 75

function AnimatedGradientText({ text }: { text: string }) {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setOffset((prev) => (prev + 1) % GRADIENT_STOPS.length)
    }, ANIMATION_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  return (
    <Gradient colors={getAnimatedGradient(offset)}>
      <Text bold>{text}</Text>
    </Gradient>
  )
}

export function WizardLayout({ children }: { children: ReactNode }) {
  return (
    <Box flexDirection="column" padding={1} gap={1}>
      <Box borderStyle="round" borderColor={THEME.brand} paddingX={2} gap={1}>
        <Text bold color={THEME.brand}>
          Create a new
        </Text>
        <AnimatedGradientText text="FACET" />
      </Box>
      {children}
      <ExitFooter />
    </Box>
  )
}
