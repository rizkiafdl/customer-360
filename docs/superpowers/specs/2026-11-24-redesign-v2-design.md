# Redesign v2: Portfolio, Customers, Customer 360 — design

- **Date:** 2026-11-24
- **Status:** Approved by the user on 2026-11-24.
- **Design reference:** `docs/design-system/HANDOFF.md` and the six
  `docs/design-system/design/*.dc.html` files (Claude Design export). The
  teal and the OCBC-red files differ only in color. This spec uses the red
  files. The `.dc.html` files are layout and style references, not code.
- **Branches:** `feat/redesign-logic` (part A), then `feat/redesign-ui`
  (part B). Two plans, two PRs.

## 1. Intent

The app works and is deployed (E0, F0–F5). The user brought a new design
for the three pages. It changes the information architecture more than the
look:

- a top bar replaces the sidebar,
- the overview becomes **Portfolio**, the home page, with an income-band
  filter,
- the worklist becomes **Customers**, a lean list with a preview panel,
- the customer page becomes **Customer 360** with four tabs and offers
  grouped by product.

The app is a portfolio piece for recruiters. The redesign must keep what
the repo already proves: business logic in `src/lib/` with tests, the
copy rule, no invented thresholds, tested contrast, and a clean history.

### 1.1 Goals

- Build the three pages of the design on the existing data and rules.
- Every new number comes from a pure, tested function in `src/lib/`, with a
  contract test on the real data.
- The filter state lives in the URL, so every link, the browser back
  button, and prev/next on Customer 360 work.

### 1.2 Non-goals

- No change to the data extraction: `scripts/excel/`, `src/data/*.json`,
  and `src/types/` stay as they are.
- No change to the insight rules, their thresholds, or their fire counts
  (12 / 29 / 37 / 29 / 16 / 6, ADR 0008).
- No teal theme and no theme-color switch (user decision, 2026-11-24).
- No data the design lists under "Data not available": RM, branch, age,
  contact preference, risk profile, KYC detail, loan facility detail, AUM
  history, offer history.

### 1.3 Anti-goals

- Advice-tone text. The design has titles such as "Move idle cash into
  REKSA", "Offer BANCA protection", "Check before any offer", and
  "Activation list". CLAUDE.md Rule 9 forbids them. Section 5.6 gives the
  replacement templates.
- A filter or a chart that hides nobody or shows one bar (see 2.2).
- Placeholder values. The design has `[N]`, `[Rp total]`, `[date]`, and
  `[rule condition]`. Each one is computed or removed.

## 2. User decisions (2026-11-24)

### 2.1 Answers

| Topic | Decision |
| --- | --- |
| Build approach | **B. Layers first.** Part A: all logic in one PR. Part B: all UI in one PR. |
| Color | OCBC red only. |
| Theme | Light is the default. The dark toggle stays. A new ADR replaces ADR 0007. |
| Home page | Portfolio is `/`. |
| AUM range filter | Removed. Not built. |
| "Customer since" | Shown as the first transaction in the data, never as an account open date. |
| Top channel ("Reach via …") | Over customer-initiated transactions only. |
| Income rank label | Removed. Show only the band. |
| Rule 9 copy (5.6) | Approved. |
| Loans | New Loans tab on Customer 360: code and amount per facility, no type map (5.7). |
| Rules and copy | The rules stay. Rule 9 still binds. |
| Filter and link wiring | Delegated to me. My calls are in section 4.3 and are marked "my call". |

### 2.2 Last-active groups: approved, then dropped

The design groups customers by their last customer-initiated transaction:
30 days or less, 31–90 days, more than 90 days. The user first approved
these cut-offs. The real data then showed that all 100 customers had a
customer-initiated transaction within 7 days of 26 Apr 2024 (57 on that
day, 67 within 1 day, 97 within 3 days). The transactions are a
March–April 2024 extract, so the groups would read 100 / 0 / 0.

The user then decided: **no engagement row on Portfolio and no last-active
filter on Customers.** "Last active" stays as a Customers column, in the
preview panel, and as a Customer 360 KPI.

## 3. Approaches considered

- **A. One branch per page** (tokens and top bar, then Portfolio,
  Customers, Customer 360). Each PR ships a working page. Not chosen.
- **B. Layers first (chosen by the user).** One PR adds every new selector,
  insight, and domain function next to the current ones, with tests, and
  changes no screen. A second PR builds the visual system and the three
  pages on top. The logic PR is reviewable on its own because all of its
  output is pinned by tests. The UI PR is large.
