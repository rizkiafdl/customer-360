# F4 + F5. Opportunity worklist and book overview — design

- **Date:** 2026-11-23
- **Status:** Written by the builder under the user's fast flow. Every
  business rule here is a user decision of 2026-11-23. Each UI call is
  marked "builder's call" with a one-line reason.
- **Parent spec:** `docs/superpowers/specs/2026-11-23-customer-360-product-design.md`,
  features F4 and F5, section 6.1.
- **Depends on:** F2 (merged), F1 (`2026-11-23-f1-visual-system-and-customer-detail-design.md`:
  shell, data table, KPI tile, chart card, `formatIDRShort`, tokens).
- **ADR:** none. URL search params for filters are already in ADR 0002.

If this document and the parent spec disagree, this document wins. The
user's visual brief moved the summary strip from `/` to its own page,
`/overview`.

## 1. Intent

The RM plans outreach across the book. F4 makes `/` a ranked worklist:
which customers have an offer opportunity, and the reason, with a link to
the evidence on the detail page. F5 adds `/overview`: the book in a few
numbers and two charts, where a click on a count opens the worklist
filtered to those customers.

## 2. Goals, non-goals, anti-goals

- **Goals:**
  - `/` is the worklist (section 4). It replaces F1's placeholder list.
  - `/overview` holds the summary strip and two book charts (section 5).
  - The sidebar gains "Overview".
  - Every number, sort key, and title comes from pure, tested functions in
    `src/lib/insights/` or `src/lib/selectors/`. Components only render.
- **Non-goals:**
  - No `/rules` page (F6). No change to the detail page (F1, F3).
  - No new rule or threshold. No change to `src/lib/insights/`
    rules or thresholds.
  - No pagination (100 rows).
  - No value tiers (removed by the user on 2026-11-23). Nothing replaces
    them.
- **Anti-goals (failure even if it works):**
  - AUM and loan exposure added together, anywhere.
  - The KYC note used as a top reason, a rank input, or an opportunity type.
  - A "customers with ≥ 1 rule" number on the overview (user decision).
  - A pie with more than 4 slices, a net flow, or dual axes.
  - A title or reason with an adjective or advice tone (CLAUDE.md Rule 9).

## 3. Approaches

| Option | Outcome |
| --- | --- |
| **A. Two view-model selectors (`buildWorklist`, `buildOverview`), ranking as a pure insights function, pages render only** | **Chosen.** Matches F1's `buildCustomer360` pattern; each title and count is testable on fixtures. |
| B. Compute sort keys and titles in TanStack column definitions | Rejected. Business logic in components (CLAUDE.md Rule 1). |
| C. One `/` page with the strip above the worklist | Rejected. The user's visual brief gives the strip and charts their own page. |

## 4. F4: worklist at `/`

### 4.1 Ranking (user decision, 2026-11-23)

- Default order: number of fired rules, descending; then AUM, descending.
  Customers with no fired rule fall to the bottom by the same order.
- Tie-break: `customer_id` ascending (builder's call: 14 ties exist, all
  among AUM-0 customers; a stable order keeps tests and e2e exact).
- Top reason = the `reason` of `insights[0]` (the first fired rule in
  `RULE_ORDER`), or `null` when no rule fired.
- The KYC note never sets the top reason and is not a rank input.
- A pure `compareWorklist(a, b)` over `CustomerEvaluation` lives in
  `src/lib/insights/ranking.ts` (builder's call: ranking is a business
  rule, and F2 left it to F4).

### 4.2 Row view model

`WorklistRow` (selector, `src/lib/selectors/worklist.ts`):

| Field | Value |
| --- | --- |
| `rank` | 1–100, position in the default order |
| `customerId`, `href` | `/customers/:id` |
| `aum`, `loanExposure` | Two numbers. Never summed. |
| `firedCount`, `ruleIds` | Fired rules, in `RULE_ORDER` |
| `topReason`, `topReasonOrder` | Reason text, and its `RULE_ORDER` index (`null` when none) |
| `kycNote` | The KYC reason text, or `null` |

`buildWorklist(data)` returns rows in the default order.
`getWorklist()` is the bound export.

### 4.3 Table

- F1's `DataTable` (TanStack, dense, sticky header, no pagination),
  initial state unsorted, so rows show in the default order.
- Columns: Rank · Customer (a link "Customer 4426") · AUM · Loan
  exposure · Rules · Top reason · KYC.
- Every column sorts. Top reason sorts by `topReasonOrder` with `null`
  last, KYC by present/absent (builder's call: rule order means more than
  A–Z). Sorting by Rank restores
  the default order.
- Money cells use `formatIDRShort()` with the full `formatIDR()` value in
  a tooltip (F1 `Money`).
- No top reason shows "No rule fired", muted.
- KYC shows an icon plus the label "KYC note" in the `--warning` token,
  with the KYC reason as the tooltip (F1: never color alone).
- Only the customer cell is a link, not the whole row (builder's call:
  one keyboard stop per row, standard link behavior).

### 4.4 Filters (URL search params, ADR 0002)

