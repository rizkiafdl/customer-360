# Customer 360 — product design

- **Date:** 2026-11-23
- **Status:** Draft, waiting for user review
- **Scope:** the whole product. This doc does not specify any single feature
  in detail. Each feature listed in section 7 gets its own brainstorm, spec,
  plan, and branch.

## 1. Intent

### 1.1 What this is

A Customer 360 web app for a bank **Relationship Manager (RM)**. For one
customer it answers four questions:

1. Who is this customer?
2. What do they hold?
3. How do they behave?
4. What should I offer next, and why?

It answers Part 3 of the OCBC Analytics Engineer assessment ("simple
customer 360 web app (React app)" with Profile, Porto, Trx, and filter per
customer).

### 1.2 Who reads it

- **Primary user (in the story): the RM.** The RM's job in this app is
  **planning outreach across their book**: "which customers have an offer
  opportunity, and what is the reason?" The detail page supports that job
  and also works on its own when the RM already knows which customer to
  look at.
- **Real audience: recruiters and reviewers.** The repo is a portfolio
  piece. Business reasoning counts as much as the UI. A reviewer must be
  able to see, for every number and every suggestion, which rule produced
  it and why that rule is defensible with this data.

### 1.3 What success looks like

- An RM can open the app, see a ranked list of customers with offer
  opportunities, read the reason for each, and open one customer to check
  the evidence.
- Every insight shows its rule and its evidence numbers.
- Definitions agree with Parts 1 and 2 of the assessment (same AUM, same
  "holds", same "high income").
- A reviewer can read the rules page (F6) and understand every rule, its
  threshold, its source, and the data limits, without reading code.
- The repo applies standard engineering practice: every change is checked
  by CI (typecheck, lint, unit tests, build, e2e smoke test), and every change on `main`
  is built and deployed automatically to a public URL on GitHub. Details
  in section 10 (engineering workflow).

## 2. Goals, non-goals, anti-goals

### 2.1 Goals

- Explainable, rule-based offer opportunities, one pure function per rule.
- A clean split between data, business logic, data access, and UI (ADR
  0004, see section 6).
- Every threshold comes from the user or from the Part 1 and Part 2
  analysis of this assessment (CLAUDE.md Rule 3).

### 2.2 Non-goals

- **No urgency or "this week" view.** The data has no contact history, no
  RM assignment, and no trend over time (section 3). The worklist ranks by
  opportunity, not by urgency.
- **No contact tracking, notes, or CRM state.** Nothing is written back.
- **No predictive model or score.** 100 customers and no campaign response
  data. Rules only.
- **No revenue estimate per opportunity.** There are no margins (same limit
  as Part 2 Q1).
- **No full KPI dashboard.** It is cut down to the summary strip (F5).
- No backend, no auth, no runtime fetch (ADR 0001).

### 2.3 Anti-goals (failure even if it works)

- **A threshold nobody decided.** Every threshold has a recorded source.
- **AI-style filler text** in insights (F3) or on the rules page (F6). See
  the copy rule in section 5.4.
- **Numbers that disagree with Part 2.** For example an AUM that includes
  loans, or a "holds" that counts zero balances.
- **A rule that fires for almost everyone or for nobody** and is shown
  anyway as if it were a signal. F6 shows how many customers each rule
  fires for, so the reader can judge the spread. (This is a display
  requirement, not a cut-off.)

## 3. Data reality

Source: `src/data/*.json`, generated from `data/raw/AE Test_1126.xlsx`
(ADR 0001). Field-level facts are in CLAUDE.md "Data model". The facts
below are the ones that shape the product. Counts were measured on
2026-11-23 against the committed JSON.

