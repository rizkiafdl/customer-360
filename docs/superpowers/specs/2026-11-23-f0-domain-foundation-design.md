# F0. Domain foundation — design

- **Date:** 2026-11-23
- **Status:** Approved by the user on 2026-11-23 (builder check: nothing important left).
- **Shipped:** PR #6, merged on 2026-11-23.
- **Parent spec:** `docs/superpowers/specs/2026-11-23-customer-360-product-design.md`,
  feature F0, sections 3, 5.1, 5.4, 6, and 8.
- **ADRs written here:** 0004 (layers), 0005 (as-of date), 0006 (business
  definitions).

The parent spec is the main design for F0. This document records what the
F0 brainstorm added or settled on top of it. If this document and the parent
spec disagree, this document wins.

## 1. Intent

F0 builds the layer that every later feature stands on. It has no UI. It
does two things:

1. It fixes **where code may live and what it may import**, and makes
   `npm run lint` enforce it. Later features cannot put business logic in a
   component or read the raw data from a page by accident.
2. It turns the **business definitions from Part 2** (AUM, loan exposure,
   "holds", customer-initiated vs bank entries, high income, the as-of
   date) into pure, tested functions and constants in `src/lib/domain/`.
   F1–F6 use these functions, so every screen and every rule uses the same
   definition.

The repo is a portfolio piece. A reviewer must be able to see that each
number in the app comes from one named definition with a recorded source,
and that the layer rule is checked by a tool, not only written down.

## 2. Goals, non-goals, anti-goals

- **Goals:**
  - The layer rule in section 4, enforced by ESLint, with a test that
    proves the rule blocks a bad import.
  - The domain constants and functions in section 5, each with tests.
  - ADRs 0004, 0005, and 0006.
  - CLAUDE.md gains the layer rule and the copy rule (parent spec 5.4).
  - `npm run check` and CI stay green.
- **Non-goals:**
  - No new UI, no new route, no change to what the home page shows.
  - No insight rules and no thresholds (F2).
  - No list of digital transaction methods (deferred to F2, see 6.2).
  - No `totalBalance` function. ADR 0006 defines the term; the function is
    added by the first feature that needs it.
  - No category color map (F1).
- **Anti-goals (failure even if it works):**
  - A definition that disagrees with Part 2, for example an AUM that
    includes LOAN, or a "holds" that counts a zero balance.
  - A layer rule that passes `@/data` but misses `../../data` (or the other
    way round).
  - Domain tests that load the full dataset instead of small fixtures.
  - A threshold or list that nobody decided (CLAUDE.md Rule 3).

## 3. Approaches

### 3.1 Where the as-of date comes from (decided: computed)

The parent spec proposed to compute the as-of date from the data. The layer
rule forbids `src/lib/domain/` to import `src/data`, so domain cannot
compute it from the real data by itself.

| Option | Outcome |
| --- | --- |
| A. Constant `AS_OF_DATE = '2024-04-26'` in domain, guarded by a contract test | First chosen, then rejected by the user in the F0 brainstorm in favor of B. A hard-coded date does not follow the data. |
| **B. Computed once by the selectors layer at module load, with the domain function `latestActivityDate`** | **Chosen by the user.** The value always follows the data. A selectors contract test pins it to `2024-04-26`, so ADR 0005 can state the value and a data change that moves it fails CI. |
| C. Precomputed by `npm run data:build` into a generated file | Rejected (my call). It needs a converter change and a new generated file for one value that one pass over 5,000 rows gives at load time. |

`daysSince` takes the as-of date as a parameter, so domain tests use their
own dates.

### 3.2 How the layer rule is enforced (one sensible way)

| Option | Outcome |
| --- | --- |
| **ESLint built-in `no-restricted-imports`, one config block per layer folder** | **Chosen.** No new dependency. The parent spec (section 6) already names this rule. |
| `eslint-plugin-boundaries` or `eslint-plugin-import` | Rejected. A new dependency for five folders. |
| `dependency-cruiser` | Rejected. A second tool and a second CI step for the same check. |

## 4. The layer rule (ADR 0004)

### 4.1 Layers, top to bottom

| Layer | Folder | May import from `src/` |
| --- | --- | --- |
| UI | `src/pages/`, `src/components/`, `src/routes.tsx`, `src/main.tsx` | selectors, insights, domain, shared, types, other UI |
| Selectors | `src/lib/selectors/` | `src/data`, insights, domain, shared, types |
| Insights | `src/lib/insights/` (F2) | domain, shared, types |
| Domain | `src/lib/domain/` | shared, types |
| Data | `src/data/` | types |
| Shared | `src/lib/format.ts`, `src/lib/utils.ts` | nothing from `src/` |
| Types | `src/types/` | nothing from `src/` outside `src/types/` |

