# Redesign v2, part B: UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the visual system v2 and the three redesigned pages (Portfolio, Customers, Customer 360) on the part A selectors, and remove what the new UI no longer uses.

**Architecture:** Part A (`feat/redesign-logic`, plan `2026-11-24-redesign-logic.md`) is merged first; this branch starts from it. Pages and components only render selector output. The few new pure helpers this plan needs (`parseTab`, `positionText`, `listHref`, `customerHref`, `snapshotLabel`) go in `src/lib/selectors/` with tests. Each task leaves the app working and `npm run test` green.

**Tech Stack:** React 19, React Router (library mode), Tailwind v4 + shadcn (radix-nova), Recharts 3, TanStack Table, Vitest + RTL, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-24-redesign-v2-design.md` (section 4 for routes and URL state, section 6 for the UI)

## Global Constraints

- Layers (ADR 0004): UI → selectors → insights → domain → types. Only selectors import `src/data`. Components compute nothing; a bar width from two given numbers is drawing geometry, not a business value.
- Minors deferred from part A, fix where the task touches the file: `getCustomerRows()` returns `readonly CustomerRow[]`; `customer360.ts` uses `UNNAMED_PRODUCT` and imports `channelText` from a text module that does not build the rows at import; the ID box trims before it writes `q`; the cash-heavy reason shown on both the REKSA and ORI cards is not shown as two separate pitches.
- Money only through `<Money>` / `formatIDR()` / `formatIDRShort()`. Percent only through `formatPercent` / `formatWholePercent`.
- Colors only as CSS variables in `src/index.css`. No hex, `rgb()`, or `oklch()` in `src/components/` or `src/pages/`. Red is never a risk color, a chart series, or a flag.
- LOAN is never added to, stacked with, or shown as a share of AUM.
- Copy rule (Rule 9): only selector strings and the fixed copy in spec 5.6. No design placeholder (`[N]`, `[date]`), no advice-tone title, no "Next: a monthly view…" note.
- No income rank label anywhere (no "rank N of 8", no "#5 of 8"). No AUM range filter. No last-active filter, no engagement row.
- Do not change the insight rules, `thresholds.ts`, or the fire counts 12 / 29 / 37 / 29 / 16 / 6.
- `data/raw/` and `src/data/*.json` untouched. New dependencies: only the two font packages and the shadcn `tabs` component.
- Commits: Conventional Commits, author is the user, no `Co-Authored-By` trailer.

## Review Focus

- Typing in the Customers ID box keeps the caret and drops `page` from the URL (Task 4 test).
- A stale `page` after a filter change: `/customers?rule=investment-gap-ori&page=4` shows page 1 (`Showing 1–25 of 37`, spec 4.3 "out of range → page 1"), not an empty table (Task 4 test).
- Customer 360 opened with filter params but an ID outside the filtered list: no position text, no prev/next, and the breadcrumb still keeps the params (Task 5 test).
- An unknown `?tab=` value opens Overview, and a tab switch keeps the filter params (Task 5 test).
- A viewer who stored `dark` under ADR 0007 still gets dark before first paint; blocked storage now gives light (Task 2 test, Task 7 e2e).

---

### Task 1: ADR 0009, visual system v2

**Files:**

- Create: `docs/adr/0009-visual-system-v2.md`
- Modify: `docs/adr/0007-visual-system.md` (status line only)

- [ ] **Step 1:** Write ADR 0009 in the repo's ADR template (Status, Date 2026-11-24, Context, Decision, Consequences, Alternatives considered). Decision content is spec 6.1: kept rules from 0007; light default with the dark toggle; Inter + Space Grotesk replace Plus Jakarta Sans; the OCBC-red token table from the handoff; the contrast fixes (white on `#E2231A` 4.68:1 passes so `--primary` is the brand hex; red text on `#F7F6F5` 4.33:1 fails so red text uses `--primary-strong`; REKSA `#C9921A` 2.76:1 fails 3:1 and is darkened; weekly bars use a chart token; "High income" uses the info token); product colors FUNDING `#4A6FD1`, ORI `#1E8C84`, BANCA `#8063C9`, REKSA darkened, LOAN `#8B8E95`; radius 8 px controls, 12–14 px cards; touch targets ≥ 40 px; Lucide 16 px. Alternatives: keep dark default (rejected, user 2026-11-24), teal theme or a theme switch (rejected, user 2026-11-24), exact `#C9921A` (fails 3:1). Link the redesign spec.
- [ ] **Step 2:** In ADR 0007 set `- **Status:** Superseded by [0009](0009-visual-system-v2.md)`. Change nothing else.
- [ ] **Step 3:** `npm run lint:md` → 0 errors.
- [ ] **Step 4:** `git commit -m "docs: add ADR 0009 for the visual system v2"`

### Task 2: Tokens, fonts, light default

**Files:**

- Modify: `src/index.css`, `scripts/theme/contrast.test.ts`, `index.html`, `src/lib/theme.ts`, `src/lib/theme.test.ts` (create if missing), `src/components/ThemeToggle.tsx`, `src/components/ThemeToggle.test.tsx`, `package.json`, `package-lock.json`, `src/components/customer/HorizontalBars.tsx` (comment only)

**Interfaces:**

- Produces tokens (both blocks of `src/index.css`, each with a `--color-*` entry in `@theme inline`): `--primary` (`#E2231A`), `--primary-strong` (`#9B1B14`, replaces `--brand-deep`; `--brand-text` is removed), `--primary-tint` (`#FFF1EF`), `--selected` (`#FFF7F6`), `--primary-border` (`#F5C2BE`), `--warning-surface` (`#FBF1DC`) and `--warning-surface-foreground` (`#6B4600`); light `--background` `#F7F6F5`, `--foreground` `#1D1B1A`, `--card` `#FFFFFF`, `--muted-foreground` `#5E6169`, `--border` `#E4E4DF`; `--chart-1..5` = FUNDING, ORI, BANCA, REKSA (darkened), LOAN. Every `--sidebar*` token is removed. Fonts: `--font-sans` Inter Variable, `--font-heading` Space Grotesk Variable.
- `readStoredTheme(): Theme` now returns `'light'` unless `localStorage.theme === 'dark'`.

- [ ] **Step 1: Write the failing tests:**
  - `contrast.test.ts`: drop the sidebar pairs and the `--sidebar-ring` case; replace `brand-text`/`brand-deep` pairs with `['primary-strong', 'card']`, `['primary-strong', 'background']`, `['primary-strong', 'primary-tint']`, `['primary-strong', 'selected']`, `['foreground', 'selected']`, `['primary-foreground', 'primary-strong']`, `['warning-surface-foreground', 'warning-surface']`; add `ring` on `background` ≥ 3:1. Keep every other pair, both themes.
  - `theme.test.ts`: nothing stored → `'light'`; `'dark'` stored → `'dark'`; any other value → `'light'`; `getItem` throws → `'light'`.
  - `ThemeToggle.test.tsx`: on first render the button is `Switch to dark theme`; a click sets `.dark` on `<html>` and stores `dark`.
- [ ] **Step 2:** `npx vitest run scripts/theme src/lib/theme.test.ts src/components/ThemeToggle.test.tsx` → FAIL (missing tokens, dark default).
- [ ] **Step 3:** `npm uninstall @fontsource-variable/plus-jakarta-sans && npm install @fontsource-variable/inter @fontsource-variable/space-grotesk`. Import both in `index.css`. Convert the hex values to `oklch` with a throwaway script in the scratchpad (no new dependency). Darken REKSA and pick the dark-theme values until the test passes; keep each value in gamut. `index.html`: no `dark` class on `<html>`; the inline script adds `dark` only when the stored value is `dark`. Update the ADR references in comments from 0007 to 0009. In `HorizontalBars.tsx` change the font name in the `LABEL_WIDTH` comment; Task 7's e2e decides whether the width still fits.
- [ ] **Step 4:** Same command, then `npm run test` → PASS.
- [ ] **Step 5:** `git commit -m "feat: apply the visual system v2 tokens, fonts, and light default"`

### Task 3: Top bar, routes, and the Portfolio page

**Files:**

- Modify: `src/components/AppShell.tsx`, `src/routes.tsx`, `src/components/overview/IncomeAumScatter.tsx` → move to `src/components/portfolio/IncomeAumScatter.tsx`, `src/lib/selectors/portfolio.ts` (+ test), `src/lib/selectors/customer360.ts` (+ test), `src/pages/WorklistPage.test.tsx` (paths only), `eslint.config.js` (only if `use-mobile.ts` is deleted)
- Create: `src/pages/PortfolioPage.tsx`, `src/pages/PortfolioPage.test.tsx`, `src/components/AppShell.test.tsx`, `src/components/portfolio/BandChips.tsx`, `src/components/portfolio/OpportunityTiles.tsx`, `src/components/portfolio/PenetrationList.tsx`
- Delete: `src/pages/OverviewPage.tsx`, `src/pages/OverviewPage.test.tsx`, `src/components/overview/OpportunityStrip.tsx`, `src/lib/selectors/overview.ts` (+ test), `src/components/ui/sidebar.tsx`; also `src/components/ui/sheet.tsx`, `src/components/ui/skeleton.tsx`, `src/hooks/use-mobile.ts` when `grep` finds no other importer

**Interfaces:**

- Consumes: part A `getPortfolio(band)`, `Portfolio`, `parseCustomerFilters`, `scatterOf`.
- Produces: `snapshotLabel = 'Snapshot as of 26 Apr 2024'` (built from `asOfDate`) in `customer360.ts`; `asOfLabel` removed when unused. `scatterOf` and the scatter type move into `portfolio.ts` (`Portfolio['scatter']`) before `overview.ts` is deleted. Routes: `/` `PortfolioPage`, `/customers` `WorklistPage` (until Task 4), `/customers/:id` `CustomerPage`, `/overview` `<Navigate to="/" replace />`, `*` `NotFoundPage`.

Top bar (spec 4.2), one `<header>`: "Customer 360", `<nav aria-label="Main">` with links `Portfolio` (`/`, Lucide `LayoutDashboardIcon`) and `Customers` (`/customers`, `UsersIcon`), `CustomerSearch`, `snapshotLabel`, `ThemeToggle`. The current link has `aria-current="page"` and the red bottom bar. It wraps on narrow screens.

Portfolio (spec 6.2): `h1` "Portfolio", `header`; `BandChips` (All + the 8 `INCOME_BANDS`, buttons with `aria-pressed`; the band comes from `parseCustomerFilters(params).band`; a click writes `?band=<rank>` or removes it); KPI `dl` (aria-label "Book totals") with Customers (`customers.text`, e.g. `84 with AUM · 16 without`), Total AUM, Loan exposure ("Not part of AUM."), With KYC note (`kyc.text`, the tile is a link to `kyc.to`); `opportunitiesLine`; `OpportunityTiles` (list aria-label "Opportunities", one link per tile, accessible name `` `${label}: ${count} customers` ``, shows count, label, `ruleText`, `amountLine`); `PenetrationList` (list aria-label "Product penetration", each row shows `label`, `held`, `N not held`, a bar of width `held / (held + notHeld)` in `color`; rows with `to` are links named `` `${label}: ${held} held, ${notHeld} not held` ``); the scatter full width.

- [ ] **Step 1: Write the failing tests:**
  - `AppShell.test.tsx`: on `/` the `Portfolio` link has `aria-current="page"`; on `/customers` and `/customers/4426` `Customers` has it; `Snapshot as of 26 Apr 2024` shows; `/overview` lands on the `Portfolio` heading with pathname `/`; `document.querySelector('[data-slot="sidebar"]')` is `null`.
  - `PortfolioPage.test.tsx` (real data): header `As of 26 Apr 2024 · 100 customers`; `All` is pressed; totals show `Rp 811.749.876.893` and `Rp 1.582.500.470.995`; `84 customers with at least one opportunity`; tile link names `Cash-heavy AUM: 12 customers` … `High income, no BANCA: 6 customers` in that order; `No ORI: 37 customers` has href `/customers?rule=investment-gap-ori` and shows `AUM Rp 366.113.426.621`; the KYC tile links to `/customers?kyc=yes`; `ORI: 46 held, 54 not held` links to `/customers?lacks=ORI`; the LOAN row has no link; clicking `>5 Juta - 10 Juta` sets `?band=4`, shows `As of 26 Apr 2024 · 7 of 100 customers, income >5 Juta - 10 Juta`, and the ORI tile href ends with `&band=4`; `/?band=abc` behaves as All; no text matches `/Check before any offer|Activation list|\[N\]/`.
  - Move the paths in `WorklistPage.test.tsx` from `/` to `/customers` (no other change).
- [ ] **Step 2:** `npx vitest run src/components/AppShell.test.tsx src/pages/PortfolioPage.test.tsx` → FAIL.
- [ ] **Step 3:** Implement; delete the files listed. `npm run lint` must stay clean (remove the `use-mobile.ts` override in `eslint.config.js` if that file goes; keep the path strings in `eslint.config.test.ts`).
- [ ] **Step 4:** `npm run test` → PASS.
- [ ] **Step 5:** `git commit -m "feat: replace the sidebar with a top bar and make Portfolio the home page"`

### Task 4: Customers page with the preview panel

**Files:**

- Create: `src/pages/CustomersPage.tsx`, `src/pages/CustomersPage.test.tsx`, `src/components/customers/CustomerFilters.tsx`, `src/components/customers/CustomersTable.tsx`, `src/components/customers/CustomerPreview.tsx`
- Modify: `src/routes.tsx`, `src/lib/selectors/customers.ts` (+ test)
- Delete: `src/pages/WorklistPage.tsx` (+ test), `src/components/worklist/`, `src/lib/selectors/worklist.ts` (+ test)

**Interfaces:**

- Consumes: part A `getCustomerRows`, `parseCustomerFilters`, `filterCustomers`, `paginate`, `customerSummary`, `customersQuery`, `CustomerRow`, `CustomerPreview`.
- Produces in `customers.ts`: `listHref(filters: CustomerFilters): string` → `/customers` + `customersQuery({ ...filters, page: 1 })`; `customerHref(id: number, filters: CustomerFilters, tab?: string | null): string` → `/customers/<id>` + the same query, plus `tab=<tab>` last when `tab` is set and not `overview`.

Page: `h1` "Customers", `customerSummary` (`aria-live="polite"`); `CustomerFilters`: four selects (Opportunity: `RULES` labels; Income band: `INCOME_BANDS`; KYC note: any / with / without; Product not held: FUNDING, ORI, BANCA, REKSA), the ID box (`aria-label` "Filter by customer ID", keep the `qText` / `location.key` pattern from `WorklistPage`), "Clear filters". Every filter write uses `replace` and deletes `page`. `CustomersTable` (aria-label "Customers"): Rank · Customer · AUM · Opportunities · Last active · KYC. Customer cell = a button `Customer <id>` (`aria-pressed` when selected) plus an icon link `Open customer <id>` to `customerHref`. Opportunities = `chip` + `+<moreCount>` when > 0. Last active = `lastActive.label`. KYC = `TriangleAlertIcon` with `role="img"` and `aria-label="KYC note"` when `kyc`. Under the table: `paginate(...).label` and Previous page / Next page buttons writing `page`. `CustomerPreview` (`<section aria-label="Preview">`): right column on `lg`, under the table below it; selection is component state, reset to the first row of the page when the page or filters change; shows heading `Customer <id>`, `<position> of <rows on page>`, flags (High income with `BadgeCheckIcon`, KYC note with `TriangleAlertIcon`), `firstTransaction`, AUM and loan exposure (`<Money>`), the first two offers (`title`, `basisText`), `channelText`, `lastActiveText`, Previous / Next within the page, and the link "Open full 360" to `customerHref`.

- [ ] **Step 1: Write the failing tests:**
  - `customers.test.ts`: `listHref` with `rule` and `page: 3` → `/customers?rule=investment-gap-ori`; `customerHref(8797, filters, 'loans')` → `/customers/8797?rule=investment-gap-ori&tab=loans`; tab `overview` or `null` → no `tab`. Before deleting `worklist.ts`, read the first five IDs of `getWorklist()` and pin them as literals in the order test of `getCustomerRows()` (first is 8797).
  - `CustomersPage.test.tsx` (real data): `/customers` shows `100 customers.`, 25 body rows, rank cells `1`, `2`, `3` first, `Showing 1–25 of 100`; Next page → `?page=2`, `Showing 26–50 of 100`; choosing "No ORI" → `?rule=investment-gap-ori` (no `page`), `Showing 1–25 of 37`; `/customers?rule=investment-gap-ori&page=4` → `Showing 1–25 of 37` (out of range → page 1); `/customers?lacks=ORI` → `Showing 1–25 of 54`; `/customers?band=4&kyc=yes` → `No customers match these filters.` and no table rows; typing `44` in the ID box → search `?q=44` and the input value `44`; the preview shows `Customer 8797` by default; pressing Enter on the second row's button moves the preview to that ID; "Open full 360" in `/customers?rule=investment-gap-ori` has href `/customers/<first id>?rule=investment-gap-ori`; on page 2 the preview shows row 26; no element names an AUM range or last-active filter.
- [ ] **Step 2:** `npx vitest run src/lib/selectors/customers.test.ts src/pages/CustomersPage.test.tsx` → FAIL.
- [ ] **Step 3:** Implement; route `/customers` → `CustomersPage`; delete the files listed.
- [ ] **Step 4:** `npm run test` → PASS.
- [ ] **Step 5:** `git commit -m "feat: add the customers list with filters, pages, and a preview panel"`

### Task 5: Customer 360 header, navigation, tabs, and the Overview tab

**Files:**

- Modify: `src/pages/CustomerPage.tsx`, `src/pages/CustomerDetail.tsx`, `src/pages/CustomerDetail.test.tsx`, `src/pages/CustomerDetail.all.test.tsx`, `src/components/customer/ProfileHeader.tsx`, `src/components/customer/KpiRow.tsx`, `src/lib/selectors/customer360.ts` (+ test), `src/lib/selectors/customers.ts` (+ test)
- Create: `src/components/ui/tabs.tsx` (`npx shadcn@latest add tabs`), `src/components/customer/CustomerNav.tsx`, `src/components/customer/ProductOfferList.tsx`, `src/components/customer/RecentTransactions.tsx`
- Delete: `src/components/customer/OfferPanel.tsx` (+ test)

**Interfaces:**

- Consumes: part A `Customer360` additions (`profile.firstTransaction`, `kpis.products`, `productOffers`, `channelText`, `recent`), `neighbours`, Task 4 `listHref` / `customerHref`.
- Produces: in `customer360.ts`, `CUSTOMER_TABS = ['overview', 'holdings', 'loans', 'activity', 'transactions'] as const`, `type CustomerTab`, `parseTab(value: string | null): CustomerTab` (unknown → `'overview'`); `profile.incomeRankLabel` removed (and `kpis.heldLabel` when no reader is left). In `customers.ts`, `positionText(n: { position: number; total: number }): string` → `2 of 37 in your filtered list`. `CustomerDetail` props become `{ vm: Customer360; tab: CustomerTab; onTabChange: (tab: CustomerTab) => void; nav: ReactNode }`.

`CustomerPage` reads the filters and `tab` from the URL, gets `neighbours(filterCustomers(getCustomerRows(), filters), id)`, and renders `CustomerNav` (breadcrumb `<nav aria-label="Breadcrumb">`: link `Customers` to `listHref(filters)`, then `Customer <id>`; when neighbours is not `null`: `positionText`, links `Previous customer` / `Next customer` to `customerHref(prevId|nextId, filters, tab)`, each absent at its end). A tab change pushes `tab` (removed for `overview`) and keeps the other params. Header: `h1` `Customer <id>`, gender, the band only, flags (High income: `BadgeCheckIcon`, info token; KYC note: `TriangleAlertIcon`, warning surface), `profile.firstTransaction` (`string | null`; render nothing when `null`). `KpiRow`: AUM, Loan exposure ("Outside AUM"), Products held (`kpis.products.label`, e.g. `3 · FUNDING, ORI, REKSA`), Last active, Digital share. Tabs list aria-label "Customer sections", triggers Overview · Holdings · Loans · Activity · Transactions. Overview tab: region "What to offer" with `ProductOfferList` (list "Offers"; card 1 shows `title`, the `reasons` as a list, `basisText`, `channelText`; the rest show `title` and `basisText`; `offers.emptyText` when empty), the KYC note (`offers.note`, `InsightCard`, under heading "Note"), the AUM by category chart (current `HorizontalBars` + `holdings.title`), and `RecentTransactions` (list "Recent transactions", date, type · method, `formatIDR` amount, a "View all" button that opens the Transactions tab). Holdings, Loans, Activity, and Transactions panels render the current sections until Task 6.

- [ ] **Step 1: Write the failing tests:**
  - `customer360.test.ts`: `parseTab('loans')` → `'loans'`; `null`, `''`, `'LOANS'`, `'bogus'` → `'overview'`; `getCustomer360(8797).profile` has no `incomeRankLabel` key.
  - `customers.test.ts`: `positionText({ position: 2, total: 37 })` → `'2 of 37 in your filtered list'`; total 1 → `'1 of 1 in your filtered list'`.
  - `CustomerDetail.test.tsx` (router render, real data): `/customers/8797` shows the band, `getCustomer360(8797).profile.firstTransaction`, no text matching `/rank \d+ of \d+|#\d+ of \d+|Customer since/`; the first offer card title equals `vm.productOffers[0].title` (`REKSA · 2 rules` for 8797: rule count, then `RULE_ORDER`, spec 5.2 update), with its reasons and `channelText`; exactly one card in the "Offers" list has a title starting with `BANCA` for customer 6513 and it lists both BANCA reasons; customer 1047 shows `No offer rule fired.` and the KYC note; "View all" sets `?tab=transactions` and shows the "Transactions" table; `?tab=bogus` selects Overview; with `rows = filterCustomers(getCustomerRows(), { …rule: 'investment-gap-ori' })`, `/customers/<rows[1]>?rule=investment-gap-ori` shows `2 of 37 in your filtered list`, `Previous customer` href `/customers/<rows[0]>?rule=investment-gap-ori`, breadcrumb `Customers` href `/customers?rule=investment-gap-ori`; `/customers/<rows[0]>?…` has no `Previous customer` link; an ID outside the list shows no position text and no prev/next, and the breadcrumb keeps the params; switching to Loans from `?rule=investment-gap-ori` gives `?rule=investment-gap-ori&tab=loans`.
  - `CustomerDetail.all.test.tsx`: render every customer at every tab inside a memory router; no console error or warning except the zero-size chart warning; raise the timeout if needed.
- [ ] **Step 2:** `npx vitest run src/lib/selectors src/pages/CustomerDetail.test.tsx` → FAIL.
- [ ] **Step 3:** Implement; delete `OfferPanel`; remove insight exports that only it used (`grep` each before removing; keep `offerPanel`, which still gives `note` and `emptyText`).
- [ ] **Step 4:** `npm run test` → PASS.
- [ ] **Step 5:** `git commit -m "feat: add the customer 360 header, filtered navigation, tabs, and overview"`

### Task 6: Holdings, Loans, Activity, and Transactions tabs

**Files:**

- Modify: `src/pages/CustomerDetail.tsx`, `src/pages/CustomerDetail.test.tsx`, `src/components/customer/ProductTable.tsx`, `src/components/customer/WeeklyBars.tsx`, `src/lib/selectors/customer360.ts` (+ test, remove fields with no reader)
- Create: `src/components/customer/LoanTable.tsx`

**Interfaces:**

- Consumes: part A `holdings.held`, `holdings.notHeld`, `loans` (`title`, `held: LoanFacility[]`, `notHeld`, `exposure`, `missingText`).

Holdings: `ProductTable` (aria-label "Holdings") with Product · Category · Amount · Share of AUM (`formatPercent(share)`), held rows only; a toggle button `<n> products not held` (`aria-expanded`) shows the `notHeld` rows; one fixed line `Loans are on the Loans tab, outside AUM.`; `holdings.emptyText` when there is nothing. Loans (Lucide `LandmarkIcon` beside the heading): `loans.title`; `LoanTable` (aria-label "Loan facilities") Product code · Amount (`formatIDR`) · Share of loan exposure (`formatPercent`); a toggle `<n> loan rows not held` when `notHeld` is not empty; `loans.missingText` always. Activity: the weekly chart (bars in `--chart-1`, not red), channel mix, type mix, bank entries. Transactions: the current `TransactionsTable`.

- [ ] **Step 1: Write the failing tests** (`CustomerDetail.test.tsx`, real data):
  - `?tab=holdings` for 8797: the "Holdings" table rows equal `vm.holdings.held` in order with `formatPercent` shares; no LOAN row; the not-held rows show only after the toggle; the loans line shows.
  - `?tab=loans` for the customer with the most held loans (found from `getCustomer360` over `getCustomerOptions()`): 10 rows, first row amount ≥ second, `vm.loans.title`, and `Facility type, collectibility, days past due, and maturity are not in the data.`; for a customer with no held loan: `No loan facility held.` and the missing-data line; no text maps a code to a type.
  - `?tab=activity`: images named `Customer-initiated transactions per week…`, `Channel mix…`, `Type mix…`, and the bank entries line.
  - `?tab=transactions`: the "Transactions" table with the All / Customer-initiated / Bank entries filter.
- [ ] **Step 2:** `npx vitest run src/pages/CustomerDetail.test.tsx` → FAIL.
- [ ] **Step 3:** Implement; remove `Customer360` fields and helpers no component reads any more, with their tests.
- [ ] **Step 4:** `npm run test` → PASS.
- [ ] **Step 5:** `git commit -m "feat: add the holdings, loans, activity, and transactions tabs"`

### Task 7: E2E smoke test on the new routes

**Files:**

- Modify: `e2e/smoke.spec.ts`, `src/components/customer/HorizontalBars.tsx` (`LABEL_WIDTH` only if the label test fails)

- [ ] **Step 1:** Rewrite the smoke tests for the new routes:
  - `./` shows `Portfolio`; the `No ORI: 37 customers` tile opens `/customers?rule=investment-gap-ori` with 25 rows and `Showing 1–25 of 37`.
  - `./overview` lands on `./` with the `Portfolio` heading.
  - `./customers`: 25 rows; `Open customer 8797` opens `/customers/8797`.
  - the caret test on `./customers?q=4426` → URL ends `/customers?q=44726`.
  - `./customers/4426` deep link: heading, "Key figures"; `?tab=transactions` shows the "Transactions" table.
  - `./customers/6513`: one BANCA card with both `No BANCA` reasons.
  - `./customers/1047`: `No offer rule fired.` and the KYC note.
  - search opens 4857 (unchanged).
  - theme: first load has no `dark` class; `Switch to dark theme` adds it; it survives a reload.
  - preview with the keyboard on `./customers`: focus the second row's customer button, press Enter, the "Preview" heading changes.
  - label fit on `./customers/4857?tab=activity`; keyboard-stop, scatter-axis, and axis-color tests on `./` and `./customers/4426?tab=activity`.
- [ ] **Step 2:** `npm run build && npm run e2e`. If the label-fit test fails with Inter, measure the longest label and update `LABEL_WIDTH` and its comment; re-run → PASS.
- [ ] **Step 3:** `git commit -m "test: move the e2e smoke test to the redesigned routes"`

### Task 8: Docs and the branch check

**Files:**

- Modify: `CLAUDE.md`, `README.md`, `docs/superpowers/specs/2026-11-24-redesign-v2-design.md` (ADR link only)

- [ ] **Step 1:** `CLAUDE.md`: stack font row → `Inter (body) and Space Grotesk (headings, large numbers), @fontsource-variable/inter and @fontsource-variable/space-grotesk`; Rule 10 points to spec section 6 and ADR 0009; folder list: `components/portfolio/`, `components/customers/`, `components/customer/` (tabs), no `components/worklist/`, `components/overview/`, sidebar, or `hooks/` if deleted; `theme.ts` and `scripts/theme/` lines cite ADR 0009; `routes.tsx` line unchanged. `README.md`: routes table `/` Portfolio, `/customers` Customers, `/customers/:id` Customer 360 (tabs), `/overview` redirect. Link ADR 0009 from the spec's 6.1 heading.
- [ ] **Step 2:** `npm run check` → typecheck, lint, lint:md, tests, build pass. `npm run e2e` → pass.
- [ ] **Step 3:** `grep -rnE "#[0-9a-fA-F]{3,8}\b|rgb\(|oklch\(" src/components src/pages --include='*.tsx' | grep -v "src/components/ui/"` → no match. `grep -rn "incomeRankLabel\|selectors/overview\|selectors/worklist\|ui/sidebar\|plus-jakarta" src scripts e2e` → no match.
- [ ] **Step 4:** `git commit -m "docs: update the guide and README for the redesigned pages"`
