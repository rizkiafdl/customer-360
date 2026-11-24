// @vitest-environment node
/**
 * Contrast test for the theme tokens in src/index.css (ADR 0009). Pairs and
 * minimum ratios: text >= 4.5:1, non-text
 * UI (chart colors, focus ring) >= 3:1.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrastOver, contrastRatio, inGamut, parseAlpha, parseOklch, parseThemeBlocks } from './contrast.ts'

describe('parseOklch', () => {
  it('reads lightness, chroma, and hue', () => {
    expect(parseOklch('oklch(0.5 0.1 120)')).toEqual({ l: 0.5, c: 0.1, h: 120 })
  })

  it('reads a percentage lightness and ignores alpha', () => {
    expect(parseOklch('oklch(50% 0 0 / 10%)')).toEqual({ l: 0.5, c: 0, h: 0 })
  })

  it('throws for a value that is not oklch', () => {
    expect(() => parseOklch('#ffffff')).toThrow(/oklch/)
  })
})

describe('contrastRatio', () => {
  it('is 21 for white on black', () => {
    expect(contrastRatio('oklch(1 0 0)', 'oklch(0 0 0)')).toBeCloseTo(21, 1)
  })

  it('is 1 for a color on itself and does not depend on the order', () => {
    expect(contrastRatio('oklch(0.6 0.1 200)', 'oklch(0.6 0.1 200)')).toBeCloseTo(1, 5)
    expect(contrastRatio('oklch(0.3 0 0)', 'oklch(0.9 0 0)')).toBe(
      contrastRatio('oklch(0.9 0 0)', 'oklch(0.3 0 0)'),
    )
  })

  it('matches the WCAG value for mid grey on white (#777 is about 4.48)', () => {
    // #777777 is oklch(0.5693 0 0).
    expect(contrastRatio('oklch(0.5693 0 0)', 'oklch(1 0 0)')).toBeCloseTo(4.48, 1)
  })
})

describe('inGamut', () => {
  it('is true for grey and false for a chroma sRGB cannot show', () => {
    expect(inGamut('oklch(0.5 0 0)')).toBe(true)
    expect(inGamut('oklch(0.9 0.3 150)')).toBe(false)
  })
})

describe('parseAlpha', () => {
  it('is 1 with no alpha', () => {
    expect(parseAlpha('oklch(0.5 0.1 120)')).toBe(1)
  })

  it('reads a percent alpha', () => {
    expect(parseAlpha('oklch(1 0 0 / 74%)')).toBe(0.74)
  })

  it('reads a number alpha', () => {
    expect(parseAlpha('oklch(1 0 0 / 0.3)')).toBe(0.3)
  })
})

describe('contrastOver', () => {
  it('matches contrastRatio on one opaque layer', () => {
    expect(contrastOver('oklch(0.5693 0 0)', ['oklch(1 0 0)'])).toBeCloseTo(4.48, 1)
  })

  it('blends 50% black over white in gamma-encoded sRGB', () => {
    expect(
      contrastOver('oklch(0 0 0)', ['oklch(1 0 0)', 'oklch(0 0 0 / 50%)']),
    ).toBeCloseTo(5.28, 1)
  })

  it('lets an opaque top layer hide the base', () => {
    expect(contrastOver('oklch(1 0 0)', ['oklch(1 0 0)', 'oklch(0 0 0)'])).toBeCloseTo(21, 1)
  })

  it('throws when the first layer is not opaque', () => {
    expect(() => contrastOver('oklch(0 0 0)', ['oklch(1 0 0 / 50%)'])).toThrow(/opaque/)
  })

  it('throws when the text colour is not opaque', () => {
    expect(() => contrastOver('oklch(0 0 0 / 80%)', ['oklch(1 0 0)'])).toThrow(
      /text colour must be opaque/,
    )
  })
})

describe('parseThemeBlocks', () => {
  it('reads the :root block as light and the .dark block as dark', () => {
    const css = '@theme inline { --color-card: var(--card); }\n:root {\n  --card: oklch(1 0 0);\n}\n.dark {\n  --card: oklch(0.2 0 0);\n}\n'
    expect(parseThemeBlocks(css)).toEqual({
      light: { card: 'oklch(1 0 0)' },
      dark: { card: 'oklch(0.2 0 0)' },
    })
  })
})

const css = readFileSync(path.join(import.meta.dirname, '../../src/index.css'), 'utf8')
const themes = parseThemeBlocks(css)

const TEXT_ON_SURFACES: [string, string][] = [
  ['foreground', 'background'],
  ['foreground', 'card'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['muted-foreground', 'card'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'muted'],
  ['primary-strong', 'card'],
  ['primary-strong', 'background'],
  ['primary-strong', 'primary-tint'],
  ['primary-strong', 'selected'],
  ['foreground', 'selected'],
  ['foreground', 'primary-tint'],
  ['warning-surface-foreground', 'warning-surface'],
  ['opportunity', 'card'],
  ['warning', 'card'],
  ['risk', 'card'],
  ['info', 'card'],
  ['primary-foreground', 'primary'],
  ['primary-foreground', 'primary-hover'],
  ['opportunity-foreground', 'opportunity'],
  ['warning-foreground', 'warning'],
  ['risk-foreground', 'risk'],
  ['info-foreground', 'info'],
]
const UI_ON_CARD = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5', 'ring', 'primary']

const SPOTLIGHT_STACKS: Record<string, string[]> = {
  'the panel over --background': ['background', 'sp-scrim', 'sp-panel'],
  'the panel over --card': ['card', 'sp-scrim', 'sp-panel'],
  'the fallback panel': ['card'],
}

const SPOTLIGHT_PAIRS: [string, string | null, number][] = [
  ['foreground', null, 4.5],
  ['muted-foreground', null, 4.5],
  ['muted-foreground', 'sp-kbd', 4.5],
  ['sp-active-text', 'sp-active-bg', 4.5],
  ['muted-foreground', 'sp-active-bg', 4.5],
  ['muted-foreground', 'sp-icon-bg', 3],
  ['ring', null, 3],
]

const SPOTLIGHT_CASES = Object.entries(SPOTLIGHT_STACKS).flatMap(([stackName, stack]) =>
  SPOTLIGHT_PAIRS.map(([fg, extra, min]) => [fg, stackName, extra, min, stack] as const),
)

describe.each(['dark', 'light'] as const)('%s theme tokens', (name) => {
  const tokens = themes[name]
  const get = (token: string): string => {
    const value = tokens[token]
    if (value === undefined) throw new Error(`--${token} is missing from the ${name} block`)
    return value
  }

  it.each(TEXT_ON_SURFACES)('--%s on --%s is at least 4.5:1', (fg, bg) => {
    expect(contrastRatio(get(fg), get(bg))).toBeGreaterThanOrEqual(4.5)
  })

  it.each(UI_ON_CARD)('--%s on --card is at least 3:1', (token) => {
    expect(contrastRatio(get(token), get('card'))).toBeGreaterThanOrEqual(3)
  })

  // The focus ring also sits on the page background (top bar links, chips).
  it('--ring on --background is at least 3:1', () => {
    expect(contrastRatio(get('ring'), get('background'))).toBeGreaterThanOrEqual(3)
  })

  it('has no sidebar or old brand tokens left', () => {
    expect(Object.keys(tokens).filter((t) => t.startsWith('sidebar') || t.startsWith('brand-'))).toEqual([])
  })

  it('layers surfaces: background < card < popover in dark, by lightness', () => {
    if (name === 'light') return
    const l = (t: string) => parseOklch(get(t)).l
    expect(l('background')).toBeLessThan(l('card'))
    expect(l('card')).toBeLessThan(l('popover'))
  })

  it('keeps every tested token inside the sRGB gamut', () => {
    const tested = new Set([
      ...TEXT_ON_SURFACES.flat(),
      ...UI_ON_CARD,
      'card',
      'background',
      'sp-scrim',
      'sp-scrim-fallback',
      'sp-panel',
      'sp-panel-border',
      'sp-divider',
      'sp-active-bg',
      'sp-active-text',
      'sp-icon-bg',
      'sp-kbd',
    ])
    const outside = [...tested].filter((t) => !inGamut(get(t)))
    expect(outside).toEqual([])
  })

  it.each(SPOTLIGHT_CASES)('--%s on %s + %s is at least %d:1', (fg, _stackName, extra, min, stack) => {
    const layers = [...stack, extra].filter((layer): layer is string => Boolean(layer)).map(get)
    expect(contrastOver(get(fg), layers)).toBeGreaterThanOrEqual(min)
  })

  it('keeps --sp-shadow as a string the parser never reads', () => {
    expect(tokens['sp-shadow']).toMatch(/^0 30px 80px oklch\(/)
  })
})

describe('light theme follows the handoff palette (ADR 0009)', () => {
  // Hex values from the handoff, written as oklch in index.css. Compared through contrast with white,
  // so a rounding difference in the oklch digits does not fail the test.
  const light = themes.light
  const white = 'oklch(1 0 0)'
  it.each([
    ['primary', 4.69],
    ['primary-strong', 8.2],
    ['foreground', 17.16],
    ['muted-foreground', 6.19],
  ])('--%s keeps the handoff contrast with white (%f:1)', (token, ratio) => {
    expect(contrastRatio(light[token]!, white)).toBeCloseTo(ratio, 1)
  })

  it('keeps light --sp-active-text equal to --primary-strong', () => {
    expect(light['sp-active-text']).toBe(light['primary-strong'])
  })
})