- **C. One branch.** One very large PR. Not chosen.

Consequence of B: part A must not break the pages that ship today. Part A
adds new functions and new fields; it does not remove or rename an export
that the current UI uses. Part B removes what the new UI no longer uses.

## 4. Information architecture

### 4.1 Routes

| Path | Page | Was |
| --- | --- | --- |
| `/` | Portfolio | `/overview` (F5) |
| `/customers` | Customers | `/` (F4 worklist) |
| `/customers/:id` | Customer 360 | same path (F1) |
| `/overview` | redirect to `/` (my call: keeps old links working) | — |
| `*` | Not found | same |

The basename `/customer-360/` stays.

### 4.2 Top bar (replaces the sidebar)

Left to right: the product name "Customer 360", the tabs `Portfolio` and
`Customers` (Lucide `layout-dashboard`, `users`), the customer ID search
(the current `CustomerSearch`), the text "Snapshot as of 26 Apr 2024", and
the theme toggle. `Customers` is the current tab on `/customers` and on
`/customers/:id`. The sidebar component and its tests are removed.

### 4.3 URL state (my call, delegated)

The Customers filters are URL parameters. Unknown or malformed values are
ignored, as `parseWorklistFilters` does today.

| Param | Values | Meaning |
| --- | --- | --- |
| `rule` | a `RuleId` | The rule fired, at any position. |
| `band` | `1`–`8` | The income rank (`incomeRank`). A number, so the URL has no `>` or spaces. |
| `kyc` | `yes`, `no` | The KYC income-band note fired, or not. |
| `lacks` | `FUNDING`, `ORI`, `BANCA`, `REKSA` | The customer holds no row of the category with amount above 0 (`holdsCategory` is false). |
| `q` | digits | The ID contains the digits. |
| `page` | `1`… | The page of 25 rows. Out of range → page 1. |

Filters combine with AND. Portfolio uses only `band` (`/?band=5`).

Links:

- Every Portfolio link carries the current `band`.
- An opportunity tile opens `/customers?rule=<id>`.
- The "With KYC note" tile opens `/customers?kyc=yes`.
- The FUNDING, ORI, BANCA, and REKSA bars open `/customers?lacks=<category>`:
  the actionable list is the customers who do not hold the product. The LOAN
  bar has no link: no rule offers LOAN.
- A Customers row link and "Open full 360" open `/customers/<id>` with the
  current filter params except `page`.
- On Customer 360, the breadcrumb `Customers › Customer <id>` links back to
  `/customers` with the same params. Prev/next step through the filtered
  list in the default order (section 5.3) and keep the params.

## 5. Logic (part A, `feat/redesign-logic`)

Every function is pure, sits in the layer named, and has a co-located test.
The real-data numbers below were computed on 2026-11-24 and become contract
tests in `src/lib/selectors/`.

### 5.1 Domain (`src/lib/domain/`)

- `firstActivityDate(transactions)`: the earliest `activity_date`. It uses
  all rows of the customer, bank entries included, because the label is
  "first transaction in the data". It throws a `RangeError` on an empty
  array, like `latestActivityDate`. Every customer has transactions.
  Real spread of the first-transaction year: 2011 (30 customers) to 2024
  (3).
- `topChannel(transactions)`: over customer-initiated rows only. It returns
  `{ method, count, total }` for the most frequent `transaction_method`, or
  `null` when no row is customer-initiated. Ties go to the method name in
  alphabetical order, the same order as `countBy`.
- `shareOfAum(amount, aum)`: the share of one held AUM product. It returns
  `null` for a LOAN row or when AUM is 0.

### 5.2 Insights (`src/lib/insights/`): offers grouped by product

New `productOffers(evaluation)` returns one card per product, from the
fired rules. The rules themselves do not change.

| Fired rule | Card |
| --- | --- |
| `investment-gap-reksa` / `-ori` / `-banca` | The REKSA / ORI / BANCA card. |
| `cash-heavy` | Added to the REKSA card and to the ORI card when those cards exist. If neither exists (the customer holds both), it gets its own `Cash` card. Real data: 3 of the 12 cash-heavy customers hold both. |
| `high-income-no-banca` | Added to the BANCA card, or creates it. Real data: 3 of 6 also fire `investment-gap-banca`; 3 fire `no-aum` and so have no gap (AUM 0). |
| `no-aum` | Its own `No AUM` card. It has no product. |

Each card holds:

