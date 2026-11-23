# F2 Insight Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pure, tested insight rules, value tier, and KYC note in `src/lib/insights/`, plus selectors with contract tests on the real data.

**Architecture:** Insights take one customer's `{ profile, portfolio }` and import only domain, shared, and types (ADR 0004). Selectors group the dataset per customer and run `evaluateCustomer`.

**Tech Stack:** TypeScript 6 strict, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-23-f2-insight-rules-design.md`

## Global Constraints

- Thresholds only from spec section 4; every value in `thresholds.ts` with a source comment (CLAUDE.md Rule 3).
- Reasons follow the copy rule: fixed templates, `formatIDR()` for money, exact-string tests (CLAUDE.md Rule 9).
- No `src/data` import and no `customer_id` filtering in `src/lib/insights/`.
- Do not touch `src/components/`, `src/pages/`, `src/routes.tsx`, `src/index.css`, `src/data/*.json`, or CLAUDE.md.
- Commits: Conventional Commits, author is the repo owner only, no trailer.

## Review Focus

1. `>` vs `≥` at each edge (gap rule `>` 100 jt; tiers, cash share, KYC `≥`) → edge tests in tasks 3–5.
2. Float error in the cash share and the percent text (for example `0.57 * 100`) → task 3 tests an integer-exact percent.
3. A `null` product under FUNDING must not count as cash → task 3 test.
4. GIRO under LOAN must not count as cash → task 3 test.
5. Fired rules come out in `RULE_ORDER`, and the KYC note never joins them → task 5 test.

---

### Task 1: ADR 0008

- [ ] Write `docs/adr/0008-insight-rules-and-thresholds.md` (Nygard + Alternatives considered, like ADR 0005). Run `npm run lint:md`.
- [ ] `git commit -m "docs: add ADR 0008 for insight rules and thresholds"`

### Task 2: Thresholds and value tier

**Files:** `src/lib/insights/thresholds.ts`, `tiers.ts`, `tiers.test.ts`, `thresholds.test.ts`.

- [ ] Write tests: tier at 0, 1, Rp 1 Bn − 1, Rp 1 Bn, Rp 5 Bn − 1, Rp 5 Bn; negative AUM throws `RangeError`; thresholds pinned to spec values.
- [ ] Run `npx vitest run src/lib/insights` → FAIL (module missing). Implement. Run → PASS.
- [ ] `git commit -m "feat: add the insight thresholds and the value tier"`

### Task 3: Cash split and the rules

**Files:** `src/lib/insights/types.ts`, `cash.ts`, `text.ts`, `rules.ts`, and their tests.

- [ ] Write tests for `isDepositProduct`, `cashAmount`, `wholePercent`, and each rule: fires, does not fire, no rows, AUM 0, `null` amount, `null` product, exact edges, exact reason and rule text.
- [ ] Run → FAIL. Implement. Run → PASS.
- [ ] `git commit -m "feat: add the cash-heavy, investment gap, no AUM, and high income rules"`

### Task 4: KYC note

- [ ] Tests in `kyc.test.ts`: rank 3 with AUM Rp 1 Bn fires; rank 4 or AUM below Rp 1 Bn does not; exact text. FAIL → implement `kyc.ts` → PASS.
- [ ] `git commit -m "feat: add the KYC income band note"`

### Task 5: evaluateCustomer

- [ ] Tests in `evaluate.test.ts`: order follows `RULE_ORDER`; KYC note separate; tier set; no rows. FAIL → implement `evaluate.ts` and `index.ts` → PASS.
- [ ] `git commit -m "feat: evaluate all insight rules for one customer"`

### Task 6: Selectors and contract tests

- [ ] `src/lib/selectors/insights.test.ts`: fixture tests, then real-data counts from spec section 5. FAIL → implement `insights.ts` → PASS.
- [ ] `git commit -m "feat: add insight selectors with fire-count contract tests"`

### Task 7: Verify

- [ ] `npm run check` → exit 0.
