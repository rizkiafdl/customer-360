# Redesign v2, part A: logic — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add every domain, insight, and selector function the redesigned pages need, with tests, and change no screen.

**Architecture:** Additive only. New functions sit next to the current ones in `src/lib/domain/`, `src/lib/insights/`, and `src/lib/selectors/`. Current exports and fields keep their shape, so the shipped pages keep working. Part B (`feat/redesign-ui`) removes what the new UI no longer uses.

**Tech Stack:** TypeScript 6 strict, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-24-redesign-v2-design.md` (sections 5.1–5.7)

## Global Constraints

- Layers (ADR 0004): selectors → insights → domain → types. Only selectors import `src/data`. `npm run lint` enforces it.
- Money text only through `formatIDR()` / `formatIDRShort()`. No `Rp` literal outside `src/lib/format.ts`.
- Copy rule (Rule 9): fixed templates, exact-string tests, no advice tone. Copy from spec 5.6.
- No new threshold. No change to `thresholds.ts`, the rules, or the fire counts 12 / 29 / 37 / 29 / 16 / 6.
- No UI, route, CSS, or dependency change. `src/data/*.json` untouched.
- Commits: Conventional Commits, author is the user, no `Co-Authored-By` trailer.

## Review Focus

- A customer with no customer-initiated transaction: `topChannel` is `null` and every text that uses it is left out (Task 1, Task 4).
- A cash-heavy customer who holds REKSA and ORI gets a `Cash` card, never a lost rule (Task 2).
- A malformed URL param (`band=9`, `band=abc`, `kyc=maybe`, `lacks=LOAN`, `page=0`, `page=99`) is ignored or clamped, never thrown (Task 4).
- A band filter keeps the book's as-of date (26 Apr 2024), not the latest date inside the band (Task 3).
- A Customer 360 opened with an ID outside the filtered list: `neighbours` is `null` (Task 4).

---

### Task 1: Domain additions and the month formatter

**Files:**

- Modify: `src/lib/format.ts`, `src/lib/domain/transactions.ts`, `src/lib/domain/channels.ts`, `src/lib/domain/portfolio.ts` and their `*.test.ts`

**Interfaces:**

- Produces:
  - `formatMonthYear(date: string): string` (`2014-07-03` → `Jul 2014`), in `format.ts`.
  - `firstActivityDate(transactions: readonly Transaction[]): string`, all rows, `RangeError` on empty (mirror `latestActivityDate`).
  - `topChannel(transactions: readonly Transaction[]): { method: TransactionMethod; count: number; total: number } | null`, customer-initiated rows only (`isCustomerInitiated`); tie → the method name first in alphabetical order; `null` with no such row.
  - `shareOfAum(item: PortfolioItem, aum: number): number | null`: `amount / aum` for a held AUM-category row; `null` for LOAN, a not-held row, or `aum` 0.
  - `loanFacilities(items: readonly PortfolioItem[]): { held: LoanFacility[]; notHeld: PortfolioItem[]; exposure: number }` with `LoanFacility = { product: string; amount: number; shareOfExposure: number }`. LOAN rows only; `held` = `isHeld`, amount high to low, ties in data order; `product` `null` → `'Unnamed product'`; `exposure` = `loanExposure(items)`.

- [ ] **Step 1: Write the failing tests** (one `describe` per function):
  - `formatMonthYear('2014-07-03')` → `'Jul 2014'`.
  - `firstActivityDate` of rows dated `2024-04-01`, `2011-01-27` (a `BUNGA` row), `2020-05-05` → `'2011-01-27'`; `[]` throws `RangeError`.
  - `topChannel`: 2 `MOBILE BANKING` + 1 `ATM` + 3 `BUNGA` bank entries → `{ method: 'MOBILE BANKING', count: 2, total: 3 }`; 1 `QRIS` + 1 `ATM` → `ATM` (tie, alphabetical); only bank entries → `null`.
  - `shareOfAum`: FUNDING 25 of AUM 100 → `0.25`; LOAN → `null`; amount 0 → `null`; AUM 0 → `null`.
  - `loanFacilities`: LOAN `KPR` 300, LOAN `null` product 100, LOAN `GIRO` `null` amount, LOAN `CREDIT CARD` 0, FUNDING 999 → `held` `[KPR 300 0.75, Unnamed product 100 0.25]`, `notHeld` the GIRO and CREDIT CARD rows, `exposure` 400.
- [ ] **Step 2:** `npx vitest run src/lib/format.test.ts src/lib/domain` → FAIL (not exported).
- [ ] **Step 3:** Implement the five functions with the signatures above. Export through `src/lib/domain/index.ts` (already re-exports each file).
- [ ] **Step 4:** Same command → PASS.
- [ ] **Step 5:** `git commit -m "feat: add first activity, top channel, share of AUM, and loan facility helpers"`

### Task 2: Offers grouped by product, rule chips, ADR 0008 update

**Files:**

- Create: `src/lib/insights/product-offers.ts`, `src/lib/insights/product-offers.test.ts`
- Modify: `src/lib/insights/index.ts`, `docs/adr/0008-insight-rules-and-thresholds.md`

**Interfaces:**

- Consumes: `CustomerEvaluation`, `FiredInsight`, `RULE_ORDER`, `RULES`, `formatWholePercent`.
- Produces:
  - `type OfferProduct = 'REKSA' | 'ORI' | 'BANCA' | 'Cash' | 'No AUM'`
  - `interface ProductOffer { product: OfferProduct; ruleIds: RuleId[]; reasons: string[]; basis: { kind: 'cash' | 'aum'; amount: number } | null; title: string; basisText: string | null }`
  - `productOffers(evaluation: CustomerEvaluation): ProductOffer[]`
  - `ruleChip(insight: FiredInsight<RuleId>): string`

Grouping (spec 5.2): gap rule → its product card; `high-income-no-banca` → BANCA card; `no-aum` → `No AUM` card; `cash-heavy` → first in the REKSA and ORI cards when they exist, else its own `Cash` card. `ruleIds` and `reasons` in `RULE_ORDER`. `basis`: `cash` with `evidence.cashAmount` when the card holds `cash-heavy`; `null` for `No AUM`; else `aum` with `evaluation.aum`. Order: more rules first, then higher `basis.amount` (`null` as -1), then the `RULE_ORDER` index of the card's first rule.

Copy (spec 5.6): `title` = `` `${product} · ${n} rule(s)` `` (`REKSA · 2 rules`, `No AUM · 1 rule`); `basisText` = `` `Cash ${formatIDR(amount)}` `` or `` `AUM ${formatIDR(amount)}` ``, `null` without basis. `ruleChip`: `cash-heavy` → `` `Cash-heavy ${formatWholePercent(cashAmount, aum)}` ``; any other rule → its `RULES` label.

- [ ] **Step 1: Write the failing tests** with `test-fixtures.ts` customers:
  - cash-heavy + no REKSA + no BANCA + high income no BANCA → cards `REKSA` (`['cash-heavy','investment-gap-reksa']`, basis cash), then `BANCA` (`['investment-gap-banca','high-income-no-banca']`, basis aum); exactly one BANCA card.
  - cash-heavy holding REKSA and ORI → one `Cash` card with basis cash.
  - no-aum + high income no BANCA → `BANCA` (basis aum 0) before `No AUM` (basis `null`) by rule count tie → amount 0 > -1.
  - two one-rule cards with AUM 500 vs cash 400 → the AUM-500 card first; equal amounts → `RULE_ORDER` decides.
  - no fired rule → `[]`; the KYC note never makes a card.
  - exact strings: `title` `'REKSA · 2 rules'`, `basisText` `'Cash Rp 1.061.852.300'`-style via `rp()`, `ruleChip` `'Cash-heavy 84%'` for cash 84 of AUM 100, `'No REKSA'`.
- [ ] **Step 2:** `npx vitest run src/lib/insights/product-offers.test.ts` → FAIL.
- [ ] **Step 3:** Implement in `product-offers.ts`; export from `index.ts`.
- [ ] **Step 4:** Same command → PASS.
- [ ] **Step 5:** Add to ADR 0008 a section `## Update, 2026-11-24: offers grouped by product` (the grouping table, the order, that `RULE_ORDER` still sets the chip and the order inside a card, and that the rules and counts did not change). `npm run lint:md` → 0 issues.
- [ ] **Step 6:** `git commit -m "feat: group offer rules by product and add rule chips"`

### Task 3: Book fields and the Portfolio selector

**Files:**

- Modify: `src/lib/selectors/book.ts`, `src/lib/selectors/overview.ts` (extract only), their tests
- Create: `src/lib/selectors/portfolio.ts`, `src/lib/selectors/portfolio.test.ts`, and `src/lib/selectors/customers.ts` with only `CustomerFilters` and `customersQuery` (Task 4 interfaces) plus their tests, because the Portfolio links need them first

**Interfaces:**

- Consumes: Task 1 `firstActivityDate`; `cashAmount`; `KYC_NOTE`; `RULES`; `CustomerFilters` and `customersQuery` as defined in Task 4 (written in this task).
- Produces:
  - `BookCustomer` gains `lastActive: { days: number; date: string } | null` (customer-initiated), `firstTransaction: string`, `cash: number`. `bookCustomersOf` needs the as-of date: compute it once from the whole dataset.
  - `scatterOf(book: readonly BookCustomer[]): Overview['scatter']`, extracted from `buildOverview` (no behavior change; `overview.test.ts` stays green).
  - `buildPortfolio(data: Dataset, band: number | null): Portfolio` and `getPortfolio(band: number | null): Portfolio` (memoize per band).
  - `Portfolio = { header; customers: { count; withAum; withoutAum }; totals: { aum; loanExposure }; kyc: { count; text; to }; opportunitiesLine; opportunities: { id; label; count; ruleText; amountLine: string | null; to }[]; penetration: { label; held; notHeld; color; to: string | null }[]; scatter: Overview['scatter'] }`.

Templates: header `As of 26 Apr 2024 · 100 customers`; with a band `As of 26 Apr 2024 · 7 of 100 customers, income >5 Juta - 10 Juta`. `opportunitiesLine` `84 customers with at least one opportunity` (singular `1 customer`). Amount lines (spec 5.3): cash-heavy `Cash <formatIDR>`, gaps `AUM <formatIDR>`, `no-aum` `null`, `high-income-no-banca` `<n> also in No BANCA`. Links use `customersQuery` from Task 4 (`/customers?rule=…&band=…`; KYC `kyc=yes`; FUNDING/ORI/BANCA/REKSA `lacks=<c>`; LOAN `null`). An unknown band (not 1–8) is treated as `null`.

- [ ] **Step 1: Write the failing tests:**
  - book fixture: `lastActive` from customer-initiated rows only; `null` when there are none; `firstTransaction` includes bank entries; `cash` equals `cashAmount`.
  - `buildPortfolio(fixtureDataset, null)` exact header, tiles, amount lines, links.
  - with a band: counts recomputed, the header keeps the full-data as-of date even when the band's latest row is earlier.
  - real data, no band: customers 100 / 84 / 16; totals 811.749.876.893 and 1.582.500.470.995; KYC 43; line `84 customers with at least one opportunity`; counts 12/29/37/29/16/6; amount lines `Cash Rp 551.749.143.391`, `AUM Rp 381.048.084.517`, `AUM Rp 366.113.426.621`, `AUM Rp 101.778.947.711`, `null`, `3 also in No BANCA`; penetration held 84/46/54/54/83, not held 16/54/46/46/17; scatter 84 points.
  - real data, band 4: 7 customers, 3 with AUM, 6 with at least one opportunity, KYC 0.
- [ ] **Step 2:** `npx vitest run src/lib/selectors` → FAIL.
- [ ] **Step 3:** Implement. Book additions first, then `scatterOf`, then `portfolio.ts`.
- [ ] **Step 4:** Same command → PASS, `overview.test.ts` unchanged and green.
- [ ] **Step 5:** `git commit -m "feat: add the portfolio selector with an income band filter"`

### Task 4: Customers selector

**Files:**

- Modify: `src/lib/selectors/customers.ts`, `src/lib/selectors/customers.test.ts` (Task 3 created them with `CustomerFilters` and `customersQuery`)

**Interfaces:**

- Consumes: Task 1 `topChannel`, `formatMonthYear`; Task 2 `productOffers`, `ruleChip`; Task 3 `BookCustomer` fields.
- Produces:
  - `CustomerFilters = { rule: RuleId | null; band: number | null; kyc: boolean | null; lacks: 'FUNDING' | 'ORI' | 'BANCA' | 'REKSA' | null; q: string | null; page: number }`
  - `parseCustomerFilters(params: URLSearchParams): CustomerFilters` (bad values → `null`; `page` → integer ≥ 1, else 1)
  - `customersQuery(filters: Partial<CustomerFilters>): string` → `''` or `?rule=…&band=…&kyc=yes&lacks=…&q=…` in that order, `page` only when > 1.
  - `CustomerRow = { rank; customerId; aum; loanExposure; chip: string | null; moreCount; lastActive: { days; date; label } | null; kyc: boolean; incomeRank; lacks: string[]; ruleIds: RuleId[]; preview: CustomerPreview }`
  - `CustomerPreview = { gender; incomeBand; highIncome; firstTransaction; offers: ProductOffer[] /* first two */; channelText: string | null; lastActiveText: string | null }`
  - `buildCustomerRows(data: Dataset): CustomerRow[]`, `getCustomerRows()`
  - `filterCustomers(rows, filters): CustomerRow[]` (AND; ignores `page`)
  - `paginate(rows, page: number, size = 25): { rows; page; pageCount; label }` (page clamped to `pageCount`; `label` `Showing 1–25 of 100`, `Showing 0 of 0` when empty)
  - `customerSummary(shown, total, filters): string`
  - `neighbours(rows, id): { position; total; prevId: number | null; nextId: number | null } | null` (no wrap)

Templates: `lastActive.label` `Today`, `1 day ago`, `N days ago`; `firstTransaction` `First transaction Jul 2014`; `channelText` `Top channel: MOBILE BANKING, 11 of 29 customer-initiated transactions (37%)` (`formatWholePercent`); `lastActiveText` `Last active 2 days ago, 24 Apr 2024`. Summary: `100 customers.`; else `29 of 100 customers.` plus, in order, `Opportunity: No REKSA.` `Income: >5 Juta - 10 Juta.` `KYC note: with.`/`KYC note: without.` `Not held: ORI.` `ID contains 12.`; zero rows `No customers match these filters.`

- [ ] **Step 1: Write the failing tests:**
  - parse: every bad value of the Review Focus list → `null` or page 1; valid set round-trips through `customersQuery`.
  - `customersQuery({})` → `''`; page 1 dropped; order fixed.
  - filters combine with AND; `lacks: 'ORI'` matches only customers with no held ORI row.
  - `paginate` 60 rows: page 3 → 10 rows, label `Showing 51–60 of 60`; page 9 → page 3.
  - `neighbours`: first → `prevId null`; middle → both; unknown ID → `null`.
  - exact summary and template strings.
  - real data: order equals `getWorklist().map(r => r.customerId)`, first ID 8797; `rule=investment-gap-ori` → 37; `band=4` → 7; `kyc=yes` → 43; `lacks=ORI` → 54, `lacks=FUNDING` → 16; 4 pages of 25.
- [ ] **Step 2:** `npx vitest run src/lib/selectors/customers.test.ts` → FAIL.
- [ ] **Step 3:** Implement `customers.ts`.
- [ ] **Step 4:** Same command → PASS.
- [ ] **Step 5:** `git commit -m "feat: add the customers selector with URL filters, pages, and neighbours"`

### Task 5: Customer 360 additions

**Files:**

- Modify: `src/lib/selectors/customer360.ts`, `src/lib/selectors/customer360.test.ts`

**Interfaces:**

- Consumes: Tasks 1, 2, 4 (`channelText` template: reuse one helper, do not duplicate).
- Produces, added to `Customer360` (existing fields unchanged):
  - `profile.firstTransaction: string` (`First transaction Jul 2014`)
  - `kpis.products: { count: number; categories: ProductCategory[] }` (held AUM rows; categories in `AUM_CATEGORIES` order)
  - `productOffers: ProductOffer[]` (top level, so the `OfferPanel` type stays as is until part B; spec's `offers.products`)
  - `channelText: string | null`
  - `holdings.held: { product; category; color; amount; share: number }[]` (AUM rows, amount high to low), `holdings.notHeld: ProductRow[]` (AUM rows, 0 or `null`)
  - `loans: { title: string; held: LoanFacility[]; notHeld: PortfolioItem[]; exposure: number; missingText: string }`
  - `recent: TransactionRow[]` (first 5 of `transactions`)

Loan copy (spec 5.7): `title` `3 loan facilities, Rp … in total` / `1 loan facility, Rp … in total` / `No loan facility held.`; `missingText` `Facility type, collectibility, days past due, and maturity are not in the data.`

- [ ] **Step 1: Write the failing tests** (fixture + real data):
  - fixture: each new field, exact strings; LOAN rows never in `holdings.held`; `loans.held` sorted, shares sum to 1.
  - real data: 83 customers have `loans.held.length > 0`; max `loans.held.length` is 10; card count per product over all customers REKSA 29, ORI 37, BANCA 32, Cash 4, No AUM 16; `getCustomer360(8797).productOffers[0].product` is `REKSA`.
- [ ] **Step 2:** `npx vitest run src/lib/selectors/customer360.test.ts` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Same command → PASS.
- [ ] **Step 5:** `git commit -m "feat: add offers by product, holdings split, and loan facilities to customer 360"`

### Task 6: Verify the branch

- [ ] **Step 1:** `npm run check` → typecheck, lint, lint:md, all tests, and build pass.
- [ ] **Step 2:** `npm run build && npm run e2e` → the current smoke test passes (no screen changed).
- [ ] **Step 3:** `git diff main --stat -- src/components src/pages src/routes.tsx src/index.css package.json` → empty.
