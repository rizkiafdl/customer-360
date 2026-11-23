# F2. Insight rules — design

- **Date:** 2026-11-23
- **Status:** Approved by the orchestrator on 2026-11-23 under the user's fast flow; all thresholds are user decisions of 2026-11-23.
- **Parent spec:** `docs/superpowers/specs/2026-11-23-customer-360-product-design.md`,
  feature F2, sections 5.2, 5.3, 5.4, and 7.
- **ADR written here:** [0008](../../adr/0008-insight-rules-and-thresholds.md)
  (the parent spec planned it as 0007; 0007 went to the visual system).

If this document and the parent spec disagree, this document wins.

## 1. Intent

F2 turns the signals marked **Rule**, **Classification**, and **Reframed**
in parent spec 5.2 into pure, tested functions in `src/lib/insights/`. It
has no UI. F3 (offer panel), F4 (worklist), F5 (summary strip), and F6
(rules page) read its output through selectors.

Every rule is deterministic and explainable: a fixed condition with a
named threshold, the evidence numbers, and a reason built from a fixed
template. A reviewer can trace each reason to one threshold with a
recorded source.

## 2. Goals, non-goals, anti-goals

- **Goals:**
  - One thresholds module, `src/lib/insights/thresholds.ts`, with a source
    comment on every value.
  - The value tier, the six rules, and the KYC note in section 4, each with
    tests for fire, no fire, and the edges in section 6.
  - `evaluateCustomer`: one customer's fired rules in rule order, the KYC
    note, and the tier.
  - Selectors that run the rules over every customer, with contract tests
    that pin the counts in section 5.
  - ADR 0008.
- **Non-goals:**
  - No UI, no route, no change to `src/components/`, `src/pages/`, or
    `src/routes.tsx`.
  - No digital methods and no digital share (F1 owns them).
  - No ranking of customers and no tier UI (F4, F5).
- **Anti-goals (failure even if it works):**
  - A threshold that the user did not decide (CLAUDE.md Rule 3).
  - A reason with an adjective, advice tone, or a claim the evidence does
    not carry (CLAUDE.md Rule 9). The high-income rule must not say that
    Part 2 proved BANCA demand: the Part 2 lift was directional, not
    significant.
  - A rule that filters by `customer_id` or imports `src/data`.

## 3. Approaches

### 3.1 How customers are flagged (decided: fixed rules)

| Option | Outcome |
| --- | --- |
| **A. Fixed rules with named thresholds and a fixed rule order** | **Chosen** (parent spec 5.3). Each reason traces to one threshold. |
| B. A weighted score per customer | Rejected. Weights are thresholds nobody decided, and a score does not explain itself. |
| C. Thresholds computed from the data at load time (for example a percentile) | Rejected. The value moves when the data changes, and the rules page could not state it. |

### 3.2 Where the cash/deposit split lives (my call: insights)

The split of FUNDING into deposit and cash is a user decision of
2026-11-23 for the cash-heavy rule, not a Part 2 definition. It lives in
`src/lib/insights/`, next to the rule. If a later feature needs it in the
UI, it can move to domain with its tests.

### 3.3 Output shape (my call)

One result type for every rule and for the KYC note, discriminated on
`fired`: `{ id, fired, ruleText, evidence, reason }`, with `reason` a
string when fired and `null` when not. `evidence` carries `aum` always,
plus the values the rule uses (`cashAmount`, `cashShare`, `category`,
`incomeBand`). A rule catalog adds `label` and `source` per rule, for F6.

## 4. Settled points (user decisions, 2026-11-23)

AUM, "holds" (`amount > 0`), `isHighIncome` (rank ≥ 5), and `incomeRank`
come from domain (ADR 0006). Amounts: `null` counts as 0.

| Item | Condition | Source |
| --- | --- | --- |
| Tier **No AUM** | AUM = 0 | User decision |
| Tier **Mass** | 0 < AUM < Rp 1.000.000.000 | User decision |
| Tier **Affluent** | Rp 1.000.000.000 ≤ AUM < Rp 5.000.000.000 | User decision |
| Tier **Priority** | AUM ≥ Rp 5.000.000.000 | User decision |
| `cash-heavy` | AUM > 0 and cash / AUM ≥ 80% | User decision |
| `investment-gap-reksa` / `-ori` / `-banca` | Holds no row of the category and AUM > Rp 100.000.000 | Part 1 cut-off; user decision to reuse it |
| `no-aum` | AUM = 0 | Parent spec 5.2 |
| `high-income-no-banca` | `isHighIncome` and holds no BANCA | Part 2 definition |
| KYC note `kyc-income-band` | Income rank ≤ 3 (`>3 Juta - 5 Juta` or below) and AUM ≥ Rp 1.000.000.000 | User decision |

