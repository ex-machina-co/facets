import { expect, test } from 'bun:test'
import { BRAND, BRIGHTNESS, hexToRgb, PALETTE } from '../colors.ts'

test('hexToRgb parses brand purple', () => {
  expect(hexToRgb(BRAND.purple)).toEqual([167, 139, 250])
})

test('hexToRgb parses brand green', () => {
  expect(hexToRgb(BRAND.green)).toEqual([66, 205, 170])
})

test('hexToRgb parses brand coral', () => {
  expect(hexToRgb(BRAND.coral)).toEqual([250, 139, 141])
})

test('PALETTE violet400 matches BRAND purple', () => {
  expect(PALETTE.violet400).toBe(BRAND.purple)
})

test('BRIGHTNESS has dim and dimmer values', () => {
  expect(BRIGHTNESS.dim).toBe('#666666')
  expect(BRIGHTNESS.dimmer).toBe('#999999')
})
