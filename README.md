# Customer 360

[![CI](https://github.com/rizkiafdl/customer-360/actions/workflows/ci.yml/badge.svg)](https://github.com/rizkiafdl/customer-360/actions/workflows/ci.yml)

Live: <https://rizkiafdl.github.io/customer-360/>

A banking Customer 360 web app: one view of a customer's profile, product
portfolio, and transactions. Built with React, TypeScript, Vite, Tailwind,
and shadcn/ui, on static data generated from an Excel workbook.

> Status: done. E0 and F0–F5 are built, tested, and deployed. F6 (a
> rules page) was planned but not built. ADR 0008 holds the same content.

## What it does

The user in the story is a bank Relationship Manager (RM) who plans
outreach across their customers.

| Route | Page | What it shows |
| --- | --- | --- |
| `/` | Worklist | Customers with an offer opportunity, ranked, each with its top reason. Filter by opportunity type (`?rule=`) or customer ID (`?q=`). Filters live in the URL. |
| `/customers/:id` | Customer 360 | Profile, KPI tiles, "What to offer" panel with the rule and evidence for each offer, holdings, activity charts, bank entries, and all transactions. |
| `/overview` | Overview | Total AUM and total loan exposure (never added together), customers per opportunity type (each links to the filtered worklist), product penetration, and income band vs AUM. |

Every offer comes from a fixed rule with a stated threshold. There is no
scoring model. The rules, thresholds, and their sources are in
[ADR 0008](docs/adr/0008-insight-rules-and-thresholds.md). All dates are
relative to the latest transaction date in the data (2024-04-26), not
today ([ADR 0005](docs/adr/0005-as-of-date.md)).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173/customer-360/
```

Other scripts: `npm run build`, `npm test`, `npm run lint`, `npm run typecheck`,
`npm run check` (all checks), and `npm run e2e` (Playwright smoke test; run
`npm run build` first).

## Data

The source is `data/raw/AE Test_1126.xlsx` (read-only). `npm run data:build`
validates it and writes typed JSON to `src/data/`. The generated JSON is
committed, so you do not need to run the converter to start the app.

| Dataset | Sheet | Rows | Output |
| --- | --- | --- | --- |
| Profile | `profile` | 100 | `src/data/profiles.json` |
| Portfolio | `porto` | 1,576 | `src/data/portfolio.json` |
| Transactions | `transaction` | 5,000 | `src/data/transactions.json` |

All three join on `customer_id`.

## Workflow

- `main` accepts changes only through pull requests, merged with rebase merge
  (linear history).
- CI (GitHub Actions) runs `checks` (commit messages, typecheck, lint,
  Markdown lint, unit tests with coverage, data drift, build) and then `e2e`
  (Playwright smoke test on the build). A merge to `main` also runs `deploy`
  to GitHub Pages.
- Details: [`docs/adr/0003-engineering-workflow.md`](docs/adr/0003-engineering-workflow.md).

## Docs

- [`CLAUDE.md`](CLAUDE.md): project rules, folder structure, data notes.
- [`docs/adr/`](docs/adr/): architecture decisions. Good first reads:
  - [0004](docs/adr/0004-layered-code-structure.md): the code layers and
    the lint rule that enforces them.
  - [0006](docs/adr/0006-business-definitions.md): AUM, "holds", bank
    entries, and high income.
  - [0008](docs/adr/0008-insight-rules-and-thresholds.md): the offer
    rules and every threshold.
- [`docs/superpowers/specs/`](docs/superpowers/specs/): one spec per
  feature. Start with the
  [product design](docs/superpowers/specs/2026-11-23-customer-360-product-design.md).
- [`docs/superpowers/plans/`](docs/superpowers/plans/): the build plan for
  each feature.
