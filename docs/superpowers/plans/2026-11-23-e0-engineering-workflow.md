# E0. Engineering Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every change reaches `main` through a PR that CI checks, and every merge to `main` deploys the tested build to `https://rizkiafdl.github.io/customer-360/`.

**Architecture:** One GitHub Actions workflow (`ci.yml`) with three jobs: `checks` (commitlint, typecheck, lint, Markdown lint, unit tests with coverage, data drift, build), `e2e` (Playwright smoke test against the `dist/` from `checks`), and `deploy` (the same `dist/` to GitHub Pages, on push to `main` only). Locally, a `commit-msg` hook runs commitlint, and `npm run check` runs the checks. A repository ruleset makes `main` PR-only with rebase merge and linear history.

**Tech Stack:** GitHub Actions, GitHub Pages, Playwright (Chromium), Vitest v8 coverage, commitlint, simple-git-hooks, markdownlint-cli2, Dependabot.

**Spec:** `docs/superpowers/specs/2026-11-23-e0-engineering-workflow-design.md`, which builds on section 10 of `docs/superpowers/specs/2026-11-23-customer-360-product-design.md`. If the two disagree, the E0 spec wins.

## Global Constraints

- Branch: `ci/pipeline` (exists; its first commit is the E0 spec).
- Commits: Conventional Commits; author is the repo owner only; **no `Co-Authored-By` trailer**. PR descriptions get no attribution line.
- Steps that change GitHub (`git push`, `gh pr create`, `gh pr merge`, `gh api` with `-X POST/PATCH/PUT`) are run **by the user** with `! <command>`. The executor prints the exact command and waits.
- Node 26 (`.nvmrc` = `26`, `engines.node` = `>=26`). npm 11.
- Base path `/customer-360/` everywhere: dev, preview, Pages.
- Repo: `rizkiafdl/customer-360`. Live URL: `https://rizkiafdl.github.io/customer-360/`.
- Dev dependency versions (latest on 2026-11-23): `@playwright/test@^1.65.1`, `@vitest/coverage-v8@^5.1.1` (must equal the `vitest` major), `@commitlint/cli@^21.2.4`, `@commitlint/config-conventional@^21.2.4`, `simple-git-hooks@^2.14.0`, `markdownlint-cli2@^0.24.2`.
- Action versions (latest on 2026-11-23): `actions/checkout@v7`, `actions/setup-node@v7`, `actions/cache@v6`, `actions/upload-artifact@v7`, `actions/download-artifact@v8`, `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5`.
- Required status check names: exactly `checks` and `e2e` (the job ids in `ci.yml`).
- Coverage is reported, never enforced (no thresholds in config).
- Markdown lint: defaults with `MD013` off.

## Review Focus

1. **A failing step hidden by a pipe.** `npm run test:coverage | tee …` must fail the job when a test fails. Expected: the workflow sets `defaults.run.shell: bash` (GitHub then runs `bash -eo pipefail`). Pinned in Task 6, Step 1 and checked in Task 7, Step 3.
2. **Dependabot PRs blocked by commitlint.** A message `build(deps): bump x from 1 to 2` with a body line over 100 characters must pass. Pinned in Task 3, Step 1.
3. **Deep link or reload on Pages returns GitHub's 404 page.** `https://rizkiafdl.github.io/customer-360/any/path` must serve the app's `index.html` (via `404.html`). Pinned in Task 2, Step 4 (file exists) and Task 8, Step 5 (live check).
4. **The hook is not installed after a fresh `npm install` under npm 11.** `.git/hooks/commit-msg` must exist after `npm install`. Pinned in Task 3, Step 5.
5. **A required check stays "waiting" forever.** The ruleset's check names must equal the names GitHub reports. Pinned in Task 7, Step 4 (read the real names) and Task 9, Step 1 (use them).

---

### Task 1: ADR 0003

**Files:**

- Create: `docs/adr/0003-engineering-workflow.md`

**Interfaces:**

- Consumes: product spec section 10.1; E0 spec sections 3, 4.1–4.3.
- Produces: the ADR that later docs link to as `docs/adr/0003-engineering-workflow.md`.

- [ ] **Step 1: Write the ADR**

