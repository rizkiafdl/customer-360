// @vitest-environment node
/**
 * Checks the Spotlight search CSS in src/index.css (spec
 * 2026-11-24-spotlight-search-design.md, 5.7): the Tailwind color mapping in
 * @theme inline, the scrim and panel rules, the keyframes, the
 * reduced-motion override, and the backdrop-filter fallback.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(path.join(import.meta.dirname, '../../src/index.css'), 'utf8')

/** The text from `marker` to the first `\n}` after it. */
function blockAfter(css: string, marker: string): string {
  const start = css.indexOf(marker)
  if (start === -1) throw new Error(`No ${marker} marker in the CSS`)
  const end = css.indexOf('\n}', start)
  if (end === -1) throw new Error(`No closing } after ${marker} in the CSS`)
  return css.slice(start, end)
}

describe('@theme inline', () => {
  it.each(['kbd', 'icon-bg', 'active-bg', 'active-text', 'divider'])(
    'maps --color-sp-%s in @theme inline',
    (name) => {
      expect(blockAfter(css, '@theme inline')).toContain(`--color-sp-${name}: var(--sp-${name});`)
    },
  )
})

it('defines the sp-fade and sp-pop keyframes', () => {
  expect(css).toContain('@keyframes sp-fade')
  expect(css).toContain('@keyframes sp-pop')
  expect(blockAfter(css, '@keyframes sp-pop')).toContain('translateY(-8px) scale(.97)')
})

it('gives the scrim its blur and the fade', () => {
  const block = blockAfter(css, '.spotlight-scrim {')
  expect(block).toContain('var(--sp-scrim)')
  expect(block).toContain('blur(14px) saturate(140%)')
  expect(block).toContain('sp-fade .2s ease-out')
})

it('gives the panel the reference size and frost', () => {
  const block = blockAfter(css, '.spotlight-panel {')
  expect(block).toContain('top: 104px')
  expect(block).toContain('width: min(680px, calc(100vw - 32px))')
  expect(block).toContain('border-radius: 20px')
  expect(block).toContain('var(--sp-panel)')
  expect(block).toContain('var(--sp-panel-border)')
  expect(block).toContain('var(--sp-shadow)')
  expect(block).toContain('blur(32px) saturate(180%)')
  expect(block).toContain('sp-pop .22s cubic-bezier(.2, .8, .2, 1)')
})

it('turns both animations off for reduced motion', () => {
  const block = blockAfter(css, '@media (prefers-reduced-motion: reduce)')
  expect(block).toContain('.spotlight-scrim')
  expect(block).toContain('.spotlight-panel')
  expect(block).toContain('animation: none')
})

it('falls back to an opaque panel without backdrop-filter', () => {
  const block = blockAfter(
    css,
    '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))',
  )
  expect(block).toContain('var(--sp-scrim-fallback)')
  expect(block).toContain('var(--card)')
})
