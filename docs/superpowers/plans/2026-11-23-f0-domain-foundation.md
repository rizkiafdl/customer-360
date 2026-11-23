# F0 Domain Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pure, tested domain definitions in `src/lib/domain/`, the first selectors, and an ESLint-enforced one-way layer rule.

**Architecture:** Layers by folder (spec 4.1). Domain functions take plain arrays of one customer's rows. Selectors are pure functions over a `Dataset` argument plus thin exports bound to `src/data`. `no-restricted-imports` blocks per layer folder in `eslint.config.js`.

**Tech Stack:** TypeScript 6 strict, Vitest 5, ESLint 10 flat config.

**Spec:** `docs/superpowers/specs/2026-11-23-f0-domain-foundation-design.md`

## Global Constraints

- Only `src/lib/selectors/` imports `src/data`; no upward imports; downward skips allowed; no test-file exceptions (spec 4.1).
- AUM = FUNDING + ORI + BANCA + REKSA; LOAN never in AUM; `null` amount counts as 0; "holds" = `amount > 0`.
- Bank entries = `BUNGA`, `BIAYA`, `PAJAK`, `DENDA`. High income = income rank ≥ 5.
- No thresholds beyond the spec (CLAUDE.md Rule 3). No digital-methods list in F0.
- Commits: Conventional Commits, author is the repo owner only, no `Co-Authored-By` trailer.

## Review Focus

1. Relative imports (`../data`, `../../data/index`) slip past alias-only patterns → task 5 tests both forms.
2. Overlapping flat-config blocks: a later `no-restricted-imports` block replaces, not merges, an earlier one for the same file → task 5 tests one file per layer.
3. `daysSince` across a month end and a leap day (`2024-02-28` → `2024-03-01` = 2) and in a non-UTC `TZ` → task 3 test.
4. Same product name under FUNDING and LOAN (`GIRO`) counted once in each category, never merged → task 2 test.
5. The home page still shows "100 customers loaded." after the selector change → existing `src/routes.test.tsx` and e2e stay green (task 4).

---

### Task 1: ADRs 0004, 0005, 0006

**Files:** Create `docs/adr/0004-layered-code-structure.md`, `docs/adr/0005-as-of-date.md`, `docs/adr/0006-business-definitions.md`.

- [ ] **Step 1:** Write the three ADRs from spec 6.1 in the ADR 0003 format (Status: Accepted, Date 2026-11-23; Context, Decision, Consequences, Alternatives considered). Cite Part 1 and Part 2 by name only, never by file path. 0005 states the value `2024-04-26` and that a selectors contract test pins it.
- [ ] **Step 2:** Run `npm run lint:md`. Expected: 0 issues.
- [ ] **Step 3:** `git commit -m "docs: add ADRs 0004-0006 for layers, as-of date, and business definitions"`

### Task 2: Portfolio and income definitions

**Files:** Create `src/lib/domain/portfolio.ts`, `src/lib/domain/income.ts`, `src/lib/domain/index.ts` (re-exports), tests `portfolio.test.ts`, `income.test.ts` beside them.

**Interfaces — Produces:**

- `AUM_CATEGORIES: readonly ProductCategory[]` = `['FUNDING', 'ORI', 'BANCA', 'REKSA']`
- `isHeld(item: PortfolioItem): boolean`
- `customerAum(items: readonly PortfolioItem[]): number`
- `loanExposure(items: readonly PortfolioItem[]): number`
- `amountByCategory(items: readonly PortfolioItem[]): Record<ProductCategory, number>`
- `HIGH_INCOME_MIN_RANK = 5`; `incomeRank(band: IncomeBand): number` (1–8); `isHighIncome(band: IncomeBand): boolean`

- [ ] **Step 1: Failing tests** with hand-made fixtures:
  - `isHeld`: `amount` 1 → true; 0 → false; `null` → false.
  - `customerAum`: `[]` → 0; FUNDING 100 + ORI 50 + LOAN 999 + REKSA `null` → 150.
  - `loanExposure`: same fixture → 999; `[]` → 0.
  - `amountByCategory`: `GIRO` 10 under FUNDING and `GIRO` 20 under LOAN → `{ FUNDING: 10, LOAN: 20, ORI: 0, BANCA: 0, REKSA: 0 }`.
  - `incomeRank('sd. 1 Juta')` → 1, `incomeRank('>100 Juta')` → 8; `isHighIncome('>5 Juta - 10 Juta')` → false, `isHighIncome('>10 Juta - 25 Juta')` → true.
- [ ] **Step 2:** `npx vitest run src/lib/domain`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Implement the signatures above. `incomeRank` = `INCOME_BANDS.indexOf(band) + 1`.
- [ ] **Step 4:** Same command. Expected: PASS.
- [ ] **Step 5:** `git commit -m "feat: add AUM, loan exposure, holdings, and income definitions"`

### Task 3: Transaction and date definitions

**Files:** Create `src/lib/domain/transactions.ts`, `src/lib/domain/dates.ts`, tests beside them; extend `src/lib/domain/index.ts`.

**Interfaces — Produces:**