Same format as `docs/adr/0001-static-json-from-excel.md`: title `# 0003. Engineering workflow`, `Status: Accepted`, `Date: 2026-11-23`, then Context, Decision, Consequences, Alternatives considered.

- Context: portfolio repo, solo author, reviewers read history and CI runs.
- Decision: one row or bullet per line of product spec table 10.1 (PR-only `main`, rebase merge, commitlint in hook + CI, `commit-msg` hook only, Vitest + one Playwright smoke test, coverage reported, data drift check, GitHub Pages via official actions, `404.html` copy, Node 26 pinned, Dependabot weekly grouped), plus: Markdown lint with MD013 off (E0 spec 4.1), Dependabot `build(deps)` prefix and commitlint body/footer length rules off (4.2), repository ruleset with empty bypass list (4.3), full pipeline on docs-only PRs (section 3, option A).
- Consequences: every change needs a branch and PR, including docs; the user runs GitHub-changing commands; `npm run dev` serves under `/customer-360/`; Dependabot PRs need a manual rebase merge.
- Alternatives considered: the rejected column of table 10.1, plus `paths-ignore` (option B) and classic branch protection.

Do not cite files outside the repo.

- [ ] **Step 2: Commit**

The Markdown lint arrives in Task 4; its Step 2 lints this ADR.

```bash
git add docs/adr/0003-engineering-workflow.md
git commit -m "docs(adr): add 0003 engineering workflow"
```

---

### Task 2: Pages-ready build (Node pin, base path, router basename, 404 copy)

Done before the e2e test exists, so `npm run build` output is the thing the e2e task tests.

**Files:**

- Create: `.nvmrc`
- Modify: `package.json` (`engines`, `build` script)
- Modify: `vite.config.ts`
- Modify: `src/main.tsx`
- Test: `src/routes.test.tsx` (unchanged; must still pass)

**Interfaces:**

- Produces: `dist/` with assets under `/customer-360/` and `dist/404.html` identical to `dist/index.html`. The router uses `import.meta.env.BASE_URL` as basename.

- [ ] **Step 1: Check the current build has no base path (the failing state)**

Run: `npm run build >/dev/null && grep -o 'src="[^"]*assets/[^"]*"' dist/index.html; ls dist/404.html`
Expected: `src="/assets/…"` and `ls: dist/404.html: No such file or directory`.

- [ ] **Step 2: Implement**

- `.nvmrc`: one line, `26`.
- `package.json`: `"engines": { "node": ">=26" }`; `"build": "tsc -b && vite build && cp dist/index.html dist/404.html"`.
- `vite.config.ts`: `base: '/customer-360/'` at the top level of `defineConfig`. Add a one-line comment: GitHub Pages serves the repo under `/customer-360/`; dev uses it too so paths match everywhere.
- `src/main.tsx`: `createBrowserRouter(routes, { basename: import.meta.env.BASE_URL })`.

- [ ] **Step 3: Verify the build**

Run: `npm run build >/dev/null && grep -o 'src="[^"]*assets/[^"]*"' dist/index.html && cmp dist/index.html dist/404.html && echo same`
Expected: `src="/customer-360/assets/…"` then `same`.

- [ ] **Step 4: Verify the existing checks still pass**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all pass; `src/routes.test.tsx` still finds the heading "Customer 360" (it uses `createMemoryRouter` with no basename, so it is not affected).

- [ ] **Step 5: Commit**

```bash
git add .nvmrc package.json vite.config.ts src/main.tsx
git commit -m "build: serve the app under /customer-360/ for GitHub Pages"
```

---

### Task 3: Commit message checks (commitlint + commit-msg hook)

**Files:**

- Create: `commitlint.config.js`
- Modify: `package.json` (dev deps, `prepare` script, `simple-git-hooks` field)

**Interfaces:**

- Produces: `npx commitlint` works with the repo config (CI uses it in Task 6); `.git/hooks/commit-msg` runs it on every commit.

- [ ] **Step 1: Install and write the config, then check the rules (test first)**

Run: `npm install -D @commitlint/cli@^21.2.4 @commitlint/config-conventional@^21.2.4 simple-git-hooks@^2.14.0`

`commitlint.config.js` (ESM, the package is `"type": "module"`):

```js
// Conventional Commits (CLAUDE.md Rule 7). Body and footer length are off
// because Dependabot bodies carry long release-note lines and URLs.
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
}
```

