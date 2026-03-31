/**
 * Core brand colors — derived from the facet.svg icon.
 */
export const BRAND = {
  purple: '#A78BFA',
  green: '#42CDAA',
  coral: '#FA8B8D',
  dark: '#1F1F28',
} as const

/**
 * Extended palette — includes docs/marketing variants.
 */
export const PALETTE = {
  violet400: '#A78BFA',
  violet700: '#6D28D9',
  violet900: '#4C1D95',
  green: '#42CDAA',
  coral: '#FA8B8D',
  dark: '#1F1F28',
} as const

/**
 * Text brightness scale.
 */
export const BRIGHTNESS = {
  dim: '#666666',
  dimmer: '#999999',
} as const

/**
 * Parse a hex color string into an RGB tuple.
 */
export function hexToRgb(hex: string): readonly [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)] as const
}
