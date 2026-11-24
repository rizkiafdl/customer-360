# Customer 360 — project guide

## Purpose

A banking **Customer 360** web app: pick one customer and see their profile,
product portfolio ("porto"), and transactions in one place. It answers Part 3
of the OCBC Analytics Engineer technical assessment ("create a simple
customer 360 web app (React app)" with Profile, Porto, Trx, and filter per
customer).

It is also a **portfolio piece for recruiters**. Code quality, tests, clear
docs, and a clean git history matter as much as the features. Reviewers will
read the repo, not only run the app.

## Stack

| Concern | Choice |
| --- | --- |
| Build / dev server | Vite 8 |
| UI | React 19 + TypeScript 6 (`strict`, `noUncheckedIndexedAccess`) |
| Styling / components | Tailwind CSS v4 + shadcn/ui (style `radix-nova`, base color neutral, lucide icons) |
| Font | Inter (body) and Space Grotesk (headings, large numbers), `@fontsource-variable/inter` and `@fontsource-variable/space-grotesk` |
| Charts | Recharts |
| Tables | TanStack Table |
| Routing | React Router (library mode: `createBrowserRouter` + `RouterProvider`) |
| Tests | Vitest + React Testing Library + jsdom (+ jest-dom matchers) |
| Lint | ESLint 10 (typescript-eslint, react-hooks, react-refresh) |
| Data ingest | `exceljs` run through `tsx` (dev dependencies only) |

The reasons for each choice are in `docs/adr/0002-stack-choice.md`.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server. |
| `npm run build` | Typecheck (`tsc -b`) then build to `dist/`. |
| `npm run test` | Run all Vitest tests once. `npm run test:watch` for watch mode. |
| `npm run lint` | ESLint over the whole repo. |
| `npm run typecheck` | `tsc -b` for app code (`tsconfig.app.json`) and Node code (`tsconfig.node.json`). |
| `npm run data:build` | Regenerate `src/data/*.json` from `data/raw/AE Test_1126.xlsx`. |
| `npm run preview` | Serve the production build. |
| `npm run check` | typecheck → lint → lint:md → test → build. |
| `npm run lint:md` | markdownlint over every `*.md` file (`.markdownlint-cli2.jsonc`). |
| `npm run test:coverage` | Vitest with the v8 coverage table (reported, not enforced). |
| `npm run e2e` | Playwright smoke test against `dist/`. Run `npm run build` first. |

`npm run check` must pass before every push. CI runs the same checks plus the
e2e smoke test (`docs/adr/0003-engineering-workflow.md`).

## Folder structure

```text
data/raw/AE Test_1126.xlsx   Raw source workbook. READ-ONLY: never edit, re-save, or reformat it.
scripts/
  excel-to-json.ts           Entry point for `npm run data:build` (file I/O only).
  excel/normalize.ts         Pure parsing/validation functions used by the converter.
  excel/normalize.test.ts    Unit tests for the converter logic.
  theme/contrast.ts          OKLCH → sRGB and WCAG contrast, used by the theme contrast test.
  theme/contrast.test.ts     Checks every token pairing in src/index.css, both themes (ADR 0009).
src/
  data/                      GENERATED JSON (committed) + index.ts (typed exports).
    profiles.json            100 rows  (sheet `profile`)
    portfolio.json           1,576 rows (sheet `porto`)
    transactions.json        5,000 rows (sheet `transaction`)
    index.ts                 `profiles`, `portfolio`, `transactions` typed arrays.
    data.test.ts             Contract test on the committed JSON.
  types/                     Record types + allowed-value constants (one file per dataset).
  lib/                       Business logic: pure, tested functions. `utils.ts` is shadcn's `cn`.
    format.ts                `formatIDR()` and `formatIDRShort()` — the only money formatters. Date and percent labels.
    theme.ts                 Light/dark switch, light by default (`readStoredTheme`, `applyTheme`). ADR 0009.
    domain/                  Business definitions (AUM, holds, bank entries, income rank, days since). ADR 0006.
    selectors/               The only importers of `src/data`. Pure `fn(dataset)` + bound exports (`asOfDate`). One per page: `portfolio.ts`, `customers.ts`, `customer360.ts`.
    insights/                Insight rules, KYC note, offers by product, and the ranking. Every cut-off lives in `thresholds.ts`. ADR 0008.
  components/ui/             shadcn/ui generated components (add with `npx shadcn@latest add <name>`).
  components/                App components (render only): top bar (app shell), search, theme toggle.
  components/portfolio/      Portfolio (`/`): band chips, opportunity tiles, penetration list, income-vs-AUM scatter.
  components/customers/      Customers (`/customers`): filters, the paged table, the preview panel.
  components/customer/       Customer 360 (`/customers/:id`): header, nav, KPI tiles, tab content (offers, charts, tables).
  pages/                     Route-level components (render only).
  routes.tsx                 Route table, shared by `main.tsx` and tests.
  test/setup.ts              Vitest setup (jest-dom matchers, RTL cleanup, jsdom polyfills).
  test/fixtures.ts           Small hand-made `Dataset` for selector and UI tests.
e2e/                         Playwright smoke tests against the built site.
eslint.config.test.ts        Proves the ESLint layer rule blocks bad imports (ADR 0004).
.github/                     CI workflow (checks → e2e → deploy) and Dependabot.
docs/adr/                    Architecture Decision Records (project-wide decisions).
docs/superpowers/specs/      Feature specs, written by the Superpowers brainstorming skill.
docs/superpowers/plans/      Implementation plans, written by the Superpowers writing-plans skill.
.claude/settings.json        Shared Claude Code config (superpowers plugin; push/PR/merge permissions for pr-shipper).
.claude/agents/pr-shipper.md Agent that pushes a branch, opens the PR, waits for CI, and rebase-merges.
```