Run each and check the exit code:

```bash
echo "add stuff" | npx commitlint; echo "exit $?"
echo "feat: add stuff" | npx commitlint; echo "exit $?"
printf 'build(deps): bump vite from 8.3.6 to 8.4.0\n\nBumps [vite](https://github.com/vitejs/vite/tree/HEAD/packages/vite) from 8.3.6 to 8.4.0. - [Release notes](https://github.com/vitejs/vite/releases) - [Changelog](https://github.com/vitejs/vite/blob/main/packages/vite/CHANGELOG.md)\n' | npx commitlint; echo "exit $?"
```

Expected: first `exit 1` (subject/type empty), second `exit 0`, third `exit 0`.

- [ ] **Step 2: Add the hook config**

`package.json`:

- script `"prepare": "simple-git-hooks"`
- top-level field `"simple-git-hooks": { "commit-msg": "npx --no -- commitlint --edit \"$1\"" }`

- [ ] **Step 3: Install the hook**

Run: `npm install`
Expected: output includes simple-git-hooks reporting the `commit-msg` hook as set.

- [ ] **Step 4: Verify the hook rejects a bad message**

Run: `git commit --allow-empty -m "bad message"; echo "exit $?"`
Expected: commitlint errors and `exit 1`. No commit is created (`git log -1 --format=%s` still shows the Task 2 commit).

- [ ] **Step 5: Verify npm 11 runs `prepare` on a fresh install**

Run: `rm .git/hooks/commit-msg && npm install >/dev/null && test -f .git/hooks/commit-msg && echo installed`
Expected: `installed`. If it fails, stop and report: the spec's E0 note says the builder must confirm this.

- [ ] **Step 6: Commit (the hook checks this message)**

```bash
git add commitlint.config.js package.json package-lock.json
git commit -m "build: check commit messages with commitlint in a commit-msg hook"
```

---

### Task 4: Local check suite (Markdown lint, coverage, `check`)

**Files:**

- Create: `.markdownlint-cli2.jsonc`
- Modify: `package.json` (dev deps; scripts `lint:md`, `test:coverage`, `check`)
- Modify: `vite.config.ts` (`test.coverage`)
- Modify: `.gitignore`
- Modify: `eslint.config.js` (`globalIgnores`)

**Interfaces:**

- Produces: scripts `lint:md`, `test:coverage`, `check` (CI uses `lint:md` and `test:coverage` in Task 6).

- [ ] **Step 1: Install, then show the lint catches a real error (test first)**

Run: `npm install -D markdownlint-cli2@^0.24.2 @vitest/coverage-v8@^5.1.1`

`.markdownlint-cli2.jsonc`:

```jsonc
// Markdown lint for every *.md file. MD013 (line length) is off: spec and
// ADR tables have long rows that cannot wrap.
{
  "config": { "MD013": false },
  "ignores": ["node_modules/**", "dist/**", "coverage/**", "playwright-report/**", "test-results/**"]
}
```

Script: `"lint:md": "markdownlint-cli2 \"**/*.md\""`.

Run: `printf '# T\n\n```\nx\n```\n' > scratch-lint.md && npm run lint:md; echo "exit $?"; rm scratch-lint.md`
Expected: `MD040/fenced-code-language` on `scratch-lint.md` and `exit 1`.

- [ ] **Step 2: Verify the repo passes**

Run: `npm run lint:md`
Expected: `Summary: 0 issues` and exit 0 (8 files: README, CLAUDE.md, ADRs 0001–0003, the product spec, the E0 spec, this plan).

- [ ] **Step 3: Coverage**

- `vite.config.ts` `test.coverage`: `{ provider: 'v8', reporter: ['text'], include: ['src/**', 'scripts/**'] }`. No thresholds (Global Constraints).
- Script: `"test:coverage": "vitest run --coverage"`.

Run: `npm run test:coverage`
Expected: tests pass, then a table with a `% Stmts` header row.

- [ ] **Step 4: `check` and ignores**

- Script: `"check": "npm run typecheck && npm run lint && npm run lint:md && npm test && npm run build"`.
- `.gitignore`: add a block `# Test output` with `coverage/`, `test-results/`, `playwright-report/`.
- `eslint.config.js`: `globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results'])`.