- `BANK_ENTRY_TYPES: readonly TransactionType[]` = `['BUNGA', 'BIAYA', 'PAJAK', 'DENDA']`
- `isBankEntry(trx: Transaction): boolean`; `isCustomerInitiated(trx: Transaction): boolean`
- `latestActivityDate(transactions: readonly Transaction[]): string` (throws `RangeError` on `[]`)
- `daysSince(date: string, asOf: string): number` (throws `RangeError` on an invalid `date` or `asOf`)

- [ ] **Step 1: Failing tests:**
  - every `TRANSACTION_TYPES` value: `isBankEntry(t) !== isCustomerInitiated(t)`; the four bank types → `isBankEntry` true; `TRANSFER` → false.
  - `latestActivityDate` of `2024-03-01`, `2024-04-26`, `2011-01-27` → `'2024-04-26'`; `[]` throws `RangeError`.
  - `daysSince('2024-04-19', '2024-04-26')` → 7; `('2024-02-28', '2024-03-01')` → 2; `('2024-04-27', '2024-04-26')` → −1; `('2024-02-30', …)` and `('2024-4-1', …)` throw `RangeError`.
- [ ] **Step 2:** `npx vitest run src/lib/domain`. Expected: FAIL.
- [ ] **Step 3:** Implement. Parse `YYYY-MM-DD` with a regex, build `Date.UTC(y, m - 1, d)`, and reject a date whose UTC parts differ from the input (catches `02-30`).
- [ ] **Step 4:** Same command, also with `TZ=America/Los_Angeles`. Expected: PASS both.
- [ ] **Step 5:** `git commit -m "feat: add bank-entry, as-of date, and days-since definitions"`

### Task 4: First selectors and the home page

**Files:** Create `src/lib/selectors/dataset.ts`, `src/lib/selectors/book.ts`, `src/lib/selectors/book.test.ts`; modify `src/pages/HomePage.tsx`.

**Interfaces — Consumes:** task 2–3 functions. **Produces:**

- `interface Dataset { profiles: readonly Profile[]; portfolio: readonly PortfolioItem[]; transactions: readonly Transaction[] }` and `dataset: Dataset` (bound to `@/data`) in `dataset.ts`.
- `customerCount(data: Dataset): number`; `asOfDateOf(data: Dataset): string` in `book.ts`.
- Bound exports: `getCustomerCount(): number`; `asOfDate: string` (computed once at module load).

- [ ] **Step 1: Failing tests** in `book.test.ts`: `customerCount` on a 2-profile fixture → 2; contract: `asOfDate === '2024-04-26'`; `getCustomerCount() === 100`; the sum of `customerAum` over each customer's rows (grouped by `customer_id`) equals `811749876893` (total of non-LOAN `amount` in `portfolio.json`, measured 2026-11-23).
- [ ] **Step 2:** `npx vitest run src/lib/selectors`. Expected: FAIL.
- [ ] **Step 3:** Implement; `HomePage` renders `{getCustomerCount()} customers loaded.` and no longer imports `@/data`.
- [ ] **Step 4:** `npm run test`. Expected: all PASS, including `src/routes.test.tsx`.
- [ ] **Step 5:** `git commit -m "feat: add the first selectors and read the customer count through them"`

### Task 5: Layer rule in ESLint

**Files:** Modify `eslint.config.js`, `vite.config.ts` (test `include`), `tsconfig.node.json` (`include`); create `eslint.config.test.ts` (repo root).

- [ ] **Step 1: Failing test** `eslint.config.test.ts` (`// @vitest-environment node`): `new ESLint({ cwd })`, `lintText(code, { filePath })`, assert `no-restricted-imports` errors for each spec 4.3 case: page → `@/data` (error), page → `../data` (error), domain → `@/lib/selectors/book` (error), domain → `@/data` (error), `src/lib/domain/x.test.ts` → `@/data` (error), selector → `@/data` (none), page → `@/lib/domain` (none). Add: insights → `@/lib/selectors/book` (error), `src/types/x.ts` → `@/lib/domain` (error), `src/lib/format.ts` → `@/lib/domain` (error).
- [ ] **Step 2:** `npx vitest run eslint.config.test.ts`. Expected: FAIL on the error cases.
- [ ] **Step 3:** Add one `no-restricted-imports` block per layer with non-overlapping `files` globs (spec 4.1 table). Patterns cover `@/…` and relative forms (use the `regex` pattern option if globs miss `../../data`).
- [ ] **Step 4:** Same test, then `npm run lint`. Expected: PASS, 0 lint errors on the repo.
- [ ] **Step 5:** `git commit -m "build: enforce the one-way layer rule with ESLint"`

### Task 6: CLAUDE.md

**Files:** Modify `CLAUDE.md`.

- [ ] **Step 1:** Spec 6.3: Rule 1 gains the layer rule (short, link ADR 0004); new Rule 9 = copy rule (parent spec 5.4); folder structure gains `src/lib/domain/`, `src/lib/selectors/`, `eslint.config.test.ts`; Data model links ADR 0006. Rule 8 step 3 becomes: "`executing-plans` in the main session or one implementer subagent per feature runs the plan, with no review after each task." Step 4 keeps one `requesting-code-review` over the whole branch.
- [ ] **Step 2:** `npm run check`. Expected: typecheck, lint, lint:md, test, build all pass.
- [ ] **Step 3:** `git commit -m "docs: add the layer and copy rules and the one-review-per-branch flow to CLAUDE.md"`
