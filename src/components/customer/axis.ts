/**
 * Axis tick text for every chart. Recharts sets an inline `fill: #666`,
 * which ignores the theme, so the fill is set here to the muted token.
 * The font size also lets Recharts measure labels at the size they render.
 */
export const AXIS_TICK = {
  style: { fontSize: 'var(--text-xs)', fill: 'var(--muted-foreground)' },
} as const
