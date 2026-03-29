/**
 * Facet brand colors — derived from the facet.svg icon.
 */
const BRAND = {
  purple: '#A78BFA',
  green: '#42CDAA',
  coral: '#FA8B8D',
  dark: '#1F1F28',
} as const

/**
 * Text brightness scale — raw color values.
 */
const BRIGHTNESS = {
  dim: '#666666',
  dimmer: '#999999',
} as const

/**
 * Parse a hex color string into an RGB tuple.
 */
function hexToRgb(hex: string): readonly [number, number, number] {
  const h = hex.replace('#', '')
  return [
    // we parse hex color string into an RGB tuple
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ] as const
}

/**
 * Exported theme — all values are semantic references to internal constants.
 * Components should only use THEME, never the raw constants above.
 */
export const THEME = {
  // Brand hierarchy
  primary: BRAND.purple,
  secondary: BRAND.green,
  tertiary: BRAND.coral,
  brand: BRAND.purple,
  dark: BRAND.dark,

  // Semantic aliases (can diverge from brand later)
  success: BRAND.green,
  warning: BRAND.coral,

  // Text — structural
  hint: BRIGHTNESS.dim,
  keyword: BRIGHTNESS.dimmer,

  // Three-color gradient: purple → teal → coral
  gradient: [BRAND.purple, BRAND.green, BRAND.coral] as const,
  gradientRGB: [hexToRgb(BRAND.purple), hexToRgb(BRAND.green), hexToRgb(BRAND.coral)] as const,
} as const
