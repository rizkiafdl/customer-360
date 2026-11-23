# F4 + F5 Worklist and Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/` becomes the ranked opportunity worklist with URL filters; `/overview` shows the summary strip and three book charts.

**Architecture:** Ranking is a pure insights comparator. Two selectors, `buildWorklist(data)` and `buildOverview(data)`, return view models with every sort key, count, and title. Pages render them through F1's `DataTable`, `KpiTile`, `ChartCard`, and `Money`.

**Tech Stack:** React 19, React Router search params, TanStack Table, shadcn `chart` (Recharts) and `select`, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-23-f4-f5-worklist-and-overview-design.md`

## Global Constraints

- Start from `main` after F1 is merged (needs its shell, `DataTable`, `formatIDRShort`, `CATEGORY_COLORS`).
- Layers (ADR 0004); components compute nothing. Money only via `formatIDR()` / `formatIDRShort()`.
- AUM and loan exposure never summed. KYC note never a top reason, rank input, or filter.
- No new threshold (Rule 3). Titles from fixed templates, exact strings tested (Rule 9).
- Do not edit `src/lib/selectors/insights.ts` or the detail page (F3 works there).
- Commits: Conventional Commits, repo owner only, no `Co-Authored-By` or other trailer.

## Review Focus

1. Links must use router `<Link to>`, not raw `href`, so the `/customer-360/` base path holds on Pages → task 5 e2e clicks an overview count.
2. A customer with the KYC note and no fired rule (for example 3569, Priority) → "No rule fired" plus the KYC marker, rank unchanged → task 2 test.
3. `?tier=affluent`, `?rule=nope`, `?q=12a` → each ignored, all 100 rows → task 2 test.
4. Top reason sort keeps `null` rows last in both directions → task 4 test (`sortUndefined: 'last'` on `topReasonOrder`).
5. The log y axis gets only AUM > 0 (min Rp 15.036.089) → task 3 test.

---

### Task 1: `holdsCategory` in domain, `compareWorklist` in insights

**Files:** `src/lib/domain/portfolio.ts` (+ test), `src/lib/insights/rules.ts`, create `src/lib/insights/ranking.ts` (+ test), `src/lib/insights/index.ts`.

**Produces:** `holdsCategory(items: readonly PortfolioItem[], category: ProductCategory): boolean`; `compareWorklist(a: CustomerEvaluation, b: CustomerEvaluation): number`.

- [ ] **Step 1: Failing tests:** `holdsCategory` false for `amount` 0 or `null`, true for `> 0`; `compareWorklist`: 2 rules beats 1 rule at lower AUM; same count → higher AUM first; same count and AUM → lower `customer_id` first; 0 rules last; adding a `kycNote` changes nothing. Run → FAIL.
- [ ] **Step 2:** Implement; `rules.ts` drops its private helper and imports `holdsCategory`. `npx vitest run src/lib` → PASS (F2 tests unchanged).
- [ ] **Step 3:** Commit `feat: add the worklist ranking and move holdsCategory to domain`.

### Task 2: Worklist selector

**Files:** create `src/lib/selectors/worklist.ts`, `worklist.test.ts`.

**Produces:** `WorklistRow` (spec 4.2 fields); `buildWorklist(data: Dataset): WorklistRow[]`; `getWorklist()`; `WorklistFilters = { tier: ValueTier | null; rule: RuleId | null; q: string | null }`; `parseWorklistFilters(params: URLSearchParams): WorklistFilters`; `filterWorklist(rows, filters): WorklistRow[]`; `worklistSummary(shown: number, total: number, filters): string`.

- [ ] **Step 1: Failing tests:** fixtures (`src/test/fixtures.ts`): rows in `compareWorklist` order, `rank` 1…n; `topReason` = `insights[0].reason`, `null` with no rule; `loanExposure` separate from `aum`; Review Focus 2 and 3; `rule` matches a non-top fired rule; filters AND; summaries `100 customers.`, `37 of 100 customers. Opportunity: No ORI.`, `16 of 100 customers. Tier: Priority.` Contract: row 1 is 8797, row 100 is 7969; `firedCount` spread 16/49/26/8/1; top reason counts per spec 7; `?rule=investment-gap-ori` → 37. Run → FAIL.
- [ ] **Step 2:** Implement over `customerEvaluations` plus `loanExposure` per customer. Run → PASS. Commit `feat: add the worklist view model and filters`.

### Task 3: Overview selector

**Files:** create `src/lib/selectors/overview.ts`, `overview.test.ts`.

**Produces:** `Overview = { header: string; totals: { aum: number; loanExposure: number }; tiers: { tier; count; to }[]; opportunities: { id; label; count; to }[]; penetration: { title; bars: BarDatum-shaped { label; value; color }[] }; tierChart: { title; bars }; scatter: { title; footer: string | null; ticks: { rank; band }[]; points: { customerId; rank; band; aum; kyc: boolean }[] } }`; `buildOverview(data)`; `getOverview()`.

- [ ] **Step 1: Failing tests:** fixtures: penetration counts `amount > 0` only, order FUNDING, ORI, BANCA, REKSA, LOAN; lowest-count title with a tie taking the earlier category; tier title with a tie taking the earlier tier; scatter drops AUM 0 and `footer` is `null` when none dropped; `to` values `/?tier=Mass`, `/?rule=cash-heavy`. Contract (spec 7): header `As of 26 Apr 2024 · 100 customers`; totals 811749876893 and 1582500470995; tiers 16/28/40/16; opportunities 12/29/37/29/16/6; titles `ORI held by 46 of 100 customers`, `40 of 100 customers in Affluent`, `84 customers with AUM, 43 with the KYC note`; footer `16 customers with no AUM are not plotted.` Run → FAIL.
- [ ] **Step 2:** Implement. Run → PASS. Commit `feat: add the book overview view model`.

### Task 4: Worklist page at `/`

**Files:** `npx shadcn@latest add select`; create `src/pages/WorklistPage.tsx` (+ test), `src/components/worklist/*`; delete `src/pages/HomePage.tsx`; modify `src/routes.tsx`, `src/routes.test.tsx`.

- [ ] **Step 1: Failing tests:** `/` has `h1` "Customers" and a table "Worklist" with 100 body rows, first row link `Customer 8797` → `/customers/8797`; `/?rule=investment-gap-ori` shows 37 rows and the summary line; "Clear filters" restores 100; a row with no rule shows `No rule fired`; a KYC row shows `KYC note`; Review Focus 4. Run → FAIL.
- [ ] **Step 2:** Implement with `useSearchParams` → `parseWorklistFilters` → `filterWorklist`; columns sort on `tierOrder`, `topReasonOrder`, `rank`. Run → PASS. Commit `feat: replace the home list with the opportunity worklist`.

### Task 5: Overview page and sidebar

**Files:** create `src/pages/OverviewPage.tsx` (+ test), `src/components/overview/*` (strip, `IncomeAumScatter`); modify `src/components/AppShell.tsx`, `src/routes.tsx`, `src/routes.test.tsx`.

- [ ] **Step 1: Failing tests:** `/overview` has `h1` "Overview", the header line, tiles "Total AUM" and "Total loan exposure" with `Not part of AUM.`, the three chart titles, the footer; clicking tier "Priority" lands on `/` with 16 rows; sidebar shows "Overview" with `aria-current="page"` on `/overview` only. Run → FAIL.
- [ ] **Step 2:** Implement. Scatter: two `Scatter` series (`--warning` triangle "KYC note", `--info` circle "No KYC note"), `YAxis scale="log"`, ticks via `formatIDRShort`. Run → PASS. Commit `feat: add the book overview page`.

### Task 6: e2e, CLAUDE.md, full check

**Files:** `e2e/smoke.spec.ts`, `CLAUDE.md`.

- [ ] **Step 1:** e2e: replace "home page lists the customers" with: `/` shows 100 worklist rows, the first link opens `Customer 8797`; `./overview` deep link shows the three titles; its "No ORI" count opens a 37-row worklist. Each asserts no console or page errors.
- [ ] **Step 2:** CLAUDE.md folder structure: `lib/insights/` line adds "and the worklist ranking".
- [ ] **Step 3:** `npm run check` → exit 0; `npm run e2e` → PASS. Commit `test: add e2e checks for the worklist and overview`.
