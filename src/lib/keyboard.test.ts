import { describe, expect, it } from 'vitest'
import { isApplePlatform, isSpotlightShortcut, shortcutLabel, wrapIndex } from './keyboard'

describe('isApplePlatform', () => {
  it.each([
    ['MacIntel', true],
    ['iPhone', true],
    ['iPad', true],
    ['Win32', false],
    ['Linux x86_64', false],
    ['', false],
  ])('isApplePlatform(%j) is %s', (platform, expected) => {
    expect(isApplePlatform(platform)).toBe(expected)
  })
})

describe('shortcutLabel', () => {
  it('labels the shortcut ⌘K on Apple and Ctrl K elsewhere', () => {
    expect(shortcutLabel('MacIntel')).toBe('⌘K')
    expect(shortcutLabel('Win32')).toBe('Ctrl K')
  })
})

describe('isSpotlightShortcut', () => {
  it.each([
    [{ key: 'k', metaKey: true, ctrlKey: false }, true],
    [{ key: 'K', metaKey: false, ctrlKey: true }, true],
    [{ key: 'k', metaKey: false, ctrlKey: false }, false],
    [{ key: 'j', metaKey: false, ctrlKey: true }, false],
  ])('isSpotlightShortcut(%j) is %s', (event, expected) => {
    expect(isSpotlightShortcut(event)).toBe(expected)
  })
})

describe('wrapIndex', () => {
  it.each([
    [-1, 10, 9],
    [10, 10, 0],
    [3, 10, 3],
    [0, 0, 0],
    [-1, 0, 0],
  ])('wrapIndex(%d, %d) is %d', (index, count, expected) => {
    expect(wrapIndex(index, count)).toBe(expected)
  })
})