| Fact | Consequence for the product |
| --- | --- |
| Profile has only `gender` and `customer_income` (8 ordered bands). 1 customer has null `gender` (4857). | "Who is this customer" is thin. Show both fields, show null as not recorded. |
| Portfolio is a **snapshot**: one row per customer per product, no dates. | No balance trend. Holdings are "as of" the snapshot. |
| The meaning of the LOAN `amount` (outstanding or limit) is unknown. | Call it **loan exposure**. Never add it to AUM. Never use it as a reason to call. |
| `GIRO`, `GIROSYARIAH`, `MULTI CURRENCY` exist in both FUNDING and LOAN. | Always group by `product_category`, or by `(product_category, product)`. Never by `product` alone. |
| 428 portfolio rows have `amount` 0; 83 customers have at least one. | "Holds" = `amount > 0` (Part 2). Zero-balance products are not a signal: almost everyone has one. |
| 14 customers have no portfolio rows. 16 customers have AUM 0. | Empty states are normal, not errors. |
| 87% of transactions fall in Mar–Apr 2024. Range 2011-01-27 to 2024-04-26. | Activity views show Mar–Apr 2024 in detail. Older rows exist but are sparse. |
| The latest `activity_date` is 2024-04-26. | **As-of date = 2024-04-26**, not today. All "days since" use it (ADR 0005). |
| Transactions have no debit/credit direction. Only 32 rows are negative. | Never sum amounts as a net flow. Show volume as "amount", not "inflow" or "outflow". |
| `BUNGA`, `BIAYA`, `PAJAK` (and `DENDA`) are bank entries, not customer actions. `BUNGA`/`PAJAK` direction is unclear (Part 2 analysis). | Split transactions into **customer-initiated** and **bank entries**. Behavior views use customer-initiated only. |
| The `BANCA` transaction method is used by 97 customers, including customers with no BANCA holding (Part 2 analysis). | The `BANCA` method is not a channel-preference signal. |
| Every customer has a customer-initiated transaction within 7 days of 2024-04-26. | **No dormancy rule.** Recency is shown as a fact only. |
| Only 1 customer has `DENDA` (3 rows on 2024-04-16). | **No penalty rule.** Show it in the detail page's bank-entries view. |

## 4. Approaches

### 4.1 What job the RM does (decided: B)

| Option | Landing page | Outcome |
| --- | --- | --- |
| A. Prepare for one customer | Detail page; list is only navigation | Kept as the detail page (F1), not as the main job. |
| **B. Plan outreach across the book** | Ranked opportunity worklist with reasons | **Chosen.** Shows business reasoning best and gives the rules a visible job. Limited to "what to offer and why", because the data cannot support urgency. |
| C. Report on the book | KPI dashboard | Rejected as the main page: most common, least distinctive. Kept as a small summary strip (F5). |

### 4.2 How the code is split (decided: option 1, layers by folder)

| Option | Outcome |
| --- | --- |
| **1. Layers by folder with one-way imports** | **Chosen.** See section 6. Matches CLAUDE.md Rule 1. Cost: one feature's code lives in about three folders. |
| 2. Feature folders (`src/features/<name>/{logic,ui}`) | Rejected. The rules are shared by F3, F4, F5, F6, so most logic would move to a shared folder anyway. It also breaks CLAUDE.md Rule 1. |
| 3. A state store (Zustand, Redux selectors) | Rejected. Data is static. ADR 0002 rules out a global state library. |

### 4.3 Engineering workflow

Decided options and rejected alternatives are in section 10.1.

## 5. Product decisions already made

### 5.1 Definitions reused from Part 2

Source: the Part 2 analysis of this assessment (Q1 revenue contributor, Q2
high-income product use).

| Term | Definition |
| --- | --- |
| **AUM** | Sum of `amount` over FUNDING + ORI + BANCA + REKSA. Excludes LOAN. Null `amount` counts as 0. |
| **Loan exposure** | Sum of `amount` over LOAN. Shown next to AUM, never added to it. |
| **Total balance** | AUM + loan exposure. Used only where Part 2 used it. Never called AUM. |
| **Holds a product** | `amount > 0`. |
| **High income** | `income_rank >= 5`, i.e. `>10 Juta` per month and above. 18 of 100 customers. Rank 1 = `sd. 1 Juta`, rank 8 = `>100 Juta` (order of `INCOME_BANDS`). |

### 5.2 Signals: kept, reframed, cut

Counts are for the 100 customers. "Needs" means the threshold or list is not
decided yet; it is asked in the F2 brainstorm.

