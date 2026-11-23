# Customer 360

[![CI](https://github.com/rizkiafdl/customer-360/actions/workflows/ci.yml/badge.svg)](https://github.com/rizkiafdl/customer-360/actions/workflows/ci.yml)

Live: <https://rizkiafdl.github.io/customer-360/>

A banking Customer 360 web app: one view of a customer's profile, product
portfolio, and transactions. Built with React, TypeScript, Vite, Tailwind,
and shadcn/ui, on static data generated from an Excel workbook.

> Status: project bootstrap. Features are not built yet.

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
- [`docs/adr/`](docs/adr/): architecture decisions.
