# F1. Visual system and Customer 360 detail — design

- **Date:** 2026-11-23
- **Status:** Approved on 2026-11-23 under the user's fast flow. The visual
  direction is the user's design brief of 2026-11-23. The page calls are
  mine and are marked "my call".
- **Parent spec:** `docs/superpowers/specs/2026-11-23-customer-360-product-design.md`,
  feature F1 and section 6.
- **ADR written here:** 0007 (theme, chart library, brand red is not risk).

If this document and the parent spec disagree, this document wins. The
user's design brief replaces the parent spec's F1 "UI foundation" bullets.
Two examples: semantic colors replace "neutral styling only", and the brief
adds an ADR.

## 1. Intent

F1 builds the first screen: one customer's profile, portfolio, and
transactions. It also adds a customer search, so the app meets Part 3 of
the assessment ("Profile, Porto, Trx, and filter per customer") before the
worklist (F4) exists.

F1 also sets the visual system that every later page uses: theme tokens,
type, money format, app shell, and chart rules. The user chose not to build
a separate demo page, so this detail page is the first proof of the system.

The users are bank Relationship Managers. The page should feel calm,
trustworthy, and dense with data, like a banking workspace and not a
landing page.

## 2. Goals, non-goals, anti-goals

- **Goals:**
  - Route `/customers/:id` with the sections in 5.2, for every one of the
    100 customers, including the empty cases in 5.4.
  - The visual system in section 4, in dark (the default) and light, with a
    theme toggle.
  - App shell: a left sidebar and a top bar with the customer search and
    the theme toggle.
  - `formatIDRShort()` and the do/don't rules in 4.6.
  - ADR 0007 and the CLAUDE.md changes in 6.2.
- **Non-goals:**
  - No insight rules and no "what to offer" panel (F2, F3). The insight
    card is designed here (4.5) and built in F3.
  - No `/overview` (F5) and no `/rules` (F6). The sidebar lists only routes
    that exist.
  - No worklist (F4). `/` keeps a simple customer list placeholder.
  - No demo or style-guide page (user decision).
- **Anti-goals (failure even if it works):**
  - Any OCBC logo, ship mark, or brand asset. Color and type only.
  - Red used as a risk or "bad" color, or on a large surface.
  - A flag or category shown by color alone, with no icon or label.
  - Loan exposure added to AUM or stacked with AUM categories.
  - A net-flow chart, inflow/outflow wording, a pie with more than 4
    slices, 3D, or dual axes.
  - A hard-coded color in a component, or a business value computed in a
    component (CLAUDE.md Rule 1).

## 3. Approaches

| Option | Outcome |
| --- | --- |
| A. Visual system as its own feature with a demo page, then F1 | Offered. The user chose not to build the demo page. |
| **B. Visual system and the detail page in one feature** | **Chosen (my call, after the demo page was dropped).** The detail page proves the system. One spec, one branch, one PR, which saves a PR cycle before the deadline. |
| C. Detail page first with shadcn defaults, theme later | Rejected. Every chart and color would be done twice. |

Charts: shadcn's `chart` component over Recharts (already a dependency, ADR
0002). No second chart library.

## 4. Visual system (ADR 0007)

### 4.1 Theme

- Dark is the default. The `.dark` class is on `<html>` unless the viewer
  chose light. The choice is stored in `localStorage` (key `theme`). A small
  inline script in `index.html` applies it before the first paint, so there
  is no flash. Read and write in `try/catch`; on failure, use dark.
- Only shadcn CSS variables in `src/index.css` hold colors. Components use
  Tailwind classes that map to those variables (`bg-card`, `text-primary`,
  `fill-[var(--chart-1)]`). No hex, `rgb()`, or `oklch()` in `src/components/`
  or `src/pages/`.
- Dark base is warm charcoal, not pure black, with layered surfaces:
  `background` < `card` < `popover`, each a step lighter.

### 4.2 Color tokens

Exact `oklch` values are the builder's call within these anchors. The
builder records the final values and measured contrast in the spec's
token table when done.

| Token | Role | Dark anchor | Light anchor |
| --- | --- | --- | --- |
| `--background` | Page | warm charcoal, about `#1A1817` | near white, warm |
| `--card` | Card surface | one step lighter than background | white |
| `--foreground` | Body text | warm off-white | near black |
| `--muted-foreground` | Secondary text | warm grey, AA on `card` | warm grey, AA on `card` |
| `--primary` | Primary buttons, active nav | brand red `#ED1C24` | brand red `#ED1C24` |
| `--primary-foreground` | Text on primary | white | white |
| `--ring` | Focus ring | brand red | brand red |
| `--brand-deep` | Hover/pressed on primary | deep red `#721C24` | deep red `#721C24` |
| `--brand-text` | Small red text (one highlighted value) | a lighter red tint, AA on `card` | brand red or darker, AA on `card` |
| `--opportunity` | Opportunity flag | teal/green | teal/green |
| `--warning` | Warning flag (for example the KYC note) | amber | amber |
| `--risk` | Risk flag | orange-amber | orange-amber |
| `--info` | Neutral info | blue-grey | blue-grey |
| `--chart-1` … `--chart-4` | FUNDING, ORI, BANCA, REKSA | 4 distinct hues, none red | same hues, adjusted for light |
| `--chart-5` | LOAN | a neutral hue, clearly unlike 1–4 | same |