Rules, in words:

1. **Only `src/lib/selectors/` imports `src/data`.** Every other layer gets
   data through a selector.
2. **No layer imports a layer above it.** For example, domain must not
   import insights, selectors, or UI.
3. **A layer may skip layers downward.** For example, UI may import a domain
   constant directly (F1 needs this for the category color map). This keeps
   the rule one-way without forcing pass-through selectors.
4. **The rule catches both import forms:** the `@/` alias (`@/data`,
   `@/data/index`, `@/lib/selectors/x`) and relative paths that reach the
   same folder (`../data`, `../../data/index`).
5. **Test files follow the same rule as the layer they are in,** with no
   exception. Contract tests that run domain functions on the real data
   live in the selectors layer (5.3). Domain and insight tests use small
   hand-made fixtures.
6. `src/components/ui/` (shadcn/ui generated code) is part of the UI layer.
   It may import shared (`@/lib/utils`), which it already does.

Folders for insights and selectors are covered by the ESLint config even
before their first file exists, so the rule is in place when F1 and F2
start.

### 4.2 The first selector (my call)

`src/pages/HomePage.tsx` imports `profiles` from `@/data` today, to show
"100 customers loaded." Rule 1 makes this a lint error. F0 adds the first
selectors: one returns the customer count, and the home page calls it; one
exports the as-of date, computed once at module load with
`latestActivityDate` (3.1). The
page text does not change, so `src/routes.test.tsx` and the e2e smoke test
stay as they are.

The selector follows the parent spec's proposal (section 6): a pure
function that takes the dataset as an argument, plus a thin export bound to
the real data. F0 settles this pattern for F1, because F1 is the first
feature with real selectors. The exact names are the builder's call.

### 4.3 Proof that the rule works

A Vitest test runs ESLint through its Node API (`ESLint#lintText` with a
`filePath`) on short code strings. It must show at least:

- an error for a page that imports `@/data`,
- an error for a page that imports `../data` (relative form),
- an error for a domain file that imports `@/lib/selectors/...`,
- an error for a domain file that imports `@/data`,
- no error for a selector that imports `@/data`,
- no error for a page that imports a domain constant (downward skip),
- an error for a domain test file (`src/lib/domain/x.test.ts`) that
  imports `@/data`.

The test is Node code. It runs in Vitest's `node` environment (not jsdom)
and is type-checked by `tsconfig.node.json`. Its file path is the builder's
call; Vitest `include` and `tsconfig.node.json` `include` are extended to
cover it.

## 5. Domain contents (ADRs 0005 and 0006)

All definitions come from Part 2 of this assessment (parent spec 5.1) or
from the parent spec section 3. Domain functions take plain values or plain
arrays. Functions over portfolio rows take **one customer's rows**; they do
not filter by `customer_id`. Filtering is the selectors' job.

### 5.1 Constants

| Constant | Value | Source |
| --- | --- | --- |
| `AUM_CATEGORIES` | `FUNDING`, `ORI`, `BANCA`, `REKSA` | Part 2 AUM definition. LOAN is excluded. |
| `BANK_ENTRY_TYPES` | `BUNGA`, `BIAYA`, `PAJAK`, `DENDA` | Parent spec section 3. `DENDA` is a bank entry (confirmed in the F0 brainstorm). 869 of 5,000 transactions are bank entries. |
| High-income rank floor | `5` (`>10 Juta - 25 Juta` and above) | Part 2 high-income definition. 18 of 100 customers. |

### 5.2 Functions

