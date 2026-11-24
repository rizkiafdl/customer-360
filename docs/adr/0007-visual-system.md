# 0007. Visual system: dark default, tokens only, red is not risk

- **Status:** Superseded by [0009](0009-visual-system-v2.md)
- **Date:** 2026-11-23

## Context

F1 builds the first screen of the app. Every later page (the worklist, the
overview) reuses its colors, type, money format, and chart rules. If each
page chose its own colors, the same category or flag would look different
from one screen to the next.

The users in the story are bank Relationship Managers. The page must feel
calm and dense with data, like a banking workspace. The user's design brief
(2026-11-23) asks for an OCBC-inspired look: a dark, warm base and the brand
red, used sparingly. The app is a portfolio piece, not an OCBC product, so it
must not use any OCBC logo or brand asset.

Two traps come with a red brand color in a banking app:

- Red reads as "bad" or "risk". A red primary button and a red risk flag on
  the same screen would mean two things.
- `#ED1C24` with white text measures about 4.4:1, just below the WCAG AA
  ratio of 4.5:1 for normal text.

shadcn/ui (ADR 0002) already themes its components through CSS variables in
`src/index.css`, and Recharts (ADR 0002) is already a dependency.

## Decision

- **Dark is the default theme, with a light toggle.** The `.dark` class sits
  on `<html>` unless the viewer chose light. The choice is stored in
  `localStorage` under the key `theme`. An inline script in `index.html`
  applies it before the first paint, so there is no flash. Storage access is
  wrapped in `try/catch`; on failure the theme is dark.
- **Colors exist only as CSS variables in `src/index.css`.** Components use
  Tailwind classes or `var(--token)` references that map to them. No hex,
  `rgb()`, or `oklch()` value appears in `src/components/` or `src/pages/`
  (shadcn-generated files in `src/components/ui/` stay as generated). The
  category → color-token map is one constant in `src/lib/domain/`.
- **Brand red is used sparingly.** It marks primary buttons, the active nav
  item, the focus ring, and at most one highlighted value per screen. It is
  never a surface, a chart series, or a flag. `--primary` is a step darker
  than `#ED1C24`, so white text on it passes 4.5:1. `--brand-deep` is the
  hover and pressed state. `--brand-text` is a red tint for small red text
  that passes 4.5:1 on cards.
- **Red is not risk.** Flags use semantic tokens: `--opportunity`
  (teal/green), `--warning` (amber), `--risk` (orange-amber), `--info`
  (blue-grey). Each has a `-foreground` pair. Every flag shows an icon and a
  label, never color alone. `--destructive` stays for destructive actions
  only.
- **Type:** Plus Jakarta Sans (variable, from
  `@fontsource-variable/plus-jakarta-sans`). Amounts and counts use tabular
  numbers and are right-aligned in tables.
- **Charts:** shadcn's `chart` component over Recharts. No second chart
  library. The chart rules:
  - FUNDING, ORI, BANCA, REKSA use `--chart-1` … `--chart-4`, none of them
    red. LOAN uses `--chart-5`, a neutral hue, and is never stacked with or
    added to AUM.
  - Transaction totals are called "amount". No net-flow chart, no inflow or
    outflow wording (ADR 0006).
  - No pie with more than 4 slices, no 3D, no dual axes.
  - Skewed AUM values use a log scale or a top N plus a table.
  - Chart titles state a fact with numbers from a fixed template built in
    `src/lib/selectors/` (copy rule, CLAUDE.md Rule 9).
- **Short money:** `formatIDRShort()` (`Rp 1,2 M`) next to `formatIDR()`.
  Every short value shows the full value in a tooltip. Outside charts the
  tooltip opens on hover and on keyboard focus. Inside a chart it opens on
  hover only: a chart is one `role="img"` element and not a keyboard stop.
  Its accessible name holds every full value, and the AUM chart sits next
  to the product table, which shows each full amount.
- **Contrast is tested.** A Node test under `scripts/theme/` parses both
  theme blocks of `src/index.css`, converts each `oklch` value to sRGB, and
  checks the WCAG ratio of each pairing: text ≥ 4.5:1, chart colors and the
  focus ring on cards ≥ 3:1. It also checks that each tested value is inside
  the sRGB gamut, so the browser does not clip it to another color.
- **The 3:1 focus indicator is the opaque `--ring` color.** The test checks
  that token on `--card`, and `--sidebar-ring` on `--sidebar` for the
  sidebar items. shadcn controls draw it as an opaque `border-ring` and add a
  `ring-ring/50` halo around it; the halo is decoration and is not what
  passes 3:1. App components (links, cards) use the opaque `ring-ring`.

## Consequences

- A color change is one edit in `src/index.css`, and the contrast test
  checks it in both themes.
- Later pages reuse the tokens, the map, and the chart rules without new
  decisions. A future risk flag has `--risk` ready and does not reach for
  red.
- The primary red on screen is a little darker than the brand hex. A viewer
  comparing hex values sees the difference; a viewer comparing the screen
  does not.
- The inline theme script duplicates the few lines that read the stored
  theme, because it must run before the app bundle loads.
- No visual-regression test exists. Layout changes are checked by the
  component tests, the e2e smoke test, and review.

## Alternatives considered

- **Light theme as the default.** Rejected: the user's brief asks for a dark
  workspace. Light stays available through the toggle.
- **A second chart library (ECharts, Nivo, visx).** Rejected: Recharts is
  already a dependency, shadcn's `chart` themes it through the same CSS
  variables, and the views are simple bars.
- **Red as the risk color.** Rejected: the brand red is already the primary
  action color, so red would mean two things. Orange-amber with an icon and
  a label marks risk.
- **A separate demo or style-guide page.** Rejected by the user: the detail
  page is the first proof of the system, and a demo page adds a route to
  maintain.
- **Exact `#ED1C24` as `--primary`.** Rejected: white text on it fails AA by
  a small margin, and primary buttons carry text.
