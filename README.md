# Customer 360

[![CI](https://github.com/rizkiafdl/customer-360/actions/workflows/ci.yml/badge.svg)](https://github.com/rizkiafdl/customer-360/actions/workflows/ci.yml)

Live: <https://rizkiafdl.github.io/customer-360/>

This repo has two purposes:

1. **The product.** A banking Customer 360 web app: one view of a customer's profile, product portfolio, and transactions. It is Part 3 of the OCBC Analytics Engineer technical assessment.
2. **The workflow.** A Claude Code setup that takes one feature request and delivers it to production. The request goes through spec, plan, test-first code, review, PR, CI, and deploy. A person answers the design questions at the start, and the agents do the rest.

## The workflow, measured

One feature was timed from the first prompt to the live deploy. The full numbers are in [`docs/report/measurement-workflow.md`](docs/report/measurement-workflow.md).

**Feature tested:** a Spotlight-style search (⌘K / Ctrl K). It has a frosted dialog, recent customers, quick filters with counts, keyboard navigation, light and dark themes, and full ARIA. The input was a reference HTML design and one prompt.

| Measure | Result |
| --- | --- |
| Prompt → merged | 69 min |
| Prompt → deployed | 72 min |
| Person's input | 2 messages, both in the first 4 min |
| Delivered | 2 PRs, 17 commits, 12 plan tasks, 800 unit tests and 24 e2e tests passing |
| Model calls | 538 (Opus 5.5: 190, Sonnet 5: 348) |
| Output tokens | 264k |
| Estimated API cost | ≈ $25 at list prices |
| GitHub CI | 4 runs, 9 min total, $0 (public repo) |

Where the time went: build 45%, spec and plan 21%, review and fix 14%, CI and ship 5%. The report breaks this down by phase, task, role, and model.

## The Claude Code setup

```text
person ──▶ brainstorm (main session asks the design questions)
            │
            ▼
         docs-writer ──▶ spec ──▶ plan (tasks + file lists)
            │
            ▼  for each task, in order
         test-writer ──▶ RED gate ──▶ implementer ──▶ GREEN gate ──▶ commit
            │
            ▼
         reviewer (whole branch, once) ──▶ fix pass (same gates)
            │
            ▼
         pr-shipper ──▶ PR ──▶ CI (checks, e2e) ──▶ rebase-merge ──▶ deploy
```

| Role | Model | Can edit | Job |
| --- | --- | --- | --- |
| orchestrator (main session) | Opus 5.5 in the measured run | everything | Runs the brainstorm, the gates, every commit, and every ruling. |
| `docs-writer` | Opus | `docs/` only | Writes the spec and the plan. |
| `test-writer` | Sonnet | test files only | Writes the failing tests for one task. |
| `implementer` | Sonnet | everything except tests | Makes those tests pass. |
| `reviewer` | Opus | nothing | Reviews the finished branch once. |
| `pr-shipper` | Sonnet | nothing | Pushes the branch, opens the PR, waits for CI, merges, and watches the deploy. |

**Guards.** The agents check each other. The setup does not trust any one agent.

- **Edit hook:** a `PreToolUse` hook (`scripts/agents/guard-paths.ts`) blocks an edit outside the agent's role. If the hook cannot start, the edit is also blocked.
- **Gates:** the RED and GREEN gates run the tests. They also run `scripts/agents/check-paths.ts` over the git diff, so an edit made through the shell is caught too.
- **Protected files:** only the orchestrator may edit `package.json`, the test configs, `scripts/agents/`, and `.claude/`. An agent cannot turn a test off through config.
- **Shipping:** permissions in `.claude/settings.json` allow pushes to feature branches only. Force-push, any push to `main`, and `--admin` are blocked. GitHub accepts a merge only when CI passes.
- **Commits:** commitlint checks Conventional Commits locally and in CI.

**Parallel work.** A feature can split into teams. Each team has its own git worktree and its own agents. Before two teams write code in parallel, the orchestrator checks that their plans share no file. In the measured run, the theme team and the search team ran side by side.

**Where it lives:**

- [`CLAUDE.md`](CLAUDE.md): the rules. Rule 8 is the flow, and Rule 11 is parallel work.
- [`.claude/agents/`](.claude/agents/): one file per agent.
- [`.claude/settings.json`](.claude/settings.json): plugins and permissions.
- [`scripts/agents/`](scripts/agents/): the path guard and the gate check.
- Spec: [agent teams design](docs/superpowers/specs/2026-11-24-agent-teams-design.md).

## The product

The user is a bank Relationship Manager (RM) who plans outreach across their customers.

| Route | Page | What it shows |
| --- | --- | --- |
| `/` | Portfolio | The book overall or per income band: AUM, loan exposure (never added to AUM), one tile per offer rule, product penetration, income vs AUM. |
| `/customers` | Customers | All customers in ranked order, with filters in the URL (`?rule=`, `?band=`, `?kyc=`, `?lacks=`, `?q=`) and a preview panel. |
| `/customers/:id` | Customer 360 | Profile, KPI tiles, and five tabs: Overview (offers with their evidence), Holdings, Loans, Activity, Transactions. |
| ⌘K anywhere | Spotlight | Search customers, filters, and pages. |

Every offer comes from a fixed rule with a stated threshold ([ADR 0008](docs/adr/0008-insight-rules-and-thresholds.md)). There is no scoring model. All dates count from the latest transaction in the data, 2024-04-26 ([ADR 0005](docs/adr/0005-as-of-date.md)).

### Run it

```bash
npm install
npm run dev      # http://localhost:5173/customer-360/
npm run check    # typecheck, lint, Markdown lint, unit tests, build
npm run e2e      # Playwright smoke test (run npm run build first)
```

### Tech stack

| Concern | Choice |
| --- | --- |
| Build | Vite 8 |
| UI | React 19, TypeScript (strict) |
| Styling | Tailwind CSS v4, shadcn/ui, Radix primitives |
| Charts / tables | Recharts, TanStack Table |
| Routing | React Router |
| Tests | Vitest, React Testing Library, Playwright |
| Data ingest | ExcelJS through `tsx` (dev only) |
| CI/CD | GitHub Actions → GitHub Pages |

The reasons for each choice are in [ADR 0002](docs/adr/0002-stack-choice.md).

## Repo map

| Path | Holds | Edited by |
| --- | --- | --- |
| `src/lib/` | All business logic as pure functions (see layers below). | implementer, test-writer (`*.test.ts`) |
| `src/components/` | Render-only UI, one folder per page: `portfolio/`, `customers/`, `customer/`. App-wide parts: top bar, Spotlight, theme toggle. | implementer, test-writer |
| `src/components/ui/` | shadcn/ui components, generated. | `npx shadcn add` |
| `src/pages/`, `src/routes.tsx` | Route-level pages and the route table. | implementer, test-writer |
| `src/data/` | JSON generated from the workbook. | `npm run data:build` only |
| `src/types/` | Record types and allowed values. | implementer |
| `src/test/` | Test setup and the small fixture dataset. | test-writer |
| `e2e/` | Playwright smoke tests against the built site. | test-writer |
| `data/raw/` | The source Excel workbook. | nobody (read-only) |
| `scripts/excel/` | The Excel → JSON converter. | implementer, test-writer |
| `scripts/theme/` | The WCAG contrast check for theme colors. | implementer, test-writer |
| `scripts/agents/` | The agent path guard and gate check. | orchestrator only |
| `docs/superpowers/specs/`, `plans/` | One spec and one plan per feature. Agents read these as their brief. | docs-writer |
| `docs/adr/` | Project-wide decisions (9 ADRs). | docs-writer |
| `docs/design-system/` | Design references (Claude Design export, the Spotlight mockup). | kept as received |
| `docs/report/` | Workflow measurements. | orchestrator |
| `.claude/` | Agent definitions and shared settings. | orchestrator only |
| `.github/` | CI workflow and Dependabot. | orchestrator |

**Code layers** (imports go one way only, and ESLint enforces it, [ADR 0004](docs/adr/0004-layered-code-structure.md)):

```text
pages / components  →  lib/selectors  →  lib/insights  →  lib/domain  →  types
   (render only)       (only reader of     (offer rules,     (AUM, holds,
                        src/data)           thresholds)       income rank)
```

## Tests

| Kind | Where | Checks |
| --- | --- | --- |
| Unit | `src/lib/**/*.test.ts` | Each business rule, on small fixtures. |
| Contract | `src/lib/selectors/*.test.ts`, `src/data/data.test.ts` | Counts pinned on the real 100 customers; the shape of the JSON. |
| Component | `src/components/**`, `src/pages/**`, `src/routes.test.tsx` | Rendering, links, keyboard, ARIA (React Testing Library). |
| End-to-end | `e2e/smoke.spec.ts` | Each page, the ⌘K search, theme switching, chart and touch-target checks on the built site (Playwright, Chromium). |
| Theme | `scripts/theme/*.test.ts` | WCAG contrast for each color pair, in both themes. |
| Converter | `scripts/excel/normalize.test.ts` | Excel parsing and validation rules. |
| Architecture | `eslint.config.test.ts` | A bad cross-layer import fails lint. |
| Agent guard | `scripts/agents/*.test.ts` | Which paths each agent role may edit. |
| Data drift (CI) | `ci.yml` | Regenerated JSON matches the committed JSON. |

CI runs `checks` (commit messages, typecheck, lint, Markdown lint, unit tests with coverage, data drift, build), then `e2e`. A merge to `main` also runs `deploy`. Details: [ADR 0003](docs/adr/0003-engineering-workflow.md).

## Data

The source is `data/raw/AE Test_1126.xlsx` (read-only). `npm run data:build` validates it and writes typed JSON to `src/data/`. The JSON is committed, so the app runs without the converter.

| Dataset | Sheet | Rows |
| --- | --- | --- |
| Profile | `profile` | 100 |
| Portfolio | `porto` | 1,576 |
| Transactions | `transaction` | 5,000 |

All three join on `customer_id`. Business definitions (AUM excludes loans, "holds" means amount > 0) are in [ADR 0006](docs/adr/0006-business-definitions.md).

## Read first

1. [`CLAUDE.md`](CLAUDE.md): the rules, the folder structure, and the data notes.
2. [`docs/report/measurement-workflow.md`](docs/report/measurement-workflow.md): what one feature cost in time, tokens, and CI.
3. [Product design spec](docs/superpowers/specs/2026-11-23-customer-360-product-design.md): what the app is for.
4. [Spotlight search spec](docs/superpowers/specs/2026-11-24-spotlight-search-design.md): an example of a spec the agents built from.
5. ADRs [0004](docs/adr/0004-layered-code-structure.md) (layers), [0008](docs/adr/0008-insight-rules-and-thresholds.md) (offer rules), and [0009](docs/adr/0009-visual-system-v2.md) (visual system).