- `product`: `REKSA | ORI | BANCA | Cash | No AUM`,
- `ruleIds`: the supporting rules in `RULE_ORDER`,
- `reasons`: their existing reason strings, unchanged (ADR 0008 templates),
- `basis`: `{ kind: 'cash' | 'aum', amount }`. `cash` when the card holds
  `cash-heavy`, else `aum`. `null` for `No AUM`.

The card order is (the design's third key, recency, is dropped because it is
the same for every card of one customer):

1. more supporting rules first,
2. a higher `basis.amount` first,
3. the position of the card's first rule in `RULE_ORDER`.

The KYC note is not a card. It stays a separate note, as in F3.

New `ruleChip(insight)`: the short chip text for a fired rule, from fixed
templates. `cash-heavy` → `Cash-heavy 84%` (the cash share as a whole
percent, `formatWholePercent`); every other rule → its `label` (`No REKSA`,
`No AUM`, `High income, no BANCA`).

ADR 0008 gets a dated update section: offers are shown grouped by product
with the order above. `RULE_ORDER` still decides which rule fires first in a
group and which chip the Customers table shows.

### 5.3 Selectors (`src/lib/selectors/`)

`book.ts`: `BookCustomer` gains `lastActive: { days, date }` (customer-
initiated, as on Customer 360 today), `firstTransaction` (`YYYY-MM-DD`), and
`cash` (`cashAmount`).

New `portfolio.ts` (replaces `overview.ts` in part B):

`buildPortfolio(data, band: number | null)` filters the book to the income
rank, then returns:

| Part | Content | Real data, no band filter |
| --- | --- | --- |
| Header | `As of 26 Apr 2024 · 100 customers` | — |
| Customers tile | count, `X with AUM · Y without` | 100; 84 · 16 |
| Total AUM tile | `formatIDR` sum | Rp 811.749.876.893 |
| Loan exposure tile | sum, "Not part of AUM." | Rp 1.582.500.470.995 |
| KYC tile | count, the KYC note `ruleText` | 43 |
| Opportunities line | `N customers with at least one opportunity` | 84 |
| Opportunity tiles | per rule in `RULE_ORDER`: label, count, `ruleText`, amount line, link | below |
| Penetration bars | FUNDING, ORI, BANCA, REKSA, LOAN: held, not held, link | 84/16, 46/54, 54/46, 54/46, 83/17 |
| Scatter | as F5 (`IncomeAumScatter`), filtered to the band | 84 points, 43 KYC |

Opportunity tile amounts (real data, no band filter). The tiles overlap, so
the amounts are never added together; the amount line says what it sums.

| Rule | Count | Amount line |
| --- | --- | --- |
| `cash-heavy` | 12 | `Cash Rp 551.749.143.391` |
| `investment-gap-reksa` | 29 | `AUM Rp 381.048.084.517` |
| `investment-gap-ori` | 37 | `AUM Rp 366.113.426.621` |
| `investment-gap-banca` | 29 | `AUM Rp 101.778.947.711` |
| `no-aum` | 16 | no amount line |
| `high-income-no-banca` | 6 | `3 also in No BANCA` |

With a band filter, every number above is recomputed over that band. The
scatter then shows one column; that is expected. The header keeps the book
total and adds the band (`… · 7 customers in >5 Juta - 10 Juta`; exact
template set by the plan).

New `customers.ts` (replaces `worklist.ts` in part B):

- `buildCustomerRows(data)`: every customer in the current default order
  (`compareWorklist`: fired rules, then AUM, then ID). A row has `rank`,
  `customerId`, `aum`, `chip` (`ruleChip` of the first fired rule, or
  `null`), `moreCount` (other fired rules), `lastActive`, `kyc` (boolean),
  `incomeRank`, `lacks` (categories not held), and the preview fields
  below.
- `parseCustomerFilters(params)` and `filterCustomers(rows, filters)` for the
  params of 4.3.
- `paginate(rows, page)`: 25 per page. Returns the rows, the page, the page
  count, and `Showing 1–25 of 84`.
- `customerSummary(shown, total, filters)`: the line above the table, from
  fixed templates, as `worklistSummary` does today.
- `neighbours(rows, id)`: `{ index, total, prevId, nextId }` within the
  filtered rows, or `null` when the ID is not in them. No wrap-around at the
  ends (my call: the design wraps, but "1 of 14" with a "previous" that
  jumps to 14 is surprising).
