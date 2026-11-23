# 0008. Insight rules and thresholds

- **Status:** Accepted
- **Date:** 2026-11-23

## Context

The app tells a relationship manager what to offer each customer and why
(F3 panel, F4 worklist, F5 summary, F6 rules page). Four features read the
same flags, so the flags need one definition.

The data is small (100 customers) and static, with no outcome column: no
record of which offers were accepted. A model cannot be trained or
checked against it. Reviewers of this repo must be able to see why each
customer is flagged and where each cut-off comes from.

Every cut-off is a business threshold. CLAUDE.md Rule 3 forbids inventing
one. The user decided each value on 2026-11-23, partly from the Part 1 and
Part 2 analyses of this assessment.

## Decision

- **Deterministic rules, no scoring model.** Each rule is a pure function
  in `src/lib/insights/` over one customer's profile and portfolio rows.
  It does not filter by `customer_id` and does not import `src/data`
  (ADR 0004).
- **One output shape** for every rule: whether it fired, the rule id, the
  rule text with the threshold value, the evidence values, and a reason
  from a fixed template (`null` when the rule did not fire).
- **One thresholds module,** `src/lib/insights/thresholds.ts`. Every value
  has a comment that names its source: a user decision with its date, or
  Part 1 or Part 2 by name.
- **The rules and the tier** (user decisions, 2026-11-23):

  | Item | Condition |
  | --- | --- |
  | Value tier | No AUM = 0; Mass < Rp 1 Bn; Affluent Rp 1 Bn to below Rp 5 Bn; Priority ≥ Rp 5 Bn |
  | `cash-heavy` | AUM > 0 and cash ≥ 80% of AUM. Cash = FUNDING products whose name does not start with `DEPO`. |
  | `investment-gap-reksa`, `-ori`, `-banca` | Holds no row of the category, and AUM > Rp 100.000.000 (Part 1 cut-off) |
  | `no-aum` | AUM = 0 |
  | `high-income-no-banca` | High income (Part 2) and holds no BANCA |
  | KYC note | Income `>3 Juta - 5 Juta` or below, and AUM ≥ Rp 1 Bn |

- **A fixed rule order,** exported as `RULE_ORDER`: `cash-heavy`, then the
  gaps (REKSA, ORI, BANCA), then `no-aum`, then `high-income-no-banca`.
  The F3 panel shows fired rules in this order. F4's "top reason" is the
  first fired rule in this order.
- **The KYC note is not an offer.** It is outside `RULE_ORDER`, is never a
  top reason, and does not affect ranking.
- **The copy rule** (CLAUDE.md Rule 9) binds every template: the fired rule
  plus its evidence numbers, money through `formatIDR()`, no adjectives, no
  advice tone. Tests assert exact strings.
- **Contract tests** in `src/lib/selectors/` pin the fire count of every
  rule, the tier counts, and the KYC note count on the committed data.

## Consequences

- Each reason traces to one rule and one threshold with a source. F6 can
  print the rule, its threshold, and its live fire count.
- A changed threshold or a data change that moves a count fails CI. The
  change then has to update the thresholds module, this ADR, and the
  contract test on purpose.
- The rules cannot learn. A new signal needs a new rule, a user decision,
  and tests.
- The tier edges fit this data's distribution (median AUM Rp 1.38 Bn). On a
  very different book they would need a new decision.

## Alternatives considered

- **A weighted score per customer.** Rejected: the weights are thresholds
  nobody decided, and a score does not explain itself.
- **A trained model.** Rejected: 100 customers and no outcome column.
- **Thresholds computed from the data at load time** (for example the
  top 20% by AUM). Rejected: the value moves with the data, and the rules
  page could not state it as a fixed number.
- **Part 1 tier edges (Rp 10 jt, Rp 100 jt).** Rejected by the user: 83 of
  100 customers sit above Rp 100 jt, so the top tier would hold almost
  everyone.
- **Thresholds spread across the rule files.** Rejected: one module with
  sources is easier to review and to change.
- **The KYC note as a ranking signal.** Rejected: a low income band with a
  high AUM is more likely a stale KYC record than an offer.
