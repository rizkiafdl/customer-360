# 0006. Business definitions reused from Part 2

- **Status:** Accepted
- **Date:** 2026-11-23

## Context

Part 2 of this assessment (Q1 revenue contributor, Q2 high-income product
use) answered its questions with a set of definitions: what counts as AUM,
what "holds a product" means, which customers are high income. The Customer
360 app shows the same data. If the app used other definitions, its numbers
would disagree with the Part 2 answers, and a reviewer reading both would
not know which one is right.

The raw data has traps that a naive calculation falls into (CLAUDE.md, Data
model):

- LOAN rows sit in the same table as deposits and investments.
- 428 portfolio rows have `amount` 0 and 5 have `amount` `null`.
- GIRO, GIROSYARIAH, and MULTI CURRENCY appear under both FUNDING and LOAN.
- Transactions have no debit/credit direction. Only 32 rows are negative.
- `BUNGA`, `BIAYA`, `PAJAK`, and `DENDA` rows are posted by the bank, not
  made by the customer.

## Decision

These definitions are fixed for the whole app. Each one is a constant or a
pure function in `src/lib/domain/`, with tests.

| Term | Definition | Code |
| --- | --- | --- |
| AUM | Sum of `amount` over FUNDING, ORI, BANCA, and REKSA. Excludes LOAN. `null` counts as 0. | `AUM_CATEGORIES`, `customerAum` |
| Loan exposure | Sum of `amount` over LOAN. `null` counts as 0. Shown next to AUM, never added to it. | `loanExposure` |
| Total balance | AUM + loan exposure. Used only where Part 2 used it. Never called AUM. | No function yet. The first feature that needs it adds one. |
| Holds a product | `amount > 0`. A zero or `null` balance is not held. | `isHeld` |
| Amount by category | One total per `product_category`, all five present, 0 when a category has no rows. Groups by category, never by product name alone, because some product names exist under both FUNDING and LOAN. | `amountByCategory` |
| Bank entry | `transaction_type` is `BUNGA`, `BIAYA`, `PAJAK`, or `DENDA`. 869 of 5,000 transactions. | `BANK_ENTRY_TYPES`, `isBankEntry` |
| Customer-initiated | Every transaction that is not a bank entry. Behavior views use these only. | `isCustomerInitiated` |
| Income rank | 1 for `sd. 1 Juta` up to 8 for `>100 Juta`, the order of `INCOME_BANDS`. | `incomeRank` |
| High income | Income rank 5 or higher (`>10 Juta - 25 Juta` and above). 18 of 100 customers. | `HIGH_INCOME_MIN_RANK`, `isHighIncome` |

Two further rules:

- **Never sum transaction amounts as a net flow.** The data has no
  direction, so a sum is volume. The app calls it "amount", never "inflow"
  or "outflow".
- Functions over portfolio rows take **one customer's rows**. They do not
  filter by `customer_id`. Filtering is the selectors' job (ADR 0004).

`DENDA` is a bank entry. This was confirmed in the F0 brainstorm. Part 2
named `BUNGA`, `BIAYA`, and `PAJAK`.

The as-of date is defined in ADR 0005.

## Consequences

- Every screen and every insight rule uses the same AUM, the same "holds",
  and the same high-income test, so numbers agree across the app and with
  Part 2.
- A selectors contract test checks that `customerAum` summed over all
  customers equals the AUM total over all non-LOAN rows.
- A change to a definition is a change to this ADR, to one domain function,
  and to its tests. It is never a change in a component.
- Business thresholds that Part 2 did not define (value tiers, digital
  methods, insight triggers) are not here. They come from the user
  (CLAUDE.md Rule 3) and live in the insights layer.

## Alternatives considered

- **AUM including LOAN.** Rejected: a loan is money the customer owes, not
  assets under management. It disagrees with Part 2.
- **"Holds" = has a row.** Rejected: 83 customers have at least one zero or
  `null` row, so almost everyone would "hold" products they do not use.
- **Group by product name.** Rejected: GIRO under FUNDING and GIRO under
  LOAN are different positions.
- **Treat all transactions as customer actions.** Rejected: interest, fees,
  and tax rows would count as customer activity.
- **Drop rows with `null` amount.** Rejected: dropping a row changes the
  count of products. Counting `null` as 0 keeps the row and adds nothing to
  the total.