| Signal | Status | Evidence | Needs |
| --- | --- | --- | --- |
| Investment gap per category (no ORI / no BANCA / no REKSA) | **Rule** | Missing ORI 54, BANCA 46, REKSA 46. | Whether the rule needs a minimum AUM to fire. |
| Cash-heavy AUM (most AUM in savings, giro, multi currency) | **Rule** | 12 customers have ≥ 80% of AUM in non-deposit FUNDING products (measured with a provisional product grouping). Median 18%. | The share cut-off, and which FUNDING products count as "savings" vs "deposit" (for example `TAKA`, `MULTI CURRENCY`, `GIRO`). |
| High income without BANCA | **Rule** | 6 of 18 high-income customers. Part 2: BANCA has the highest lift for high income (directional, not significant). | Nothing new; uses 5.1. Reason text must not overstate the Part 2 result. |
| No AUM relationship (AUM = 0) | **Rule** | 16 customers. | Nothing new. |
| Value tier by AUM | **Classification** (used to rank and filter) | Median AUM Rp 1.38 Bn; 16 at 0; 16 at ≥ Rp 5 Bn. Part 1 used `≥ Rp 10 jt` and `≥ Rp 100 jt` as cut-offs. | The tier names and band edges. |
| Income band below AUM | **Reframed** as a "check the KYC income band" note, not a ranking signal | 43 customers have income `≤5 Juta` and AUM `≥ Rp 1 Bn`. | The AUM level and income band that trigger the note. |
| Digital share | **Context only** (how to reach the customer) | p10 26%, p90 57% (customer-initiated, `BANCA` method excluded, provisional channel list). | Which methods count as digital (for example `VELOCITY`). |
| Loan exposure larger than AUM | **Context only** | 58 customers. | Nothing. |
| Dormancy / recency | **Cut as a rule**, recency shown as a fact | 0 customers inactive > 7 days. | Nothing. |
| DENDA penalty | **Cut as a rule**, shown in bank entries | 1 customer. | Nothing. |
| Zero-balance products | **Cut** | 83 customers. | Nothing. |
| Fee payer | **Cut** | 100 customers. | Nothing. |

### 5.3 Insight contract

Every rule in `src/lib/insights/` is a pure function with the same output
shape. The exact type is the F2 builder's call; it must carry:

- whether the rule fired,
- the rule's id and its plain-language rule text (the condition, with the
  threshold value),
- the evidence values that made it fire (numbers, product categories),
- the reason text, built from a fixed template and the evidence.

All threshold values live in one module with a comment naming the source of
each value (user decision with date, or the Part 1 or Part 2 analysis).

### 5.4 Copy rule for insight text (F3) and the rules page (F6)

The user asked for no AI-style filler text. Rule:

- A reason = the fired rule + its evidence numbers. Nothing else.
- No adjectives, no advice tone, no exclamation marks, no generated text.
- Money goes through `formatIDR()`.
- Text is built from fixed templates in `src/lib/insights/`, so tests check
  exact strings.

Example:

- ✗ "Great opportunity to grow this customer's wealth with mutual funds!"
- ✓ "No REKSA. AUM Rp 1.384.200.000, 92% in savings."

This rule is added to CLAUDE.md in F0, so it binds every later feature.

## 6. Code structure (ADR 0004)

```text
src/data/            typed JSON (exists)              no logic
src/lib/domain/      F0: constants, types, pure       no import of src/data
                     calculations
src/lib/insights/    F2: one file per rule, plus      no import of src/data
                     the thresholds module
src/lib/selectors/   data access: filter by           the only layer that
                     customer_id, call domain and     imports src/data
                     insights, return one view
                     model per screen
src/pages/, src/components/   render only             call selectors
```

- Imports go one way: UI → selectors → insights → domain → types.
  `src/lib/format.ts` is usable from any layer.
- Domain and insight functions take plain arrays, so tests use small
  hand-made fixtures, not the full dataset.
- UI tests pass a fixed view model.
- ESLint `no-restricted-imports` enforces the direction. For example, a
  component that imports `src/data` fails `npm run lint`.
- My proposal, for the F0 builder to confirm: selectors are written as pure
  functions that take the dataset as an argument
  (`buildCustomer360(dataset, id)`), plus a thin export bound to the real
  data (`getCustomer360(id)`). Lookups by `customer_id` use maps built once
  at module load.

### 6.1 Routes

| Route | Content | Feature |
| --- | --- | --- |
| `/` | Summary strip + opportunity worklist | F5, F4 |
| `/customers/:id` | Customer 360 detail + "what to offer" panel | F1, F3 |
| `/rules` | How the rules work | F6 |

Worklist filters and sort live in URL search params (ADR 0002). All routes
sit under the base path `/customer-360/` (section 10).

## 7. Features, in build order

Each feature is small enough for its own brainstorm → spec → plan → branch.
"Open questions" are asked in that feature's brainstorm, not here.

### E0. Engineering workflow

- **What:** the CI/CD pipeline, test tooling, and GitHub settings in
  section 10.
- **Depends on:** nothing. It comes first, so F0–F6 all go through PRs
  with CI.
