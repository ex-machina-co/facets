import { THEME } from './theme.ts'

/** Fixed number of gradient stops — ensures consistent animation speed regardless of text length */
const GRADIENT_STOP_COUNT = 32

function toHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function lerpRgb(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

/** Pre-computed gradient loop with fixed stop count for consistent animation */
function generateGradientLoop(): string[] {
  const [colorA, colorB, colorC] = THEME.gradientRGB
  const colors: string[] = []
  for (let i = 0; i < GRADIENT_STOP_COUNT; i++) {
    const segment = ((i / GRADIENT_STOP_COUNT) * 3) % 3
    let rgb: [number, number, number]
    if (segment < 1) {
      rgb = lerpRgb(colorA, colorB, segment)
    } else if (segment < 2) {
      rgb = lerpRgb(colorB, colorC, segment - 1)
    } else {
      rgb = lerpRgb(colorC, colorA, segment - 2)
    }
    colors.push(toHex(...rgb))
  }
  return colors
}

/** Pre-computed stops — shared by all animated gradients */
export const GRADIENT_STOPS = generateGradientLoop()

/** Get the gradient colors at a given offset for animation */
export function getAnimatedGradient(offset: number): string[] {
  const i = offset % GRADIENT_STOPS.length
  return [...GRADIENT_STOPS.slice(i), ...GRADIENT_STOPS.slice(0, i)]
}
