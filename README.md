# Customer 360

[![CI](https://github.com/rizkiafdl/customer-360/actions/workflows/ci.yml/badge.svg)](https://github.com/rizkiafdl/customer-360/actions/workflows/ci.yml)

Live: <https://rizkiafdl.github.io/customer-360/>

A banking Customer 360 web app: one view of a customer's profile, product
portfolio, and transactions. Built with React, TypeScript, Vite, Tailwind,
and shadcn/ui, on static data generated from an Excel workbook.

> Status: done. E0 and F0–F5 are built, tested, and deployed. F6 (a
> rules page) was planned but not built. ADR 0008 holds the same content.
> The redesign v2 (2026-11-24) replaced the worklist, the overview, and the
> sidebar with the pages below and a light theme by default
> ([ADR 0009](docs/adr/0009-visual-system-v2.md)).

## What it does

The user in the story is a bank Relationship Manager (RM) who plans
outreach across their customers.

| Route | Page | What it shows |
| --- | --- | --- |
| `/` | Portfolio | The book over all customers or one income band (`?band=`): customers, total AUM and loan exposure (never added together), customers with the KYC note, one tile per offer rule, held / not held per product, and income band vs AUM. Every tile and AUM product links to the filtered Customers list. |
| `/customers` | Customers | All customers in the ranked order, 25 per page, with a preview panel. Filter by offer rule (`?rule=`), income band (`?band=`), KYC note (`?kyc=`), product not held (`?lacks=`), or customer ID (`?q=`). Filters live in the URL. |
| `/customers/:id` | Customer 360 | Profile, KPI tiles, prev/next through the filtered list, and five tabs (`?tab=`): Overview (offers grouped by product, with the rules and evidence), Holdings, Loans, Activity, and Transactions. |
| `/overview` | — | Redirects to `/` (the old overview page became Portfolio). |

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
  - [0009](docs/adr/0009-visual-system-v2.md): the colors, fonts, and
    theme rules of the UI.
- [`docs/superpowers/specs/`](docs/superpowers/specs/): one spec per
  feature. Start with the
  [product design](docs/superpowers/specs/2026-11-23-customer-360-product-design.md).
- [`docs/superpowers/plans/`](docs/superpowers/plans/): the build plan for
  each feature.