Run: `npm run check`
Expected: every step passes, ends with the Vite build output.

- [ ] **Step 5: Commit**

```bash
git add .markdownlint-cli2.jsonc package.json package-lock.json vite.config.ts .gitignore eslint.config.js
git commit -m "build: add Markdown lint, coverage report and npm run check"
```

---

### Task 5: Playwright smoke test

**Files:**

- Create: `playwright.config.ts`
- Create: `e2e/smoke.spec.ts`
- Modify: `package.json` (dev dep, `e2e` script)
- Modify: `tsconfig.node.json` (`include`)
- Modify: `eslint.config.js` (Node globals block `files`)

**Interfaces:**

- Consumes: `dist/` from `npm run build` (Task 2).
- Produces: `npm run e2e` (CI runs it in Task 6 against the downloaded `dist/`). Later features add one test per route to `e2e/smoke.spec.ts`.

- [ ] **Step 1: Install**

Run: `npm install -D @playwright/test@^1.65.1 && npx playwright install chromium`

- [ ] **Step 2: Write the test**

`e2e/smoke.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

// Smoke test against the production build. Each route gets one test here;
// features that add routes also add a direct deep-link load.
test('home page renders with no page or console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })

  await page.goto('./')

  await expect(page.getByRole('heading', { name: 'Customer 360' })).toBeVisible()
  expect(errors).toEqual([])
})
```

- [ ] **Step 3: Write the config**

`playwright.config.ts`: `testDir: 'e2e'`; `forbidOnly: !!process.env.CI`; `retries: process.env.CI ? 1 : 0`; `reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list'`; `use.baseURL: 'http://localhost:4173/customer-360/'`; one project `chromium` with `devices['Desktop Chrome']`; `webServer: { command: 'npm run preview -- --port 4173 --strictPort', url: 'http://localhost:4173/customer-360/', reuseExistingServer: !process.env.CI }`. Comment at the top: serves the existing `dist/`; run `npm run build` first.

- `package.json` script: `"e2e": "playwright test"`.
- `tsconfig.node.json` `include`: add `"playwright.config.ts"` and `"e2e/**/*.ts"`.
- `eslint.config.js` Node block `files`: add `'e2e/**/*.ts'`.

- [ ] **Step 4: Verify it fails when the page is wrong**

Run: `sed -i '' "s/'Customer 360' })).toBeVisible/'Customer 361' })).toBeVisible/" e2e/smoke.spec.ts && npm run build >/dev/null && npm run e2e; echo "exit $?"`
Expected: the heading assertion fails, `exit 1`.

Then restore: `sed -i '' "s/Customer 361/Customer 360/" e2e/smoke.spec.ts && grep -c "Customer 361" e2e/smoke.spec.ts` → `0`.

- [ ] **Step 5: Verify it passes**

Run: `npm run e2e`
Expected: `1 passed`.