- **ADRs written here:** 0003.
- **Open questions:** none at product level. The builder checks that the
  `simple-git-hooks` `prepare` script runs under npm 11's install-script
  restrictions.
- **Done when:** the E0 PR is green on `checks` and `e2e`, its merge
  deploys the site to `https://rizkiafdl.github.io/customer-360/`, and the
  `main` rule (10.4) is active.

### F0. Domain foundation

- **What:** the layer structure (section 6), the ESLint import rules, and
  `src/lib/domain/`: constants (`AS_OF_DATE`, AUM categories, bank-entry
  types, digital methods), types, and pure functions (`customerAum`,
  `loanExposure`, `isHeld`, `isCustomerInitiated`, `daysSince`, and so on).
  Adds the copy rule (5.4) and the layer rule to CLAUDE.md.
- **Depends on:** nothing.
- **ADRs written here:** 0004, 0005, 0006.
- **Open questions:** whether `DENDA` counts as a bank entry (my proposal:
  yes); which methods are digital (can be deferred to F2 if F0 does not
  need it); whether `AS_OF_DATE` is a constant or computed from the data
  (my proposal: computed, with a test that it equals `2024-04-26`).
- **Done when:** functions are tested, lint enforces the layers, CI is
  green on the PR.

### F1. Customer 360 detail

- **What:** route `/customers/:id`. Profile; holdings by category with AUM
  and loan exposure shown apart; activity from customer-initiated
  transactions (channel mix, type mix, recency, Mar–Apr 2024 timeline);
  bank entries shown apart. A customer selector, so the app meets the
  assessment's "filter per customer" before F4 exists (my call).
- **Depends on:** F0.
- **Open questions:** layout; which charts; how to show the 14 customers
  with no portfolio rows and the null gender; how to show the 661
  pre-2024 transactions.
- **UI foundation (decided here, used by every later page):** F1 is the
  first screen, so it sets the small set of UI choices that shadcn/ui does
  not make. No separate design system, Storybook, or token docs page: the
  app has 3 pages, and consistency on screen is what a reviewer sees.
  - Category colors: one fixed color per FUNDING, ORI, BANCA, REKSA, and
    LOAN, from shadcn's `--chart-1` … `--chart-5` tokens. LOAN must look
    different from the 4 AUM categories, because it is never added to AUM.
  - Colors for customer-initiated transactions vs. bank entries, and for
    digital vs. non-digital channels.
  - Insight style: a fired rule, its evidence, and the "no rule fired"
    state. Neutral styling only, with no red/green "good/bad" colors, to
    match the copy rule (5.4).
  - Number display: tabular numbers and right-aligned money in tables.
  - Layout shell: nav and page width for `/`, `/customers/:id`, and
    `/rules`.
  - Where it lives: colors as CSS variables in `src/index.css`, plus one
    constant map (category → token) in `src/lib/domain`, so charts and
    badges read from one place. Recorded in the F1 spec. No ADR, because
    these choices are easy to change later.
  - The F1 brainstorm uses mockups in a browser tab to settle these.
- **Done when:** every customer renders, including the empty cases. The
  e2e smoke test opens `/customers/<id>` as a direct deep link.

### F2. Insight rules

- **What:** `src/lib/insights/`: the rules marked **Rule**,
  **Classification**, and **Reframed** in 5.2, the thresholds module, and
  the reason templates. No UI.
- **Depends on:** F0. Needs the user's thresholds.
- **ADRs written here:** 0007.
- **Open questions:** every "Needs" cell in 5.2, asked one at a time, with
  options and trade-offs.
- **Done when:** each rule has tests for fire, not fire, and edge cases
  (no portfolio rows, AUM 0, null amount); fire counts per rule over the
  real data are recorded in the spec.

### F3. "What to offer" panel

- **What:** the fired insights for one customer on the detail page, each
  with its rule and evidence, following the copy rule.
- **Depends on:** F1, F2.
- **Open questions:** order of insights inside the panel; what shows when
  no rule fires.

### F4. Opportunity worklist

- **What:** route `/`. A TanStack table of customers with search, filters
  (tier, opportunity type), and sort. Each row shows its top reason and
  links to the detail page.
- **Depends on:** F2 (F1 for the link target).
- **Open questions:** how the list is ranked (for example by AUM within
  opportunity, by number of fired rules, or by a fixed rule priority); what
  "top reason" means when several rules fire.

### F5. Book summary strip

- **What:** a small header above the worklist: total AUM, tier mix,
  customers per opportunity type. Not a full dashboard.
