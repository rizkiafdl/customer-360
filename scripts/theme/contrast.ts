/**
 * WCAG contrast for the `oklch()` theme tokens in src/index.css (ADR 0007).
 *
 * OKLCH → OKLab → linear sRGB uses Björn Ottosson's published matrices.
 * WCAG relative luminance is a weighted sum of linear sRGB, so no gamma step
 * is needed. Values outside the sRGB gamut are clipped here, the way a
 * browser without gamut mapping would show them; `inGamut` lets the test
 * reject such values instead of trusting the clipped color.
 */

export interface Oklch {
  l: number
  c: number
  h: number
}

const OKLCH = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*[\d.]+%?\s*)?\)$/

export function parseOklch(value: string): Oklch {
  const match = OKLCH.exec(value.trim())
  if (!match) throw new Error(`Not an oklch() value: ${value}`)
  const [, l, percent, c, h] = match as unknown as [string, string, string, string, string]
  return { l: percent ? Number(l) / 100 : Number(l), c: Number(c), h: Number(h) }
}

/** Linear sRGB channels, not clipped. */
export function oklchToLinearSrgb(value: string): [number, number, number] {
  const { l: L, c, h } = parseOklch(value)
  const rad = (h * Math.PI) / 180
  const a = c * Math.cos(rad)
  const b = c * Math.sin(rad)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

/** True when each sRGB channel is within [0, 1], with a small tolerance for rounding. */
export function inGamut(value: string): boolean {
  return oklchToLinearSrgb(value).every((ch) => ch >= -0.001 && ch <= 1.001)
}

function luminance(value: string): number {
  const [r, g, b] = oklchToLinearSrgb(value).map((ch) => Math.min(1, Math.max(0, ch))) as [
    number,
    number,
    number,
  ]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2 contrast ratio, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

function declarations(block: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [, name, value] of block.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    if (name !== undefined && value !== undefined) out[name] = value.trim()
  }
  return out
}

/** The custom properties of the `:root` (light) and `.dark` blocks. */
export function parseThemeBlocks(css: string): {
  light: Record<string, string>
  dark: Record<string, string>
} {
  const block = (selector: string): string => {
    const match = new RegExp(`(?:^|\\n)\\s*${selector}\\s*\\{([^}]*)\\}`).exec(css)
    if (!match?.[1]) throw new Error(`No ${selector} block in the CSS`)
    return match[1]
  }
  return { light: declarations(block(':root')), dark: declarations(block('\\.dark')) }
}
