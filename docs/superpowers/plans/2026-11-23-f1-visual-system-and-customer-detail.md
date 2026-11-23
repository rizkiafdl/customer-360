# F1 Visual System and Customer Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** The dark-default visual system (tokens, type, money format, shell, chart rules) and route `/customers/:id` for all 100 customers, with a customer search and a theme toggle.

**Architecture:** Domain gains the digital, window, week, mix, and color definitions. One selector `buildCustomer360(dataset, id)` returns a view model with every number and title already computed; `getCustomer360(id)` reads rows grouped once at module load. Pages and components render the view model only. Colors live only as CSS variables in `src/index.css`, checked by a Node contrast test.

**Tech Stack:** React 19, Tailwind v4, shadcn/ui (radix-nova), Recharts through shadcn `chart`, TanStack Table, React Router, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-23-f1-visual-system-and-customer-detail-design.md`

**Status:** Done. Shipped in PR #10, merged on 2026-11-23. The PR description lists each change from this plan. The minor review findings were closed in PR #13.

## Global Constraints

- Layers (ADR 0004): only selectors import `src/data`; components never compute business values.
- Money only through `formatIDR()` / `formatIDRShort()`; no `Rp` literals, no `Intl` / `toLocaleString` for money elsewhere.
- No hex, `rgb()`, or `oklch()` in `src/components/` (outside shadcn-generated `ui/`) or `src/pages/`.
- Red is never risk, never a chart series, never a large surface. LOAN never stacked with AUM.
- No thresholds beyond the spec (CLAUDE.md Rule 3). Titles follow the copy rule (Rule 9).
- Commits: Conventional Commits, repo owner only, no `Co-Authored-By` or other trailer.
- No `/overview`, `/rules`, insight panel, or worklist. Do not touch `src/lib/insights/`.

## Review Focus

1. Brand red `#ED1C24` with white text is about 4.4:1 → task 3 picks `--primary` a step darker so the test's 4.5 holds; ADR 0007 records it.
2. `oklch` values outside the sRGB gamut make the contrast test lie → task 3 asserts every tested token is in gamut.
3. ISO weeks: `2024-03-01` is a Friday, so the first bucket starts `2024-02-26` and counts only window rows → task 5 test.
4. Customer 786 has AUM 0 and a held LOAN, so "none held" is false → task 6 template says "none held in AUM categories".
5. shadcn `chart` pins `recharts@3.8.0` → task 2 keeps `^3.11.0`.
6. jsdom lacks `ResizeObserver`, `matchMedia`, `scrollIntoView` (Recharts, sidebar, cmdk) → task 2 test setup.

---

### Task 1: ADR 0007

**Files:** Create `docs/adr/0007-visual-system.md`.

