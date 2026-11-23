import { afterEach, describe, expect, it, vi } from 'vitest'
import { THEME_KEY, applyTheme, readStoredTheme } from './theme'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

describe('readStoredTheme', () => {
  it('is dark when nothing is stored', () => {
    expect(readStoredTheme()).toBe('dark')
  })

  it('is light when light is stored', () => {
    localStorage.setItem(THEME_KEY, 'light')
    expect(readStoredTheme()).toBe('light')
  })

  it('is dark for an unknown stored value', () => {
    localStorage.setItem(THEME_KEY, 'sepia')
    expect(readStoredTheme()).toBe('dark')
  })

  it('is dark when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readStoredTheme()).toBe('dark')
  })
})

describe('applyTheme', () => {
  it('uses the key "theme"', () => {
    expect(THEME_KEY).toBe('theme')
  })

  it('removes .dark and stores light', () => {
    document.documentElement.classList.add('dark')
    applyTheme('light')
    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('light')
  })

  it('adds .dark and stores dark', () => {
    applyTheme('dark')
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
  })

  it('still switches the class when storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    applyTheme('dark')
    expect(document.documentElement).toHaveClass('dark')
  })
})
