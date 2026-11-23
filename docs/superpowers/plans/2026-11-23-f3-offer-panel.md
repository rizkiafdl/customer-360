# F3 Offer Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The "What to offer" panel on `/customers/:id`: one card per fired rule in `RULE_ORDER`, a fixed empty line, and the KYC note apart.

**Architecture:** `src/lib/insights/panel.ts` maps a `CustomerEvaluation` to an `OfferPanel` with fixed copy. `buildCustomer360` adds it as `offers`. Components render the view model only.

**Tech Stack:** React 19, Tailwind v4 tokens from F1, lucide-react, Vitest + RTL, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-23-f3-offer-panel-design.md`

**Start after F1 merges.** Branch `feat/f3-offer-panel` must rebase on a `main` that has F1 and F2.

## Global Constraints

- Copy (spec 4.3, exact): `What to offer`, `No offer rule fired.`, `Note`, `Opportunity` / `Warning` / `Info`. All in `src/lib/insights/panel.ts` (CLAUDE.md Rule 9).
- Reasons and rule texts come from F2 unchanged. No new threshold (Rule 3). No dedupe.
- Colors only via `--opportunity`, `--warning`, `--info` Tailwind classes; left border and icon tint only; never `primary` or `destructive`.
- Components do not import `RULES`, `evaluateCustomer`, or `getCustomerEvaluation` (Rule 1).
- Commits: Conventional Commits, repo owner only, no `Co-Authored-By` or other trailer.

## Review Focus

1. The KYC note renders after the `Offers` list and is never one of its items, also when cards exist → task 1 test (offers plus note) and task 3 test.
2. A customer with no portfolio rows fires `no-aum`, so the panel shows a card, not the empty line → task 2 test on fixture customer 2.
3. Adding fixture customer 4 can break F1 tests that count fixture rows or options → task 2 runs the full suite.
4. Reasons hold `formatIDR` no-break spaces; RTL text matchers need the F1 `idr()` normalization → task 3 tests.

---

### Task 1: Panel mapping and copy

**Files:** create `src/lib/insights/panel.ts`, `panel.test.ts`; export from `src/lib/insights/index.ts`.

**Produces:** `InsightKind`, `INSIGHT_KINDS: Record<InsightId, InsightKind>`, `KIND_LABELS: Record<InsightKind, string>`, `OFFER_PANEL_TITLE`, `OFFER_PANEL_EMPTY`, `OFFER_PANEL_NOTE_HEADING`, `OfferCard`, `OfferPanel` (spec 4.3), `offerPanel(evaluation: CustomerEvaluation): OfferPanel`.

- [ ] **Step 1: Failing tests** with hand-made `CustomerEvaluation`s (use `evaluateCustomer` on `test-fixtures.ts` inputs): both BANCA rules → two cards, ids `['investment-gap-banca', 'high-income-no-banca']`, labels `No BANCA` / `High income, no BANCA`; cards keep `insights` order; no insight → `cards []`, `emptyText 'No offer rule fired.'`; with a card → `emptyText null`; KYC fired, with and without cards → `note.kind 'warning'`, `note.label 'KYC income band'`, `cards` has no `kyc-income-band`; every `RuleId` → `'opportunity'`; exact strings for each constant.
- [ ] **Step 2:** `npx vitest run src/lib/insights/panel.test.ts` → FAIL (module missing).
- [ ] **Step 3:** Implement. `label` from `RULES` by id and `KYC_NOTE.label`; `reason` and `ruleText` copied from the insight.
- [ ] **Step 4:** Run → PASS. `git commit -m "feat: add the offer panel mapping and copy"`

### Task 2: View model and contract tests

**Files:** modify `src/lib/selectors/customer360.ts`, `customer360.test.ts`, `src/test/fixtures.ts`.

**Consumes:** `offerPanel`. **Produces:** `Customer360.offers: OfferPanel`.

- [ ] **Step 1:** Add fixture customer 4: `>1 Juta - 3 Juta`; FUNDING `DEPOSITO12` 600_000_000, FUNDING `TABUNGAN` 100_000_000, ORI, BANCA, REKSA 100_000_000 each (AUM Rp 1 Bn, cash 10%); one `MOBILE BANKING` `TRANSFER` on `2024-04-20`. Only the KYC note fires.
- [ ] **Step 2: Failing tests:** fixture 1 → two BANCA cards; fixture 2 → one `no-aum` card, `emptyText null`; fixture 4 → `cards []`, `No offer rule fired.`, note set. Real data: card-count distribution 0/1/2/3/4 = 16/49/26/8/1; 9 empty panels with a note; both BANCA cards for exactly `[6386, 6513, 8797]`; for all 100 IDs, card ids equal `getCustomerEvaluation(id)!.insights` ids.
- [ ] **Step 3:** Run → FAIL. Implement (`evaluateCustomer({ profile, portfolio })` inside `buildCustomer360`). Run `npm test` → PASS, F1 tests included.
- [ ] **Step 4:** `git commit -m "feat: add the offer panel to the Customer 360 view model"`

### Task 3: Panel UI

**Files:** create `src/components/customer/InsightCard.tsx`, `OfferPanel.tsx`; modify `src/pages/CustomerDetail.tsx`, `CustomerDetail.test.tsx`.

- [ ] **Step 1: Failing tests** (`renderDetail(id)` from F1): region `What to offer` sits before region `Holdings`; fixture 1 → list `Offers` has 2 items, text `Opportunity`, both reasons via `idr()`; fixture 4 → `No offer rule fired.`, heading `Note`, `Warning`, `KYC income band`, and the note is outside the `Offers` list.
- [ ] **Step 2:** Run → FAIL. Implement: icon map `{ opportunity: Lightbulb, warning: TriangleAlert, info: Info }` in `InsightCard`, `aria-hidden`; `border-l-4` plus `border-{kind}` and `text-{kind}` on the icon; rule text `text-muted-foreground`; key cards by `id`.
- [ ] **Step 3:** Run → PASS. `git commit -m "feat: add the What to offer panel to the detail page"`

### Task 4: e2e and verify

**Files:** `e2e/smoke.spec.ts`.

- [ ] **Step 1:** Tests: `./customers/6513` → list `Offers` has 2 items, both texts starting `No BANCA.` (6513 fires only the two BANCA rules); `./customers/1047` → `No offer rule fired.` and `KYC income band`. Both assert no console or page errors.
- [ ] **Step 2:** `npm run check && npm run e2e` → exit 0. `git commit -m "test: add e2e checks for the offer panel"`