Import alias: `@/` maps to `src/` (configured in `tsconfig.json`,
`tsconfig.app.json`, `tsconfig.node.json`, and `vite.config.ts`).

## Rules

1. **Business logic lives in `src/lib/` as pure, tested functions. Components only render.**
   - "Business logic" means any calculation, aggregation, filter, sort rule,
     classification, or derived value (totals, AUM, counts per category,
     "is this a loan", date bucketing, and so on).
   - Each function in `src/lib/` has a co-located `*.test.ts` file.
   - Components and pages call `src/lib/` functions and render the result. They
     do not compute business values inline.
   - **Layers, one-way imports** (ADR 0004, enforced by `npm run lint`):
     UI (`pages/`, `components/`, `routes.tsx`, `main.tsx`) → `lib/selectors/`
     → `lib/insights/` → `lib/domain/` → `types/`. Shared helpers
     (`lib/format.ts`, `lib/utils.ts`) are usable from any layer and import
     nothing from `src/`.
   - Only `src/lib/selectors/` imports `src/data`. No layer imports a layer
     above it. Skipping layers downward is allowed (UI may import a domain
     constant). Test files follow their layer's rule.
   - Domain and insight functions take plain arrays (one customer's rows), so
     their tests use small fixtures. Contract tests on the real data live in
     `src/lib/selectors/`.
2. **Money is IDR and always goes through `formatIDR()` or `formatIDRShort()`** from `src/lib/format.ts`.
   - `formatIDR()` is the full form (`Rp 1.384.200.000`). `formatIDRShort()`
     is for tiles and chart labels (`Rp 1,4 M`), and the full value is
     always shown next to it in a tooltip.
   - Never call `Intl.NumberFormat` or `toLocaleString` for money anywhere else.
   - Never hard-code `Rp` strings.
3. **Never invent business thresholds. Ask the user.**
   - Examples of thresholds: what counts as a "high-value" customer, an
     "active" customer, a "large" transaction, a date cut-off, a risk band, or
     how to classify the products that appear in both FUNDING and LOAN.
   - If a feature needs a threshold or a business definition that the data or
     the user has not given, stop and ask. Do not pick a "sensible default".
4. **Every feature gets a spec. Only project-wide decisions get an ADR.**

   | | Spec | ADR |
   | --- | --- | --- |
   | Scope | One feature | The whole project |
   | Answers | What are we building? | Why did we choose this? |
   | How often | Every feature | Rarely. Only when a decision affects the whole project and is hard to reverse. |
   | Where | `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` | `docs/adr/NNNN-title.md` |
   | Format | The Superpowers default. Do not customize it. | The short template below. |

   - **Specs:** the Superpowers `brainstorming` skill writes and commits the
     spec. The `writing-plans` skill then writes the plan to
     `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`. Use these skills
     as they are. Do not add, remove, or rename spec sections.
   - **ADRs:** use the next free 4-digit number and a kebab-case title.
     Sections: Status, Context, Decision, Consequences, Alternatives considered.
     This is Michael Nygard's ADR format plus an "Alternatives considered"
     section.
   - Examples of project-wide decisions: data shape changes, new
     dependencies with wide reach, state management, deployment target.
   - If a feature spec makes a project-wide decision, write an ADR for that
     decision too, and link the ADR from the spec.
5. **The raw workbook is read-only.** `data:build` only reads it. To change the
   data, change the converter, never the file.
6. **Do not hand-edit `src/data/*.json`.** Change `scripts/excel/normalize.ts`,
   then run `npm run data:build` and commit the regenerated JSON.
7. **Commits use Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`,
   `test:`, `refactor:`, `build:`, `ci:`). The author is the repo owner only:
   no `Co-Authored-By` trailer, also in subagent commits. A local
   `commit-msg` hook and CI enforce this with commitlint.
8. **Each feature follows one flow, on its own branch** (`feat/<feature>`, or
   `ci/`, `docs/`, `chore/`, `fix/<topic>`):
   1. `brainstorming` → feature spec (approved by the user, then committed).
   2. `writing-plans` → plan.
   3. `executing-plans` in the main session, or one implementer subagent
      for the whole feature, runs the plan. There is no review after each
      task; TDD is the per-task gate.
   4. `verification-before-completion` (one `npm run check`) and one
      `requesting-code-review` over the whole branch.
   5. `finishing-a-development-branch` → PR. The main session is the
      orchestrator: it writes the PR body to the scratchpad, then dispatches
      the `pr-shipper` agent (`.claude/agents/pr-shipper.md`) with the
      branch, title, and body file. The agent pushes, opens the PR, waits
      for `checks` and `e2e`, rebase-merges only when both pass, and
      watches the deploy. If CI fails, it stops and reports; the
      orchestrator fixes the branch and dispatches it again. The agent never
      edits code, force-pushes, or uses `--admin`, and the `main` ruleset
      still rejects any merge that CI has not passed.

   If the feature has an ADR, the brainstorm makes the decision, and the ADR
   is task 1 of the plan. It goes in the same PR as the code, and the feature
   spec links to it.
9. **Copy rule for insight and rules text.** No AI-style filler.
   - A reason is the fired rule plus its evidence numbers. Nothing else.
   - No adjectives, no advice tone, no exclamation marks, no generated text.
   - Money goes through `formatIDR()` (Rule 2).
   - Text is built from fixed templates in `src/lib/insights/`, so tests
     check exact strings.
   - ✗ "Great opportunity to grow this customer's wealth with mutual funds!"
     ✓ "No REKSA. AUM Rp 1.384.200.000, 92% in savings."
10. **All UI follows the visual system** in
    `docs/superpowers/specs/2026-11-24-redesign-v2-design.md`
    section 6 and ADR 0009 (which supersedes ADR 0007).
    - Colors live only as CSS variables in `src/index.css`. No hex, `rgb()`,
      or `oklch()` in `src/components/` or `src/pages/`.
    - Brand red is for primary buttons, active nav, and the focus ring. It is
      never a risk color, a chart series, or a large surface.
    - LOAN is never added to or stacked with AUM.

## Data model

All three datasets join on `customer_id`. The raw sheets call it
`customer_id` (profile) and `customerid` (porto, transaction). The converter
renames all of them to `customer_id`.

- `Profile`: `customer_id`, `gender` (`'M' | 'F' | null`), `customer_income` (8 ordered bands, `INCOME_BANDS`).
- `PortfolioItem`: `customer_id`, `product` (`string | null`), `product_category` (`FUNDING | LOAN | ORI | BANCA | REKSA`), `amount` (`number | null`).
- `Transaction`: `activity_date` (`YYYY-MM-DD`), `customer_id`, `transaction_method` (12 values), `transaction_type` (14 values), `transaction_amount` (`number`).

### What the converter does and does not clean

The converter does **shape cleaning** only:

- skips fully empty rows (the raw sheets report ~16k and ~93k rows, but only 1,577 and 5,001 are non-empty),
- checks the header row of each sheet,
- trims text and maps empty cells to `null`,
- renames `customerid` → `customer_id`,
- converts dates to `YYYY-MM-DD` and rejects dates that carry a time,
- rejects values outside the allowed lists in `src/types/`,
- rejects duplicate profile IDs and porto/transaction IDs that are not in profile.

It does **no business cleaning**. These raw facts stay in the JSON as they are,
and any treatment of them belongs in `src/lib/` (and needs a user decision under Rule 3):

- 1 null `gender` (customer 4857).
- 1 null `product` (customer 4426, LOAN).
- 5 null porto `amount` values (GIRO/GIROSYARIAH under LOAN).
- 428 porto rows with `amount` 0.
- GIRO, GIROSYARIAH, and MULTI CURRENCY appear under both FUNDING and LOAN.
- 32 negative transactions (all CREDIT CARD / OTHERS), 2 zero transactions (BRANCH / OTHERS).
- 180 transactions with decimals; 483 transactions below 1,000 IDR (some as low as 7.9). Many are BUNGA/PAJAK; some card payments may be foreign currency. Unconfirmed.
- Dates range 2011-01-27 to 2024-04-26, but 87% of rows fall in March–April 2024.
- 14 customers have no porto rows. Every customer has transactions.

Data decisions: `docs/adr/0001-static-json-from-excel.md`.

Business definitions (AUM excludes LOAN, holds = `amount > 0`, bank entries =
`BUNGA`/`BIAYA`/`PAJAK`/`DENDA`, high income = income rank ≥ 5, never sum
transactions as a net flow): `docs/adr/0006-business-definitions.md`, code in
`src/lib/domain/`. The as-of date is the latest `activity_date`
(`2024-04-26`), never today: `docs/adr/0005-as-of-date.md`.

Insight rules (cash-heavy, investment gap, no AUM, high income without
BANCA), the KYC income-band note, the rule order, and every
threshold with its source: `docs/adr/0008-insight-rules-and-thresholds.md`,
code in `src/lib/insights/` (thresholds only in `thresholds.ts`). The
selectors in `src/lib/selectors/insights.ts` pin each fire count on the
real data.
