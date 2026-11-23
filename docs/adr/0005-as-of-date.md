# 0005. As-of date: the latest activity date in the data

- **Status:** Accepted
- **Date:** 2026-11-23

## Context

Several features measure recency: "days since the last transaction", the
activity view, and the summary strip. Recency needs a reference date.

The transaction data ranges from 2011-01-27 to 2024-04-26, and 87% of the
rows fall in March and April 2024. The data is a snapshot. It does not grow
while the app runs.

The layer rule (ADR 0004) forbids `src/lib/domain/` to import `src/data`,
so a domain function cannot read the real data to find the date by itself.

## Decision

- The as-of date is the latest `activity_date` in the transaction data, not
  today's date. With the committed data it is **`2024-04-26`**.
- Every recency value in the app uses this one date.
- The domain function `latestActivityDate(transactions)` returns the latest
  `activity_date` of an array. `YYYY-MM-DD` strings compare in date order,
  so it is a string maximum. It throws a `RangeError` on an empty array,
  because there is then no as-of date.
- The selectors layer computes the value once, at module load, and exports
  it as `asOfDate` (`src/lib/selectors/book.ts`).
- A contract test in the selectors layer pins `asOfDate` to `2024-04-26`.
  If a data change moves the date, CI fails, and the change has to update
  this ADR and the test on purpose.
- `daysSince(date, asOf)` takes the as-of date as a parameter, so domain
  tests use their own dates. It counts whole days in UTC, so the result
  does not depend on the time zone of the machine.

## Consequences

- Recency values are stable: they do not change from one day to the next
  while the data stays the same.
- The value follows the data. A regenerated dataset with later rows moves
  the as-of date without a code change, and the contract test reports it.
- The first selectors import costs one pass over 5,000 transactions at
  start-up.

## Alternatives considered

- **Today's date.** Rejected: the data ends in April 2024, so every customer
  would look inactive.
- **A constant `AS_OF_DATE = '2024-04-26'` in domain, guarded by a contract
  test.** First chosen, then rejected by the user in the F0 brainstorm in
  favor of the computed value. A hard-coded date does not follow the data.
- **Precomputed by `npm run data:build` into a generated file.** Rejected:
  it needs a converter change and a new generated file for one value that a
  single pass over the data gives at load time.