- Preview fields per row: gender, income band, the High income and KYC
  flags, first transaction, AUM, loan exposure, the first two
  `productOffers` cards, top channel with share, and last active.

`customer360.ts` gains (added next to the current fields in part A):

- `profile.firstTransaction` (`First transaction Jul 2014`),
- no income rank label. User decision (2026-11-24): the design's "#5 of 8
  in income band" and any "rank N of 8" text mislead, so the header shows
  only the band itself (`>10 Juta - 25 Juta`). The current
  `profile.incomeRankLabel` is removed in part B,
- `kpis.products`: the held count and the held categories
  (`8 · FUNDING, ORI`),
- `offers.products`: `productOffers` cards with their copy (5.6),
- `holdings.held`: held AUM rows (FUNDING, ORI, BANCA, REKSA) sorted by
  amount, high to low, each with `shareOfAum`, and `holdings.notHeld`: the
  AUM rows with amount 0 or `null`. LOAN rows move to `loans`,
- `loans` (section 5.7),
- `recent`: the 5 latest transactions (the current row order),
- `topChannel`.

### 5.4 Tests

- Unit tests with fixtures for every new function.
- Contract tests on the real data for every number in 5.3 and for the card
  count per product (computed by the plan, then pinned).
- The current contract tests (12/29/37/29/16/6, penetration 84/46/54/54/83,
  totals) stay green in both parts.
- `loanFacilities` (5.7): unit tests, plus contract tests for 83 customers
  with a loan and a maximum of 10 loans per customer.

### 5.5 Not in part A

No component, page, route, or CSS change. No dependency change.

### 5.6 Copy (Rule 9)

| Design text | Built text |
| --- | --- |
| "Move idle cash into REKSA" (card title) | `REKSA · 2 rules` |
| Rule bullets | the existing reason strings |
| "Pitch from: Rp 1,06 M idle cash" | `Cash Rp 1.061.852.300` or `AUM Rp …` (`basis`) |
| "Reach via mobile banking (38% of transactions)" | `Top channel: MOBILE BANKING, 11 of 29 customer-initiated transactions (38%)` |
| "Check before any offer" (KYC tile) | the KYC note `ruleText` |
| "Activation list" (No AUM tile) | no amount line |
| "Overlaps No BANCA" | `3 also in No BANCA` |
| "Next: a monthly view across the full history…" | removed (a roadmap note, not data) |
| "Customer since Jul 2014" | `First transaction Jul 2014` |

### 5.7 Loan facilities per customer (user request, 2026-11-24)

The user asked for the loan facilities of each customer, next to Holdings
on Customer 360. The data has only a product code and an amount for each
LOAN row: no facility type, collectibility (kolektibilitas), days past due,
limit, or maturity. There are 43 distinct LOAN codes. User decision
(2026-11-24): **show the code and the amount only; do not map codes to
types** (a code-to-type map is a business definition, Rule 3).

New domain function `loanFacilities(items)` in `src/lib/domain/portfolio.ts`:

- input: one customer's portfolio rows; it reads only `LOAN` rows,
- `held`: rows with amount above 0, sorted by amount, high to low, each
  with `product` (`Unnamed product` when `null`, as today), `amount`, and
  `shareOfExposure` (amount / `loanExposure`),
- `notHeld`: LOAN rows with amount 0 or `null`, in data order,
- `exposure`: the existing `loanExposure` total.

`customer360.ts` gains `loans: { title, held, notHeld, exposure,
missingText }`:

- `title`: `<n> loan facilities, <formatIDR(exposure)> in total` (`1 loan
  facility` for one; `formatIDR`). With no held loan: `No loan facility
  held.`
- `missingText`: `Facility type, collectibility, days past due, and maturity
  are not in the data.` (fixed text, shown once).

Real data: 83 of 100 customers hold at least one loan; a customer holds 1
to 10. These become contract tests. Loans are never added to or shown as a
share of AUM.

## 6. UI (part B, `feat/redesign-ui`)

### 6.1 Visual system v2 (new ADR 0009, replaces ADR 0007)

Kept from ADR 0007: colors only as CSS variables in `src/index.css`;
red is never a risk color, a chart series, or a flag; every flag has an
icon and a label; the contrast test covers every pairing in both themes;
chart rules (no LOAN stacked with AUM, fact titles, short money with the
full value in a tooltip).

Changed:

- **Light is the default theme.** Dark stays behind the toggle. The inline
  script in `index.html` defaults to light. Dark tokens are derived from
  the new palette.