- **Depends on:** F2. Built with or after F4.
- **Open questions:** which 3–5 numbers; whether clicking one filters the
  worklist.

### F6. How the rules work

- **What:** route `/rules`. For each rule: the condition, the threshold,
  the source of the threshold, how many customers it fires for, and the
  data limits from section 3. Follows the copy rule. Written for
  recruiters and reviewers.
- **Depends on:** F2. Best after F3–F5, so it can link to where each rule
  appears.
- **Open questions:** whether the fire counts are computed live from the
  data (my proposal: yes, through a selector) or written as text.

### Dependency graph

```text
E0 ──► F0 ──► F1 ──────────► F3
        │                    ▲
        └──► F2 ─────────────┤
              ├──► F4 ──► F5 │
              └──► F6 ◄──────┘ (after F3–F5)
```

E0 comes first, so every later feature is checked and deployed the same
way. F1 comes before F2, so a usable page exists before the thresholds are
decided.

## 8. ADRs to write

| ADR | Decision | Written in |
| --- | --- | --- |
| 0003 | Engineering workflow: PR-only `main`, rebase merge, Conventional Commits checked by commitlint, the CI pipeline, the e2e smoke test, and deployment to GitHub Pages with the `/customer-360/` base path (section 10). | E0 |
| 0004 | Layered code structure and one-way imports, enforced by ESLint (section 6). | F0 |
| 0005 | As-of date = the latest `activity_date` in the data (2024-04-26), not today. All recency uses it. | F0 |
| 0006 | Business definitions: AUM vs loan exposure vs total balance, "holds" = `amount > 0`, customer-initiated vs bank entries, group by category never by product alone. Reused from Part 2. | F0 |
| 0007 | Insight rules: deterministic and explainable, no scoring model; the output contract (5.3); one thresholds module with sources; the copy rule (5.4). | F2 |

ADR numbers are the planned order. If the order of writing changes, each
ADR takes the next free number at the time it is written.

## 9. Left to the builder of each feature

- Exact type names and file names inside each layer.
- Component breakdown and shadcn components used.
- Chart types inside the limits above (no net-flow charts, no trend of
  balances).
- Test fixtures.
- Empty-state wording, within the copy rule.
- Exact action versions, cache keys, and job step names in the CI workflow,
  within section 10.

## 10. Engineering workflow (E0, ADR 0003)

### 10.1 Decisions and alternatives

| Concern | Decision | Alternatives rejected |
| --- | --- | --- |
| How code reaches `main` | **PRs only.** `main` is protected, also for admins. 0 approvals required (a solo author cannot approve their own PR); CI must be green. | Direct push to `main` with CI after the push: a broken commit reaches `main` before CI catches it. |
| Merge method | **Rebase merge only.** Every PR commit lands on `main`, with no merge commit. Linear history is required. | Squash merge: `main` would lose the step-by-step commits (for example a test commit before the code commit). Merge commit: adds a "Merge pull request" commit per PR that carries no information. |
| Commit messages | **Conventional Commits (CLAUDE.md Rule 7), checked twice:** a local `commit-msg` hook (`simple-git-hooks` + `commitlint`), and `commitlint` over every PR commit in CI. | CI check only: with rebase merge, a bad message found in CI forces a rewrite of the branch history. A local hook catches it at commit time. |
| Local hooks | **`commit-msg` only.** No pre-commit lint or test hook. `npm run check` runs typecheck, lint, test, and build for local feedback. | husky + lint-staged pre-commit: two more dependencies and slower commits, and it blocks nothing that CI does not already block. |
| Test levels | **Unit and component tests (Vitest) plus one Playwright smoke test** against the built site. | Unit tests only: a wrong base path, a broken deep link, or a start-up crash on real data would be found only on the live URL. |
| Coverage | **Reported, not enforced.** The Vitest v8 coverage table goes into the CI job summary. | A minimum percentage: it would be an invented number, and it does not prove the business rules are right. The rule tests in F2 do that. |
| Data integrity | **CI runs `npm run data:build`, then `git diff --exit-code src/data`.** | Trust the committed JSON: hand edits or a converter change without regenerated JSON would pass unnoticed. |
| Hosting | **GitHub Pages, deployed by the official Pages actions** (`actions/upload-pages-artifact`, `actions/deploy-pages`). Free for this public repo. | `gh-pages` branch: puts build output in git history. Vercel / Netlify: a second platform outside GitHub; the user asked for GitHub. |
| Deep links on Pages | **Copy `dist/index.html` to `dist/404.html` after `vite build`.** Clean URLs stay (`/customer-360/customers/1041`). | `HashRouter`: works without the copy, but every URL gets `/#/`. |
| Node version | **Node 26**, pinned in `.nvmrc` and the `package.json` `engines` field. CI reads `.nvmrc`. | Unpinned: CI and local can differ. |
| Dependency updates | **Dependabot**, weekly, for npm and GitHub Actions, grouped. CI checks each update PR. | Manual updates: easy to forget. |