- Each semantic token has a `-foreground` pair for text on it.
- **Red is not risk.** `--destructive` stays for destructive actions only
  (none in the app today). No rule uses `--risk` yet. It exists so a later
  risk flag does not reach for red.
- **Contrast is tested, not eyeballed** (my call). A Node test parses the
  dark and light blocks of `src/index.css`, converts the colors to sRGB, and
  checks the WCAG ratio for each pairing: body text, muted text,
  `--brand-text`, and each semantic token's foreground on `card` ≥ 4.5;
  `primary-foreground` on `primary` ≥ 4.5; chart colors and `ring` on `card`
  ≥ 3 (non-text UI). The test lives under `scripts/` (Node code, typechecked
  by `tsconfig.node.json`).

#### Builder's final values

Measured by `scripts/theme/contrast.ts` (WCAG ratio, OKLCH converted to
sRGB). Targets: text pairings ≥ 4.5, `ring` and chart colors ≥ 3. All
values are in the sRGB gamut. `--primary` is one step darker than
`#ED1C24`, because white on `#ED1C24` is about 4.4:1 (ADR 0007).

| Token | Dark | Ratio | Light | Ratio | Pairing |
| --- | --- | --- | --- | --- | --- |
| `--background` | `oklch(0.211 0.004 49)` | — | `oklch(0.985 0.003 75)` | — | — |
| `--card` | `oklch(0.245 0.005 49)` | — | `oklch(1 0 0)` | — | — |
| `--popover` | `oklch(0.28 0.006 49)` | — | `oklch(1 0 0)` | — | — |
| `--foreground` | `oklch(0.95 0.008 75)` | 14.03 | `oklch(0.2 0.006 49)` | 18.12 | on `card` |
| `--muted-foreground` | `oklch(0.72 0.012 70)` | 6.54 | `oklch(0.5 0.01 60)` | 6.01 | on `card` |
| `--primary` | `oklch(0.585 0.228 27)` | 4.71 | `oklch(0.585 0.228 27)` | 4.71 | `primary-foreground` on it |
| `--ring` | `oklch(0.585 0.228 27)` | 3.45 | `oklch(0.585 0.228 27)` | 4.71 | on `card` |
| `--brand-deep` | `oklch(0.371 0.119 20)` | — | `oklch(0.371 0.119 20)` | — | — |
| `--brand-text` | `oklch(0.72 0.15 22)` | 6.13 | `oklch(0.53 0.21 27)` | 5.89 | on `card` |
| `--opportunity` | `oklch(0.75 0.12 170)` | 7.70 | `oklch(0.5 0.085 170)` | 5.73 | on `card` |
| `--warning` | `oklch(0.8 0.14 80)` | 8.58 | `oklch(0.55 0.12 70)` | 4.98 | on `card` |
| `--risk` | `oklch(0.74 0.15 55)` | 6.75 | `oklch(0.55 0.13 50)` | 5.09 | on `card` |
| `--info` | `oklch(0.75 0.04 240)` | 7.35 | `oklch(0.5 0.04 240)` | 5.95 | on `card` |
| `--chart-1` (FUNDING) | `oklch(0.68 0.13 250)` | 5.67 | `oklch(0.55 0.15 250)` | 4.85 | on `card` |
| `--chart-2` (ORI) | `oklch(0.72 0.11 190)` | 6.87 | `oklch(0.58 0.1 190)` | 4.08 | on `card` |
| `--chart-3` (BANCA) | `oklch(0.68 0.14 300)` | 5.36 | `oklch(0.55 0.16 300)` | 5.21 | on `card` |
| `--chart-4` (REKSA) | `oklch(0.78 0.13 85)` | 8.06 | `oklch(0.65 0.13 80)` | 3.29 | on `card` |
| `--chart-5` (LOAN) | `oklch(0.62 0.01 60)` | 4.45 | `oklch(0.6 0.01 60)` | 3.96 | on `card` |

### 4.3 Type and numbers

- Plus Jakarta Sans, variable, from `@fontsource-variable/plus-jakarta-sans`.
  It replaces Geist.
