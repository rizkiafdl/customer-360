import { afterEach, describe, expect, it, vi } from 'vitest'
import { THEME_KEY, applyTheme, readStoredTheme } from './theme'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

describe('readStoredTheme', () => {
  it('is light when nothing is stored', () => {
    expect(readStoredTheme()).toBe('light')
  })

  it('is dark when dark is stored (a choice made under ADR 0007 is kept)', () => {
    localStorage.setItem(THEME_KEY, 'dark')
    expect(readStoredTheme()).toBe('dark')
  })

  it('is light for an unknown stored value', () => {
    localStorage.setItem(THEME_KEY, 'sepia')
    expect(readStoredTheme()).toBe('light')
  })

  it('is light when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readStoredTheme()).toBe('light')
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