- **Tier edges** come from this data's distribution (median AUM
  Rp 1.38 Bn). The Part 1 edges (10 jt, 100 jt) were rejected: 83
  customers sit above 100 jt.
- **AUM below 0** is not in the data (no porto `amount` is negative) and no
  tier is defined for it. `valueTier` throws a `RangeError` (my call: fail
  loudly, do not guess a tier).
- **Deposit** = a FUNDING row whose `product` starts with `DEPO`. **Cash** =
  every other FUNDING row with a non-null `product` (Tabungan, TABSYA,
  TANDA360, TAB_MDHRBHSYA, TAKA*, GIRO*, MULTI CURRENCY*). A `null` product
  is not cash. Cash amount = sum of `amount` over cash rows.
- **Rule order** (exported as `RULE_ORDER`): `cash-heavy` →
  `investment-gap-reksa` → `investment-gap-ori` → `investment-gap-banca` →
  `no-aum` → `high-income-no-banca`. F3 shows fired rules in this order.
  F4's "top reason" is the first fired rule in this order.
- **The KYC note** is a note, not an offer. It is outside `RULE_ORDER`, is
  never a top reason, and does not affect ranking.

### 4.1 Templates (copy rule, CLAUDE.md Rule 9)

Money goes through `formatIDR()`. Percentages are whole numbers, rounded
down, so a reason never shows more than the data holds.

| Id | Reason template (example) |
| --- | --- |
| `cash-heavy` | `92% of AUM in cash. AUM Rp 1.384.200.000, cash Rp 1.273.464.000.` |
| `investment-gap-*` | `No REKSA. AUM Rp 1.384.200.000.` |
| `no-aum` | `AUM Rp 0.` |
| `high-income-no-banca` | `No BANCA. Income band >25 Juta - 50 Juta.` |
| `kyc-income-band` | `Income band >3 Juta - 5 Juta. AUM Rp 2.000.000.000.` |

Rule texts state the condition with the threshold value, built from the
constants (for example `Holds no REKSA, and AUM is above Rp 100.000.000.`).

## 5. Fire counts on the real data

Measured on 2026-11-23 against the committed JSON (100 customers). The
selectors contract tests pin these numbers.

| Item | Expected (user) | Measured |
| --- | --- | --- |
| Tier No AUM / Mass / Affluent / Priority | 16 / 28 / 40 / 16 | 16 / 28 / 40 / 16 |
| `cash-heavy` | 12 | 12 |
| `investment-gap-reksa` | 29 | 29 |
| `investment-gap-ori` | 37 | 37 |
| `investment-gap-banca` | 29 | 29 |
| `no-aum` | 16 | 16 |
| `high-income-no-banca` | 6 of 18 | 6 of 18 |
| KYC note | 43 | 43 |

All measured counts match the expected counts.

## 6. Done when

- Each rule, the tier, and the KYC note have tests for: fires, does not
  fire, no portfolio rows, AUM 0, a `null` amount, a `null` product, and
  each threshold exactly at its edge:
  - cash share exactly 80% fires;
  - AUM exactly Rp 100.000.000 does not fire the gap rule (`>`);
  - AUM exactly Rp 1.000.000.000 is Affluent and is KYC-eligible;
  - AUM exactly Rp 5.000.000.000 is Priority;
  - income rank 3 is KYC-eligible and rank 4 is not.
- Tests assert exact reason and rule-text strings.
- `evaluateCustomer` returns fired rules in `RULE_ORDER`, the KYC note,
  and the tier.
- Selectors contract tests pin every count in section 5.
- ADR 0008 is in the branch. `npm run check` exits 0.

## 7. Left to the builder

- File names and splits inside `src/lib/insights/`, and type names.
- Rule labels for F3/F4 (short, within the copy rule).
- The selector names and file, within the selectors pattern of ADR 0004.
- Test fixtures.