- [x] **Step 1:** Write it in the ADR 0005 format from spec 6.2: dark default + toggle, CSS variables only, OCBC-inspired red used sparingly with no OCBC assets, red is not risk (semantic tokens), Plus Jakarta Sans, shadcn charts over Recharts, chart rules (spec 4.6), contrast test. Alternatives: light default, a second chart library, red as risk, a demo page. Cite Parts 1/2 by name only.
- [x] **Step 2:** `npm run lint:md` → 0 issues (after task 2's ignore if the F2 worktree is present).
- [x] **Step 3:** `git commit -m "docs: add ADR 0007 for the visual system"`

### Task 2: Tooling, font, shadcn components, hooks layer

**Files:** `package.json`, `src/index.css` (font import), `src/components/ui/*` and `src/hooks/use-mobile.ts` (generated), `eslint.config.js`, `eslint.config.test.ts`, `.markdownlint-cli2.jsonc`, `src/test/setup.ts`.

- [x] **Step 1: Failing test:** `eslint.config.test.ts` cases `src/lib/domain/x.ts` → `@/hooks/use-mobile` (error), `src/lib/selectors/x.ts` → `../../hooks/use-mobile` (error), `src/components/ui/x.tsx` → `@/hooks/use-mobile` (none). Run → FAIL.
- [x] **Step 2:** Add `hooks` to the `UI` regex and `src/hooks/**` to the UI block. Run → PASS.
- [x] **Step 3:** `npm i @fontsource-variable/plus-jakarta-sans && npm rm @fontsource-variable/geist`; swap the import and `--font-sans`. `npx shadcn@latest add sidebar command popover tooltip card table scroll-area chart badge toggle-group progress`; restore `recharts@^3.11.0` if downgraded.
- [x] **Step 4:** Test setup polyfills `ResizeObserver`, `matchMedia`, `Element.scrollIntoView`. Ignore `.claude/worktrees/**` in ESLint and markdownlint (local agent worktrees, not repo files).
- [x] **Step 5:** `npm run typecheck && npm run lint && npm test` → PASS. `git commit -m "build: add the F1 shadcn components, Plus Jakarta Sans, and the hooks layer"`

### Task 3: Theme tokens, contrast test, theme switch

**Files:** `src/index.css`; create `scripts/theme/contrast.ts`, `scripts/theme/contrast.test.ts`, `src/lib/theme.ts`, `src/lib/theme.test.ts`; modify `index.html`.

**Produces:** `parseThemeBlocks(css): { light: Record<string,string>; dark: Record<string,string> }`, `oklchToSrgb(value): [r,g,b]`, `contrastRatio(a, b): number`, `inGamut(value): boolean`; `THEME_KEY = 'theme'`, `readStoredTheme(): 'light' | 'dark'`, `applyTheme(theme)` (sets `.dark`, stores, try/catch).

- [x] **Step 1: Failing tests:** `contrastRatio('oklch(1 0 0)', 'oklch(0 0 0)')` ≈ 21; `oklchToSrgb` of white/black; parser reads both blocks. Real-file cases, each theme: `foreground` and `muted-foreground` on `card` and `background`, `brand-text`, `opportunity`, `warning`, `risk`, `info` on `card` ≥ 4.5; each `X-foreground` on `X` ≥ 4.5; `primary-foreground` on `primary` ≥ 4.5; `chart-1…5` and `ring` on `card` ≥ 3; every tested token in gamut. `theme.test.ts`: default dark, stored light, storage throws → dark, `applyTheme` toggles the class and stores. Run → FAIL.
- [x] **Step 2:** Implement (OKLab → linear sRGB matrices, WCAG relative luminance). Write the token values (spec 4.2 anchors; warm charcoal dark, `background < card < popover`). Add `--brand-deep`, `--brand-text`, the semantic tokens and their `-foreground`, `@theme` color mappings. `index.html`: inline script before paint, `class="dark"` default.
- [x] **Step 3:** `npx vitest run scripts/theme src/lib/theme.test.ts` → PASS. Commit `feat: add the dark-default theme tokens with a contrast test`.

### Task 4: `formatIDRShort` and the date label

**Files:** `src/lib/format.ts`, `src/lib/format.test.ts`.

**Produces:** `formatIDRShort(amount: number): string`; `formatDate(date: 'YYYY-MM-DD'): string` (`26 Apr 2024`, fixed English month names, no `Intl`).

- [x] **Step 1: Failing tests:** `350_000_000` → `Rp 350 jt`; `1_200_000_000` → `Rp 1,2 M`; `811_749_876_893` → `Rp 811,7 M`; `999` → `Rp 999`; `7.9` → `Rp 7,9`; `1_500` → `Rp 1,5 rb`; `999_960_000` → `Rp 1 M`; `999_950` → `Rp 1 jt`; `2_000_000_000_000` → `Rp 2 T`; `-1_200_000` → `-Rp 1,2 jt`; `-0` and `0` → `Rp 0`; `formatDate('2024-04-26')` → `26 Apr 2024`. Run → FAIL.
- [x] **Step 2:** Implement; the number part uses `formatIDR` so the separator stays Indonesian. Run → PASS. Commit `feat: add formatIDRShort and a date label formatter`.

### Task 5: Domain definitions

**Files:** create `src/lib/domain/channels.ts` (+ test); modify `dates.ts`, `portfolio.ts`, `transactions.ts` (+ tests), `index.ts`, `docs/adr/0006-business-definitions.md`.

**Produces:** `DIGITAL_METHODS`, `isDigital(method)`, `digitalShare(trx[]): number | null`; `DETAIL_WINDOW_START = '2024-03-01'`, `isoWeekStart(date)`, `weeklyCounts(trx[], from, to): { weekStart; count }[]` (every week, zeros kept); `CATEGORY_COLORS: Record<ProductCategory, string>` (`var(--chart-N)`), `heldCount(items)`; `countBy(trx[], key)`, `topWithOther(entries, n)`, `bankEntrySummary(trx[])`.

- [x] **Step 1: Failing tests:** cards count as digital, ATM/BRANCH/MERCHANT do not; `digitalShare` excludes bank entries and the `BANCA` method, `[]` → `null`; `isoWeekStart('2024-03-01')` → `2024-02-26`, `('2024-03-31')` → `2024-03-25`, `('2024-04-01')` → `2024-04-01`; `weeklyCounts` keeps an empty week and drops rows outside `from…to`; LOAN color is `--chart-5` and differs from all AUM colors; `topWithOther` folds the tail into `Other` and omits it when empty; `bankEntrySummary` leaves out types with no rows. Run → FAIL.
- [x] **Step 2:** Implement. ADR 0006 gains the digital row (user decision 2026-11-23) and the detail-window row. Run → PASS. Commit `feat: add digital share, the detail window, weekly buckets, and category colors`.

### Task 6: Customer 360 view model

**Files:** create `src/lib/selectors/customer360.ts`, `customer360.test.ts`, `src/test/fixtures.ts` (a small `Dataset`).

**Produces:** `type Customer360` (profile, KPIs, holdings, activity, bank entries, transaction rows, titles); `buildCustomer360(data, id): Customer360 | null`; `getCustomer360(id)`; `parseCustomerId(param): number | null`; `filterTransactionRows(rows, 'all' | 'customer' | 'bank')`; `getCustomerOptions()`; `asOfLabel` (`As of 26 Apr 2024`).

- [x] **Step 1: Failing tests** on fixtures, one per spec 5.4 case: no portfolio → `holdings.state 'none'`, AUM/loan 0; AUM 0 with a held LOAN → `No AUM. 1 product row, none held in AUM categories.`; `null` gender → `Gender not recorded`; `null` product → `Unnamed product`; `null` amount → muted, not held; no earlier rows → `earlierText null`; title `62% of AUM in FUNDING` style; unknown ID → `null`; `parseCustomerId('12a')` → `null`. Contract: all 100 IDs build; `getCustomer360(-1)` → `null`. Run → FAIL.
- [x] **Step 2:** Implement with `groupByCustomer(data)` at module load. Run → PASS. Commit `feat: add the Customer 360 view model selector`.

### Task 7: App shell, search, theme toggle, routes

**Files:** create `src/components/AppShell.tsx`, `CustomerSearch.tsx`, `ThemeToggle.tsx`, `src/pages/CustomerPage.tsx`, `NotFoundPage.tsx`; modify `src/routes.tsx`, `src/routes.test.tsx`, `src/pages/HomePage.tsx`; tests `ThemeToggle.test.tsx`.

- [x] **Step 1: Failing tests:** `/` shows heading `Customers` and a link per customer; `/customers/4426` shows heading `Customer 4426`; `/customers/abc` and `/customers/1` show `Customer not found` with a link to `/`; the toggle removes `.dark` and stores `light`. Run → FAIL.
- [x] **Step 2:** Implement (layout route with `<Outlet />`, sidebar nav, search combobox). Run → PASS. Commit `feat: add the app shell with customer search and theme toggle`.

### Task 8: Customer detail sections

**Files:** create `src/components/customer/*` (profile header, KPI tile, money, chart card, bar charts, tables), `src/pages/CustomerDetail.tsx`, `CustomerDetail.test.tsx`.

- [x] **Step 1: Failing tests** with view models from `buildCustomer360(fixture, id)`: full customer shows the six sections, the AUM title, short money with the full value as accessible text, the bank-entries note; no-portfolio customer shows `No portfolio rows.`; the transaction filter narrows the rows. Run → FAIL.
- [x] **Step 2:** Implement; colors only via tokens and `CATEGORY_COLORS`. Run → PASS. Commit `feat: add the Customer 360 detail page`.

### Task 9: e2e

**Files:** `e2e/smoke.spec.ts`.

- [x] **Step 1:** Tests: home renders; deep link `./customers/4426`; search `4857`, open, see `Gender not recorded`; toggle theme, reload, still light. Each asserts no console or page errors.
- [x] **Step 2:** `npm run build && npm run e2e` → PASS. Commit `test: add e2e checks for the detail page, search, and theme`.

### Task 10: CLAUDE.md, spec values, full check

**Files:** `CLAUDE.md`, spec section 4.2 (append "Builder's final values" only).

- [x] **Step 1:** Rule 2 names both formatters; new Rule 10 (spec 6.2); folder structure gains `src/hooks/`, `scripts/theme/`; Stack: Plus Jakarta Sans. Append the token table with measured ratios.
- [x] **Step 2:** `npm run check` → exit 0. Commit `docs: add the visual system rule and F1 folders to CLAUDE.md`.
