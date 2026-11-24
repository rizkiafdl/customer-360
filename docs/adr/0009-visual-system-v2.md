# 0009. Visual system v2: light default, OCBC red, Inter and Space Grotesk

- **Status:** Accepted. Supersedes [0007](0007-visual-system.md).
- **Date:** 2026-11-24

## Context

On 2026-11-24 the user brought a Claude Design handoff (`docs/design-system/`)
that redraws the three pages: Portfolio, Customers, and Customer 360. The
feature spec is `docs/superpowers/specs/2026-11-24-redesign-v2-design.md`
(section 6). The handoff has a light page, a top bar in place of the sidebar,
two typefaces, and a token table in two color variants (teal and OCBC red)
that differ only in color.

ADR 0007 set a dark default, Plus Jakarta Sans, and a primary one step
darker than the brand hex. The handoff changes all three. Most of 0007 still
holds: tokens only, red is not risk, tested contrast, and the chart rules.
Because the default theme, the font, and the token set change together, and
every page reads them, this is a new project-wide decision.

Measured on the handoff values (WCAG ratio):

- white text on `#E2231A`: 4.68:1, passes 4.5:1,
- `#E2231A` text on the page background `#F7F6F5`: 4.33:1, fails 4.5:1,
- REKSA `#C9921A` on white: 2.76:1, fails the 3:1 rule for chart colors,
- LOAN `#8B8E95` on white: 3.28:1, passes 3:1.

The handoff also draws the weekly activity bars in red and gives the "High
income" chip a red tint. Both break the "red is not a series or a flag" rule.

## Decision

- **Kept from ADR 0007:**
  - Colors exist only as CSS variables in `src/index.css`. No hex, `rgb()`,
    or `oklch()` in `src/components/` or `src/pages/` (shadcn files in
    `src/components/ui/` stay as generated). The category → color map is
    one constant in `src/lib/domain/`.
  - Red is never a risk color, a chart series, a flag, or a large surface.
    Flags use the semantic tokens (`--opportunity`, `--warning`, `--risk`,
    `--info`), each with an icon and a label.
  - The contrast test under `scripts/theme/` checks every token pairing in
    both themes: text ≥ 4.5:1, chart colors and the focus ring ≥ 3:1, and
    every value inside the sRGB gamut.
  - Chart rules: LOAN is never stacked with or added to AUM, titles state a
    fact from a fixed template, short money shows the full value in a
    tooltip, no pie with more than 4 slices.
- **Light is the default theme, with a dark toggle.** The `dark` class is on
  `<html>` only when `localStorage.theme` is `dark`. The inline script in
  `index.html` applies it before the first paint. A blocked storage gives
  light. A viewer who chose dark under ADR 0007 keeps dark.
- **OCBC red only.** No teal variant and no theme-color switch. The tokens
  come from the handoff's red column, written as `oklch`:

  | Token | Light value | Use |
  | --- | --- | --- |
  | `--primary` | `#E2231A` | Primary buttons, the active nav bar, the focus ring. White text on it passes. |
  | `--primary-strong` | `#9B1B14` | Red text and links. Replaces `--brand-deep` and `--brand-text`. Buttons hover with `--primary` at 90%. |
  | `--primary-tint` | `#FFF1EF` | Small tinted backgrounds (a selected chip). |
  | `--selected` | `#FFF7F6` | The selected table row. |
  | `--primary-border` | `#F5C2BE` | The border of a selected control. |
  | `--background` | `#F7F6F5` | The page. |
  | `--card` | `#FFFFFF` | Cards and the top bar. |
  | `--foreground` | `#1D1B1A` | Text. |
  | `--muted-foreground` | `#5E6169` | Secondary text. |
  | `--border` | `#E4E4DF` | Borders. |
  | `--warning-surface` / `--warning-surface-foreground` | `#FBF1DC` / `#6B4600` | The KYC note chip. |

  The dark theme derives its values from the same palette. The contrast
  test decides each value.
- **Product colors (charts only):** FUNDING `#4A6FD1`, ORI `#1E8C84`, BANCA
  `#8063C9`, REKSA darkened from `#C9921A` until it passes 3:1 on the card,
  LOAN `#8B8E95`. They are `--chart-1` … `--chart-5`.
- **Two red uses from the handoff change:** the weekly bars use
  `--chart-1`, and the "High income" chip uses the `--info` token.
- **Type:** Inter (body text, tabular numbers) from
  `@fontsource-variable/inter`, and Space Grotesk (page titles, large
  numbers) from `@fontsource-variable/space-grotesk`. Plus Jakarta Sans is
  removed. Amounts and counts use tabular numbers and are right-aligned in
  tables.
- **Shape:** radius 8 px for controls, 12–14 px for cards; touch targets at
  least 40 × 40 px on a coarse pointer (one `@media (pointer: coarse)` rule in
  `src/index.css`, so mouse layouts keep the handoff's density); Lucide icons
  at 16 px, stroke 2.
- **Primary button hover:** `--primary-hover`, a darker red, so the white
  label keeps 4.5:1. A lighter hover (shadcn's `bg-primary/80`) fails it.
- **Navigation:** a top bar replaces the sidebar. Every `--sidebar*` token is
  removed.

## Consequences

- The app matches the handoff on light screens. A color change is still one
  edit in `src/index.css`, and the contrast test checks it in both themes.
- `--primary` is the exact brand hex now, so the screen and the brand guide
  agree. Red text uses `--primary-strong`, not `--primary`.
- REKSA on screen is darker than the handoff's gold. A viewer comparing hex
  values sees the difference.
- Two font packages replace one. The bundle grows by the two variable font
  files.
- The `LABEL_WIDTH` constant of the horizontal bar chart was measured for
  Plus Jakarta Sans; the e2e label-fit test checks it with Inter.

## Alternatives considered

- **Keep dark as the default.** Rejected by the user on 2026-11-24: the
  handoff is a light workspace. Dark stays behind the toggle.
- **The teal variant, or a switch between teal and red.** Rejected by the
  user on 2026-11-24: one brand color, and a switch is one more state to
  test.
- **The exact handoff gold `#C9921A` for REKSA.** Rejected: 2.76:1 on white
  fails the 3:1 chart rule.
- **`#E2231A` for red text.** Rejected: 4.33:1 on the page background fails
  4.5:1.
- **Keep Plus Jakarta Sans.** Rejected: the handoff sets two typefaces, and
  the large numbers rely on Space Grotesk.
