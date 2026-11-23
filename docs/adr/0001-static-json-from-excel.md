# 0001. Static JSON generated from the Excel file, no backend

- **Status:** Accepted
- **Date:** 2026-11-23

## Context

The app shows a Customer 360 view over three small datasets from the
assessment workbook `AE Test_1126.xlsx`: `profile` (100 rows), `porto` (1,576
rows), and `transaction` (5,000 rows). The data is fixed. Nobody writes to it,
and it changes only if a new workbook arrives.

The app is a portfolio piece. A reviewer must be able to clone the repo, run
`npm install && npm run dev`, and see it work with no database, API keys, or
running services. It should also deploy to any static host.

The workbook has quirks that a browser should not have to handle at runtime:
two different names for the customer ID column, ~100k empty trailing rows,
Excel date serials, and a few nulls.

## Decision

1. Commit the raw workbook to `data/raw/AE Test_1126.xlsx` and treat it as
   read-only. The user confirmed on 2026-11-23 that the data can be public.
2. Convert it at development time with `npm run data:build`
   (`scripts/excel-to-json.ts`, using `exceljs` through `tsx`). The converter
   writes one JSON file per data sheet to `src/data/`: `profiles.json`,
   `portfolio.json`, `transactions.json`.
3. Commit the generated JSON. `npm run build` and `npm run dev` do not need
   to run the converter first.
4. The app imports the JSON at build time through `src/data/index.ts`, typed
   with the interfaces in `src/types/`. Vite bundles it.
5. The converter does shape cleaning only: skip empty rows, check headers,
   trim text, map empty cells to `null`, rename `customerid` to `customer_id`,
   format dates as `YYYY-MM-DD`, and fail on unknown enum values, duplicate
   profile IDs, or orphan customer IDs. It keeps nulls, zeros, and negative
   amounts as they are. Business cleaning happens in tested functions in
   `src/lib/`.
6. No backend, no database, and no runtime fetch.

## Consequences

- The app runs and deploys as static files. There are no services to run or secure.
- Total JSON is ~1.1 MB raw. That is fine for this size. The bundle is
  ~320 kB JS (~100 kB gzip) before features.
- The JSON in git is a reviewable snapshot. A data change shows as a diff.
- Generated JSON can drift from the converter if someone edits it by hand.
  `src/data/data.test.ts` checks row counts, ID links, enum values, and date
  format, and CLAUDE.md forbids hand edits.
- A new workbook needs a manual `npm run data:build` and a commit.
- If the data grows a lot (for example, millions of transactions), this
  decision must be revisited (lazy-loaded chunks, or a real API).

## Alternatives considered

- **Backend API + database** (for example, Express + DuckDB/SQLite). Rejected:
  it adds a service to run and host for read-only data of ~7k rows, and makes
  the repo harder for a reviewer to run.
- **Parse the xlsx in the browser** (SheetJS at runtime). Rejected: it ships a
  large parser and an 850 kB workbook to every visitor, and moves validation
  failures from build time to the user's screen.
- **Use the CSV exports in `../../dataset/`.** Rejected: the workbook is the
  original source. The CSVs are a derived copy outside this repo.
- **Do not commit the JSON; generate it in `prebuild`.** Rejected for now: it
  makes every build depend on the converter and hides data changes from diffs.