| Function | Behavior |
| --- | --- |
| `isHeld(item)` | `true` when `amount > 0`. `null` and `0` are not held. |
| `customerAum(items)` | Sum of `amount` over `AUM_CATEGORIES`. `null` counts as 0. LOAN rows are ignored. Empty array → 0. |
| `loanExposure(items)` | Sum of `amount` over LOAN. `null` counts as 0. Empty array → 0. Never added to AUM. |
| `amountByCategory(items)` | One total per `product_category`, all five categories present, 0 when a category has no rows. `null` counts as 0. Groups by category only, never by product name (GIRO, GIROSYARIAH, and MULTI CURRENCY exist under both FUNDING and LOAN). |
| `isBankEntry(trx)` / `isCustomerInitiated(trx)` | Bank entry when `transaction_type` is in `BANK_ENTRY_TYPES`; customer-initiated otherwise. Exactly one is `true` for every transaction. |
| `latestActivityDate(transactions)` | The latest `activity_date` in the array (`YYYY-MM-DD` strings compare in date order). Throws a `RangeError` on an empty array, because there is then no as-of date. ADR 0005. |
| `daysSince(date, asOf)` | Whole days from `date` to `asOf`, both `YYYY-MM-DD`, computed in UTC (no time-zone shift). A `date` after `asOf` gives a negative number. A string that is not a real calendar date in `YYYY-MM-DD` form (for example `'2024-02-30'` or `'2024-4-1'`) throws a `RangeError`. |
| `incomeRank(band)` | 1 for `sd. 1 Juta` up to 8 for `>100 Juta`, the order of `INCOME_BANDS`. |
| `isHighIncome(band)` | `incomeRank(band) >= 5`. |

Exact parameter types, type names, and file names inside `src/lib/domain/`
are the builder's call. Every file has a co-located `*.test.ts`
(CLAUDE.md Rule 1).

### 5.3 Contract tests on the real data

The selectors test file gains (selectors are the only layer that may load
the real data):

- The as-of date selector equals `'2024-04-26'`.
- `customerAum` summed over all customers equals the AUM total over all
  FUNDING, ORI, BANCA, and REKSA rows (a check that the per-customer and
  book-level views agree). The builder computes the expected value from the
  JSON once and writes it into the test with a comment.

## 6. Settled points

### 6.1 ADRs

- **0004. Layered code structure.** Section 4: the layers, the import
  rules, the downward-skip decision, the selector pattern, the test-file
  exception, and the alternatives in 3.2 and parent spec 4.2.
- **0005. As-of date.** The as-of date is the latest `activity_date` in
  the data (`2024-04-26` today), not today's date. All recency uses it. It
  is computed once by the selectors layer with `latestActivityDate`, and a
  contract test pins the value (3.1, with options A and C as the rejected
  alternatives). Today's date is
  rejected because the data ends in April 2024, so every customer would
  look inactive.
- **0006. Business definitions.** AUM, loan exposure, total balance (AUM +
  loan exposure, used only where Part 2 used it, never called AUM),
  "holds" = `amount > 0`, customer-initiated vs bank entries (with `DENDA`),
  high income = rank ≥ 5, group by category never by product alone, and
  never sum transaction amounts as a net flow (the data has no
  debit/credit direction). Source: Part 2 of this assessment. ADRs cite
  Part 1 and Part 2 by name only, not by file path.

Following CLAUDE.md Rule 8, the ADRs are the first task of the plan and go
in the same PR as the code.

### 6.2 Digital methods: deferred to F2

The parent spec lists "digital methods" among the F0 constants. No F0
function needs the list, and which methods count as digital (for example
`VELOCITY`) is a business definition the user has not given (CLAUDE.md
Rule 3). It is asked in the F2 brainstorm.

### 6.3 CLAUDE.md changes

- **Rule 1** gains the layer rule from 4.1 in short form, with a pointer to
  ADR 0004.
- **A new rule: the copy rule** from parent spec 5.4, word for word in
  meaning: a reason is the fired rule plus its evidence numbers; no
  adjectives, no advice tone, no exclamation marks, no generated text;
  money through `formatIDR()`; text from fixed templates in
  `src/lib/insights/` so tests check exact strings.
- **Folder structure** gains `src/lib/domain/` and `src/lib/selectors/`
  and the ESLint layer test.
- **Data model** points to ADR 0006 for the business definitions.

## 7. Done when

- `npm run lint` fails on each bad import in 4.3, and the ESLint test
  proves it.
- Every function in 5.2 has tests, including: empty array, `null` amount,
  zero amount, LOAN rows mixed with AUM rows, the same product name under
  FUNDING and LOAN, each bank-entry type, an invalid date string, and a
  date after the as-of date.
- The contract tests in 5.3 pass on the committed JSON.
- The home page shows "100 customers loaded." through a selector, and the
  as-of date selector returns `'2024-04-26'`.
- ADRs 0004–0006 and the CLAUDE.md changes are in the PR.
- `checks` and `e2e` pass on the PR.

## 8. Left to the builder

- Type names, file names, and how functions are split into files inside
  `src/lib/domain/` and `src/lib/selectors/`.
- The selector names and the exact shape of the dataset argument.
- The exact `no-restricted-imports` patterns and messages, within 4.1.
- The path of the ESLint layer test, within 4.3.
- Test fixtures.