### 10.2 Files in the repo

| File | Content |
| --- | --- |
| `.nvmrc`, `package.json` `engines` | Node 26. |
| `package.json` scripts | `check` (typecheck → lint → test → build), `test:coverage` (Vitest with v8 coverage), `e2e` (Playwright). `build` also writes `dist/404.html`. |
| `package.json` `simple-git-hooks` + `prepare` | `commit-msg`: `commitlint --edit`. Installed on `npm install` through `prepare`. |
| `commitlint.config.js` | Extends `@commitlint/config-conventional`. |
| `vite.config.ts` | `base: '/customer-360/'`, in dev too, so dev, preview, and Pages use the same paths. |
| `src/main.tsx` | `createBrowserRouter(routes, { basename: import.meta.env.BASE_URL })`. |
| `playwright.config.ts` | Chromium only. `webServer` runs `vite preview` on port 4173. Base URL `http://localhost:4173/customer-360/`. |
| `e2e/smoke.spec.ts` | Opens each route, checks its heading is visible, and fails on any `pageerror` or `console.error`. At E0 it covers `/`. Each feature that adds a route adds it here, including a direct deep-link load. |
| `tsconfig.node.json` | Includes `e2e/` and `playwright.config.ts`. |
| `.gitignore` | Adds `coverage/`, `test-results/`, `playwright-report/`. |
| `.github/workflows/ci.yml` | The pipeline in 10.3. |
| `.github/dependabot.yml` | npm and github-actions ecosystems, weekly, grouped. |

New dev dependencies: `@playwright/test`, `@vitest/coverage-v8`,
`@commitlint/cli`, `@commitlint/config-conventional`, `simple-git-hooks`.

### 10.3 Pipeline (`.github/workflows/ci.yml`)

```text
Triggers: pull_request to main, push to main
Default permissions: contents: read

job "checks"
  checkout with full history (commitlint needs the PR's commit range)
  setup-node from .nvmrc, npm cache
  npm ci
  commitlint from the PR base to HEAD              (pull_request only)
  typecheck → lint → test:coverage (table into the job summary)
  npm run data:build, then git diff --exit-code src/data
  build → upload dist/ as a workflow artifact

job "e2e"            needs: checks
  npm ci, restore the cached Playwright Chromium (key: Playwright version)
  download dist/ → playwright test (vite preview serves dist/)
  on failure: upload the Playwright report as an artifact

job "deploy"         needs: checks, e2e
                     only on push to main
                     permissions: pages: write, id-token: write
                     environment: github-pages
                     concurrency: one deploy at a time, no cancel
  upload the dist/ artifact from "checks" to Pages → deploy-pages
  → https://rizkiafdl.github.io/customer-360/
```

- The deploy ships the same `dist/` that `e2e` tested. There is no second
  build.
- Only the deploy job gets write permissions.

### 10.4 GitHub settings (one time)

Applied with `gh api` after the user confirms, because they change the
public repo.

- **Pages:** source = GitHub Actions.
- **Merge buttons:** rebase merge only; squash and merge commits off;
  delete the head branch after merge.
- **Rule on `main`:** require a PR (0 approvals); require status checks
  `checks` and `e2e`; require the branch to be up to date before merge;
  require linear history; block force pushes and deletion; apply to
  admins.

### 10.5 Rollout order

1. Push the commits that are on local `main` now (before protection
   exists).
2. Build E0 on branch `ci/pipeline` and open a PR. CI must pass, including
   the first e2e run.
3. Rebase-merge the PR. The first deploy runs.
4. Turn on the `main` rule. It comes last, because GitHub can require a
   status check only after the check has run once.

### 10.6 Day-to-day flow after E0

```text
git switch -c feat/<feature>         one branch per feature (spec → plan → branch)
git commit                           commit-msg hook checks the message
npm run check                        optional local run of all checks
git push, open a PR                  CI: checks → e2e
rebase-merge when green              CI on main: checks → e2e → deploy
```