Run: `npm run typecheck && npm run lint`
Expected: pass (the e2e files are typed and linted as Node code).

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts e2e/smoke.spec.ts package.json package-lock.json tsconfig.node.json eslint.config.js
git commit -m "test(e2e): add Playwright smoke test against the production build"
```

---

### Task 6: CI workflow, Dependabot, and docs

**Files:**

- Create: `.github/workflows/ci.yml`
- Create: `.github/dependabot.yml`
- Modify: `README.md`
- Modify: `CLAUDE.md`

**Interfaces:**

- Consumes: scripts `typecheck`, `lint`, `lint:md`, `test:coverage`, `data:build`, `build`, `e2e`; `commitlint.config.js`; `.nvmrc`.
- Produces: check runs named `checks` and `e2e` on every PR (used by the ruleset in Task 9); `deploy` on push to `main`.

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

permissions:
  contents: read

defaults:
  run:
    # Explicit bash runs with -eo pipefail, so `cmd | tee` fails when cmd fails.
    shell: bash

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0 # commitlint needs the PR's commit range
      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - name: Commit messages
        if: github.event_name == 'pull_request'
        run: npx commitlint --from ${{ github.event.pull_request.base.sha }} --to ${{ github.event.pull_request.head.sha }} --verbose
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run lint:md
      - name: Unit tests with coverage
        run: |
          npm run test:coverage | tee coverage.txt
          { echo '## Coverage'; echo '```text'; sed -n '/% Stmts/,$p' coverage.txt; echo '```'; } >> "$GITHUB_STEP_SUMMARY"
      - name: Generated data matches the workbook
        run: npm run data:build && git diff --exit-code src/data
      - run: npm run build
      - uses: actions/upload-artifact@v7
        with:
          name: dist
          path: dist/
          if-no-files-found: error

  e2e:
    needs: checks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - name: Playwright version
        id: pw
        run: echo "version=$(npx playwright --version | awk '{print $2}')" >> "$GITHUB_OUTPUT"
      - uses: actions/cache@v6
        id: pw-cache
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ steps.pw.outputs.version }}
      - if: steps.pw-cache.outputs.cache-hit != 'true'
        run: npx playwright install --with-deps chromium
      - if: steps.pw-cache.outputs.cache-hit == 'true'
        run: npx playwright install-deps chromium
      - uses: actions/download-artifact@v8
        with:
          name: dist
          path: dist/
      - run: npm run e2e
      - if: failure()
        uses: actions/upload-artifact@v7
        with:
          name: playwright-report
          path: playwright-report/

  deploy:
    needs: [checks, e2e]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    concurrency:
      group: pages
      cancel-in-progress: false
    steps:
      - uses: actions/download-artifact@v8
        with:
          name: dist
          path: dist/
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist/
      - id: deployment
        uses: actions/deploy-pages@v5
```

- [ ] **Step 2: Write `.github/dependabot.yml`**

Two entries, `npm` (directory `/`) and `github-actions` (directory `/`). Each: `schedule.interval: weekly`; `commit-message: { prefix: build, include: scope }`; one group that matches `patterns: ["*"]` (group name `npm` / `github-actions`).

- [ ] **Step 3: Verify the YAML parses and the scripts exist**

Run: `npx --yes js-yaml@4 .github/workflows/ci.yml >/dev/null && npx --yes js-yaml@4 .github/dependabot.yml >/dev/null && echo ok`
Expected: `ok`.

Run: `for s in typecheck lint lint:md test:coverage data:build build e2e; do npm run | grep -q "^  $s$" && echo "$s ok"; done`
Expected: 7 lines ending in `ok`.

- [ ] **Step 4: Update docs**

- `README.md`:
  - Under the title: `[![CI](https://github.com/rizkiafdl/customer-360/actions/workflows/ci.yml/badge.svg)](https://github.com/rizkiafdl/customer-360/actions/workflows/ci.yml)` and a line `Live: https://rizkiafdl.github.io/customer-360/`.
  - The dev URL becomes `http://localhost:5173/customer-360/`.
  - "Other scripts" adds `npm run check` and `npm run e2e` (needs `npm run build` first).
  - A short "Workflow" section: PR-only `main`, rebase merge, CI `checks → e2e → deploy`, link to `docs/adr/0003-engineering-workflow.md`.
- `CLAUDE.md`:
  - Commands table: add `npm run check`, `npm run lint:md`, `npm run test:coverage`, `npm run e2e` (needs a build first).
  - Replace "Before every commit, all of `typecheck`, `lint`, `test`, and `build` must pass." with "`npm run check` must pass before every push. CI runs the same checks plus the e2e smoke test (`docs/adr/0003-engineering-workflow.md`)."
  - Folder structure: add `e2e/` (Playwright smoke tests against the built site), `.github/` (CI workflow and Dependabot), `docs/superpowers/plans/` already listed.

Run: `npm run lint:md`
Expected: 0 issues.

- [ ] **Step 5: Commit**

```bash
git add .github README.md CLAUDE.md
git commit -m "ci: add checks, e2e and Pages deploy workflow with Dependabot"
```

---

### Task 7: Open the PR and get CI green (user runs the GitHub steps)

**Interfaces:**

- Produces: a green PR from `ci/pipeline`; the exact check names GitHub reports.

- [ ] **Step 1: Final local run and branch review**

Run: `npm run check && npm run e2e`
Expected: all pass.

Then run the whole-branch code review (CLAUDE.md Rule 8, step 4: `requesting-code-review`, base `main`). Fix what it finds before the push.

- [ ] **Step 2: User pushes and opens the PR**