| Param | Values | Match |
| --- | --- | --- |
| `rule` | a `RULE_ORDER` id | the rule fired, at any position (builder's call: matches the overview count) |
| `q` | digits | `customerId` as text contains `q` |

- Filters combine with AND. An unknown value is ignored, not an error.
- `parseWorklistFilters(params)` and `filterWorklist(rows, filters)` are
  pure selectors.
- Controls above the table: an opportunity-type select
  (labels from `RULES`), an ID input, and "Clear filters". Each writes the
  URL.
- Header line from a fixed template: `100 customers.` or
  `37 of 100 customers. Opportunity: No ORI.` Empty result:
  `No customers match these filters.`
- The page `h1` stays "Customers" (builder's call: the sidebar label and
  F1's e2e use it).

## 5. F5: book overview at `/overview`

### 5.1 Header and summary strip

- Header: `h1` "Overview" and the line `As of 26 Apr 2024 · 100
  customers` (as-of date from ADR 0005, F1's `formatDate`).
- KPI tiles: **Total AUM** and **Total loan exposure**, two tiles, the
  loan tile with the context line `Not part of AUM.`
- **Customers per opportunity type:** six counts in `RULE_ORDER`, labels
  from `RULES`, each a link to `/?rule=<id>`.
- No "customers with ≥ 1 rule" and no KYC count in the strip.

### 5.2 Charts (shadcn chart over Recharts, F1 chart card)

| Chart | Data | Title template (example) |
| --- | --- | --- |
| Product penetration | Horizontal bar: customers holding each category (`isHeld`, `amount > 0`). Order FUNDING, ORI, BANCA, REKSA, LOAN; `CATEGORY_COLORS`. | `{category} held by {n} of {total} customers` for the lowest count, ties by that order → `ORI held by 46 of 100 customers` |
| Income band vs AUM | Scatter. x = income rank 1–8, ticks labelled with the band. y = AUM, log scale, AUM > 0 only, ticks in `formatIDRShort()`. Two series: "KYC note" (`--warning`, triangle) and "No KYC note" (`--info`, circle), with a legend. | `{n} customers with AUM, {k} with the KYC note` → `84 customers with AUM, 43 with the KYC note`. Footer: `16 customers with no AUM are not plotted.` |

- Builder's calls: LOAN is last in the penetration bar so the four AUM
  categories read first, as in F1; no jitter on the scatter (the log axis
  spreads the points, and output stays deterministic); a point's tooltip
  shows the customer ID, full AUM, and band; points are not links.
- Titles are built in the selector `buildOverview(data)`
  (`src/lib/selectors/overview.ts`), with `getOverview()` bound.
- Both pages read the same inputs: `customerEvaluations` (F2) plus loan
  exposure per customer.

### 5.3 Shell

- Sidebar: "Customers" (`/`, active on `/` and `/customers/*`), then
  "Overview" (`/overview`, active on `/overview`), lucide icon. Brand red
  marks the active item, as in F1.
- Route `overview` joins the `AppShell` children in `src/routes.tsx`.

## 6. Settled points

- **Domain:** `holdsCategory(items, category)` moves from a private helper
  in `src/lib/insights/rules.ts` to `src/lib/domain/portfolio.ts`, and
  `rules.ts` imports it (builder's call: penetration needs the same
  definition; one place). `loanExposure` exists.
- **Selectors:** `worklist.ts` and `overview.ts` are new files. They do
  not edit `insights.ts` (builder's call: F3 may edit it in parallel).
- **Layers:** no change to ADR 0004 or the ESLint rule.
- **shadcn:** add `select` for the opportunity-type filter.

## 7. Numbers on the real data

Measured on 2026-11-23 against the committed JSON. Contract tests pin them.

| Item | Value |
| --- | --- |
| Total AUM | Rp 811.749.876.893 (`Rp 811,7 M`) |
| Total loan exposure | Rp 1.582.500.470.995 (`Rp 1,6 T`) |
| Opportunity counts, `RULE_ORDER` | 12 / 29 / 37 / 29 / 16 / 6 |
| Penetration FUNDING / ORI / BANCA / REKSA / LOAN | 84 / 46 / 54 / 54 / 83 |
| Fired-rule count 0 / 1 / 2 / 3 / 4 | 16 / 49 / 26 / 8 / 1 |
| First row; last row | 8797 (4 rules); 7969 (0 rules, AUM Rp 400.835.303) |
| Top reason: cash-heavy / REKSA / ORI / BANCA / no-aum / none | 12 / 23 / 23 / 10 / 16 / 16 |
| Scatter points / KYC points / not plotted | 84 / 43 / 16 |

## 8. Done when

- `compareWorklist`, `buildWorklist`, `parseWorklistFilters`,
  `filterWorklist`, and `buildOverview` have fixture tests: ranking with a
  tie, a customer with no fired rule, the KYC note not changing the top
  reason or the order, an unknown filter value, AUM 0 excluded from the
  scatter, title ties, and exact title strings.
- Contract tests pin every number in section 7.
- UI tests: `/` renders 100 rows in the default order; `/?rule=investment-gap-ori`
  shows 37 rows; `/overview` shows the strip, and an opportunity link
  opens `/?rule=…`.
- e2e: `/` worklist, a row link opens the detail page; `/overview` deep
  link, a count link filters the worklist. No console errors.
- `npm run check` exits 0. CLAUDE.md lists `ranking.ts` under insights.

## 9. Left to the builder

- Component and file names under `src/components/` and `src/pages/`.
- Chart sizes, tick angle on the income-band axis, the lucide icons.
- Exact empty-state wording within the copy rule.
- Fixture design.