- Every amount and count uses tabular numbers (`tabular-nums`) and is
  right-aligned in tables.
- Density is compact (my call, from "data-dense"): small row height in
  tables, tight card padding.

### 4.4 Money

- `formatIDR()` stays the full form (`Rp 1.384.200.000`).
- New `formatIDRShort()` in `src/lib/format.ts`:
  - units `rb` (10³), `jt` (10⁶), `M` (10⁹, miliar), `T` (10¹²);
  - at most 1 decimal, Indonesian comma, no trailing `,0`;
  - below 1,000, the full form;
  - rounding that reaches 1,000 of a unit moves up a unit
    (`999.960.000` → `Rp 1 M`, not `Rp 1.000 jt`);
  - negative values keep the sign (`-Rp 1,2 jt`); `-0` shows `Rp 0`.
- Examples: `Rp 350 jt`, `Rp 1,2 M`, `Rp 811,7 M`.
- Every short value shows the full `formatIDR()` value in a tooltip.

### 4.5 Components

- **App shell:** left sidebar with "Customers" (`/`) and the active item in
  brand red. Top bar: customer search, the as-of date ("As of 26 Apr
  2024"), and the theme toggle. Works down to tablet width (768 px);
  below that the sidebar becomes a slide-in sheet. 768 px is the shadcn
  `sidebar` default (`src/hooks/use-mobile.ts`). The first draft said
  1024 px; the build kept the default.
- **Customer search:** a combobox (shadcn `command` in a `popover`) over all
  100 customer IDs, with gender and income band as a second line. Selecting
  one opens `/customers/:id`. This is the "filter per customer".
- **KPI tile:** label, value, optional one-line context. Money values use
  `formatIDRShort()` with the full value in a tooltip.
- **Data table:** TanStack Table, dense, sticky header, sortable columns,
  inside a scroll area with a fixed max height. No pagination (at most 86
  rows per customer).
- **Insight card (designed here, built in F3):** an icon and a label for
  the kind (opportunity, warning, info), the reason text, and the rule text
  below it in muted type. Color is a left border and the icon tint only,
  never the whole card.
- **Chart card:** a title, the chart, and an empty state. The title states
  a fact with numbers from a fixed template (copy rule, CLAUDE.md Rule 9),
  for example "62% of AUM in FUNDING". Titles are built in
  `src/lib/selectors/`, not in components.

### 4.6 Do and don't

- Do use red for primary buttons, active nav, focus ring, and at most one
  highlighted value per screen. Don't use red for a surface, a chart
  series, or a flag.
- Do pair every flag color with an icon and a label.
- Do show LOAN as its own KPI and its own color. Don't stack it with AUM.
- Do say "amount" for transaction totals. Don't say inflow, outflow, or net.
- Do use a log scale or top N plus a table for skewed AUM values.
- Don't use a pie with more than 4 slices, 3D, or dual axes.

## 5. Customer 360 detail page

### 5.1 Data

- A selector `buildCustomer360(dataset, id)` returns one view model, or
  `null` for an unknown ID; `getCustomer360(id)` is the bound export. Rows
  are grouped by `customer_id` once at module load (parent spec section 6).
- The view model holds every number and title the page shows, already
  computed. The page only renders it.
- New domain definitions (added to ADR 0006):
  - `DIGITAL_METHODS`: MOBILE BANKING, INTERNET BANKING, SMS BANKING,
    QRIS, VIRTUAL DEBIT CARD, VELOCITY, CREDIT CARD, DEBIT CARD (user
    decision, 2026-11-23; cards count as digital). Not digital: ATM,
    BRANCH, MERCHANT.
  - `digitalShare(transactions)`: digital count / count over
    customer-initiated transactions, excluding the `BANCA` method (parent
    spec 5.2). `null` when there is nothing to count. Measured: p10 64%,
    median 78%, p90 89%.
- The detail window is 2024-03-01 to the as-of date (parent spec section
  3: 87% of rows fall in March–April 2024). It is a constant in domain with
  that source.

### 5.2 Sections, top to bottom

1. **Profile header:** "Customer 4426", gender, income band with its rank
   ("rank 5 of 8"), and an info label "High income" when `isHighIncome`.
2. **KPI row:** AUM; loan exposure (its own tile); products held ("7 of 19
   rows" = `isHeld` count of rows); days since the last customer-initiated
   transaction ("2 days since last activity", as of 2024-04-26, a fact with
   no badge, because no recency threshold exists); digital share as a
   single-value meter with no target line.
3. **Holdings:**
   - AUM composition: a horizontal bar per AUM category (FUNDING, ORI,
     BANCA, REKSA), amount labels with `formatIDRShort()`, colors
     `--chart-1…4`.
   - Loan exposure is not in this chart.
   - Product table: product, category (color dot and name), amount, held
     (yes/no). Rows with 0 or `null` amount are muted; `null` shows "—".
4. **Activity (customer-initiated only):**
   - Weekly bars (count per ISO week, Monday start) for the detail window.
     Below the chart: "N earlier transactions, from YYYY-MM-DD", or nothing
     when N is 0.
   - Channel mix: horizontal bar by count, top 5 methods plus "Other".
   - Type mix: horizontal bar by count, customer-initiated types only (the
     4 bank-entry types are excluded).
5. **Bank entries:** a small table by type (BUNGA, BIAYA, PAJAK, DENDA):
   count and amount. Types with no rows are left out. A note says these are
   posted by the bank.
6. **All transactions:** the data table with date, method, type, and
   amount, newest first, with a filter: all / customer-initiated / bank
   entries.

### 5.3 Text sketch

```text
┌ Sidebar ┐┌ [Search customer ▾]            As of 26 Apr 2024   [☾/☀] ┐
│Customers││ Customer 4426 · F · >10 Juta - 25 Juta (rank 5 of 8) [i High income]
│         ││ [AUM Rp 1,4 M] [Loan Rp 250 jt] [Held 7 of 19] [2 days] [Digital 78%]
│         ││ HOLDINGS  "62% of AUM in FUNDING"     | Product table          │
│         ││ ACTIVITY  weekly bars · channel mix · type mix                 │
│         ││ BANK ENTRIES  table                                            │
│         ││ ALL TRANSACTIONS  table, filter: all / customer / bank         │
└─────────┘└────────────────────────────────────────────────────────────────┘
```

### 5.4 Empty and odd cases

| Case | Count | Shows |
| --- | --- | --- |
| No portfolio rows | 14 | Holdings chart and table replaced by "No portfolio rows." AUM and loan tiles show Rp 0. |
| Portfolio rows, AUM 0 | 2 | Chart replaced by "No AUM. N product rows, none held." Table shown. |
| `null` gender | 1 | "Gender not recorded". |
| `null` product name | 1 | "Unnamed product". |
| `null` amount | 5 | "—", muted, not held. |
| No earlier transactions | many | No "earlier" line. |
| Unknown or non-numeric ID | — | "Customer not found" with a link to `/`. HTTP-level 404 is out of scope (ADR 0003). |

## 6. Settled points

### 6.1 Layer rule

- `src/hooks/` (shadcn's hooks folder, used by `sidebar`) joins the UI
  layer in `eslint.config.js`, with a case in `eslint.config.test.ts`.
- The category → color token map is a domain constant (parent spec F1), so
  charts, dots, and badges read one place.

### 6.2 ADR 0007 and CLAUDE.md

- **ADR 0007. Visual system:** dark default with a light toggle, shadcn CSS
  variables only, OCBC-inspired red used sparingly with no OCBC assets,
  brand red is not risk (semantic table), Plus Jakarta Sans, shadcn charts
  over Recharts, the chart rules in 4.6, and the contrast test.
  Alternatives: light default, a second chart library, red as risk, a demo
  page.
- **CLAUDE.md:**
  - Rule 2 covers `formatIDR()` and `formatIDRShort()`.
  - New Rule 10: "All UI follows the visual system in
    `docs/superpowers/specs/2026-11-23-f1-visual-system-and-customer-detail-design.md`
    section 4 and ADR 0007."
  - Folder structure gains `src/hooks/` and the contrast test.
  - The Stack table: Plus Jakarta Sans.

### 6.3 Tests

- Domain: `digitalShare`, the detail window, ISO week bucketing (a week
  that crosses a month).
- Format: each `formatIDRShort()` example and edge in 4.4.
- Selectors: `buildCustomer360` on fixtures (each case in 5.4) and contract
  tests on the real data (all 100 IDs build; an unknown ID gives `null`).
- UI: the detail page renders a fixed view model for a full customer and
  for a customer with no portfolio rows; the not-found page; the theme
  toggle switches the `.dark` class and stores the choice.
- e2e: open `/customers/<id>` as a direct deep link; search for a customer
  and open them; toggle the theme. No console errors.

## 7. Done when

- All 100 customers render with no console error, including every case in
  5.4.
- Both themes pass the contrast test.
- `npm run check` passes; `checks` and `e2e` pass on the PR.
- ADR 0007 and the CLAUDE.md changes are in the PR.

## 8. Left to the builder

- Exact `oklch` values within 4.2, recorded with their contrast ratios.
- Component and file names, the shadcn components to add, and the
  view-model shape.
- Chart title templates, within the copy rule.
- Spacing and type scale, within "compact".