- **Fonts:** Inter (body, tabular numbers) and Space Grotesk (page titles,
  large numbers), from `@fontsource-variable/inter` and
  `@fontsource-variable/space-grotesk`. Plus Jakarta Sans is removed.
- **Tokens** from the handoff, red column, converted to `oklch`:
  primary `#E2231A`, primary-strong `#9B1B14`, primary-tint `#FFF1EF`,
  selected-bg `#FFF7F6`, primary-border `#F5C2BE`, page-bg `#F7F6F5`, text
  `#1D1B1A`, text-muted `#5E6169`, border `#E4E4DF`, surface `#FFFFFF`,
  warning-bg `#FBF1DC` / warning-text `#6B4600`.
- **Contrast fixes** (the test decides the exact values):
  - White on `#E2231A` measures 4.68:1 and passes, so `--primary` is the
    brand hex. Red link text on the page background measures 4.33:1 and
    fails, so links use primary-strong.
  - REKSA `#C9921A` measures 2.76:1 on white and fails the 3:1 chart rule.
    It is darkened until it passes.
  - The design draws the weekly bars in red. They use a chart token.
  - The design gives the "High income" chip a red tint. It uses the info
    token, because red is never a flag.
- **Product colors** (charts only): FUNDING `#4A6FD1`, ORI `#1E8C84`, BANCA
  `#8063C9`, REKSA (darkened), LOAN `#8B8E95`.
- Radius 8 px for controls, 12–14 px for cards. Touch targets at least
  40 px. Lucide icons, 16 px, stroke 2, from the handoff's icon list.

### 6.2 Pages

- **Portfolio (`/`):** header, band chips (All + 8 bands, `aria-pressed`),
  4 KPI tiles, the opportunities line and 6 tiles, penetration bars with
  "N not held", the scatter as a full-width card. Every tile and AUM-product
  bar is a link (4.3).
- **Customers (`/customers`):** header line, filters (opportunity, income
  band, KYC note, product not held, ID search, Clear filters), the table
  with 6 columns (Rank · Customer · AUM · Opportunities · Last active ·
  KYC), 25 rows per page, and the preview panel.
  - The KYC column shows the `triangle-alert` icon with the accessible name
    "KYC note".
  - Selecting a row (click, or Enter/Space on the row's customer button)
    opens the preview. The panel sits on the right on wide screens and
    under the table on narrow screens. It has prev/next within the current
    page's filtered rows and "Open full 360".
  - With no selection, the panel shows the first row of the page (my call,
    as in the design).
  - Column sorting: the default order only (my call: the rank column is the
    order, and prev/next on Customer 360 follows it).
- **Customer 360 (`/customers/:id`):**
  - The summary header is fixed: ID, gender, income band, flags, first
    transaction, the 5 KPI tiles, the breadcrumb, and
    prev/next ("1 of 14 in your filtered list", shown only when the ID is in
    the filtered list).
  - Tabs: Overview · Holdings · Loans · Activity · Transactions (Loans is
    new, user request 2026-11-24). The tab is the URL
    param `tab` (my call: back button and links work). The default is
    Overview.
  - Overview: "What to offer" (product cards, #1 with its bullets, basis,
    and top channel; the rest compact), the KYC note, AUM by category, and
    the 5 most recent transactions with "View all", which opens the
    Transactions tab.
  - Holdings: held AUM rows with share of AUM; "N products not held"
    toggles the rest; one line that loans are on the Loans tab, outside AUM.
  - Loans: the `loans` title, a table of held facilities (Product code ·
    Amount · Share of loan exposure), "N loan rows not held" toggles the
    rest, and the `missingText` line. Lucide `landmark` icon.
  - Activity: weekly chart, channel mix, type mix, bank entries (all exist
    today).
  - Transactions: the current table with All / Customer-initiated / Bank
    entries.

### 6.3 Removed in part B

`overview.ts`, `worklist.ts`, the sidebar, the old offer panel, and any
export that only they used. The old page tests are rewritten for the new
pages. The e2e smoke test follows the new routes.

### 6.4 Docs in part B

ADR 0009 (visual system v2, supersedes 0007; 0007 gets status
"Superseded by 0009"). CLAUDE.md Rule 10, the folder list, and the font row
of the stack table. README routes table.

## 7. What is left to the builder

- Exact component split and file names under `src/components/`.
- The exact dark-theme token values, within the contrast test.
- The exact header template with a band filter (5.3).
- Responsive break points.