Print for the user:

```text
! git push -u origin ci/pipeline
! gh pr create --base main --head ci/pipeline --title "ci: add the engineering workflow (E0)" --body-file <path printed by the executor>
```

Before printing, write the PR body to the scratchpad: summary of Tasks 1–6, links to the E0 spec and ADR 0003, a "How to verify" list (CI green, live URL after merge). No attribution line.

- [ ] **Step 3: Watch CI**

Run: `gh pr checks --watch`
Expected: `checks` and `e2e` pass; `deploy` is skipped (not a push to `main`). The job summary of `checks` shows the coverage table.

If a job fails, read the log (`gh run view --log-failed`), fix on the branch, commit, and ask the user to `! git push`.

- [ ] **Step 4: Read the real check names**

Run: `gh pr checks --json name -q '.[].name'`
Expected: includes `checks` and `e2e` exactly. Use these strings in Task 9.

---

### Task 8: Pages and merge settings, merge, first deploy (user runs the GitHub steps)

Pages must exist before the merge, or the first `deploy` fails.

- [ ] **Step 1: User enables Pages (source = GitHub Actions)**

```text
! gh api -X POST repos/rizkiafdl/customer-360/pages -f build_type=workflow
```

Verify: `gh api repos/rizkiafdl/customer-360/pages -q .build_type` → `workflow`.

- [ ] **Step 2: User sets the merge buttons**

```text
! gh api -X PATCH repos/rizkiafdl/customer-360 -F allow_rebase_merge=true -F allow_squash_merge=false -F allow_merge_commit=false -F delete_branch_on_merge=true
```

Verify: `gh api repos/rizkiafdl/customer-360 -q '[.allow_rebase_merge,.allow_squash_merge,.allow_merge_commit,.delete_branch_on_merge]'` → `[true,false,false,true]`.

- [ ] **Step 3: User rebase-merges the PR**

```text
! gh pr merge ci/pipeline --rebase --delete-branch
```

- [ ] **Step 4: Watch the main run**

Run: `gh run watch $(gh run list --branch main --workflow CI --limit 1 --json databaseId -q '.[0].databaseId')`
Expected: `checks`, `e2e`, `deploy` all succeed.

- [ ] **Step 5: Verify the live site and deep links**

Run: `curl -s https://rizkiafdl.github.io/customer-360/ | grep -c 'id="root"'` → `1`.
Run: `curl -s -o /dev/null -w '%{http_code}\n' https://rizkiafdl.github.io/customer-360/no/such/page` → `404`, and `curl -s https://rizkiafdl.github.io/customer-360/no/such/page | grep -c 'id="root"'` → `1` (GitHub serves `404.html`, which is the app).

- [ ] **Step 6: Sync local `main`**

Run: `git switch main && git pull --ff-only && git log --oneline -8`
Expected: the E0 commits on `main` with no merge commit.

---

### Task 9: Ruleset on `main` (last)

- [ ] **Step 1: User creates the ruleset**

Write this payload to the scratchpad as `ruleset-main.json` (check names from Task 7, Step 4):

```json
{
  "name": "main",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "required_linear_history" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false,
        "allowed_merge_methods": ["rebase"]
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [{ "context": "checks" }, { "context": "e2e" }]
      }
    }
  ]
}
```

Print for the user:

```text
! gh api -X POST repos/rizkiafdl/customer-360/rulesets --input <scratchpad>/ruleset-main.json
```

- [ ] **Step 2: Verify the ruleset**

Run: `gh api repos/rizkiafdl/customer-360/rules/branches/main -q '.[].type'`
Expected: `deletion`, `non_fast_forward`, `required_linear_history`, `pull_request`, `required_status_checks`.

- [ ] **Step 3: Verify a direct push is rejected**

Run (local only, nothing reaches `main` if the rule works): `git commit --allow-empty -m "chore: test the main ruleset"` then print for the user `! git push origin main`.
Expected: the push is rejected with a message about the ruleset (changes must be made through a pull request). Then run `git reset --hard origin/main` to drop the empty commit (the target is the local test commit only; check `git log -1 --format=%s` first).

- [ ] **Step 4: Update the project memory**

Record in the project memory that E0 is done (live URL, ruleset active) and the next step is the F0 brainstorm.
