# Customer 360

A banking Customer 360 web app: one view of a customer's profile, product
portfolio, and transactions. Built with React, TypeScript, Vite, Tailwind,
and shadcn/ui, on static data generated from an Excel workbook.

> Status: project bootstrap. Features are not built yet.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts: `npm run build`, `npm test`, `npm run lint`, `npm run typecheck`.

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

## Docs

- [`CLAUDE.md`](CLAUDE.md): project rules, folder structure, data notes.
- [`docs/adr/`](docs/adr/): architecture decisions.
