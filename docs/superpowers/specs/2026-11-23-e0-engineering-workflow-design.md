# E0. Engineering workflow — design

- **Date:** 2026-11-23
- **Status:** Approved by the user on 2026-11-23.
- **Shipped:** PR #1, merged on 2026-11-23.
- **Parent spec:** `docs/superpowers/specs/2026-11-23-customer-360-product-design.md`,
  feature E0 and section 10.
- **ADR written here:** 0003 (engineering workflow).

Section 10 of the parent spec is the main design for E0. It covers the
decisions and their alternatives (10.1), the repo files (10.2), the
pipeline (10.3), the GitHub settings (10.4), the rollout order (10.5), and
the day-to-day flow (10.6). This document does not repeat it. It records
what the E0 brainstorm added or settled on top of section 10. If this
document and section 10 disagree, this document wins.

## 1. Intent

Every change to the repo goes through a PR. CI checks the PR, and every
merge to `main` is built, tested, and deployed to
`https://rizkiafdl.github.io/customer-360/`. E0 comes before F0 so that
every feature after it uses this flow.

The repo is a portfolio piece. A reviewer reads the git history, the PRs,
and the CI runs as evidence of how the work was done, not only the code.

## 2. Goals, non-goals, anti-goals

- **Goals:**
  - The pipeline, files, and settings in section 10, working end to end.
  - The same checks apply to every file in the repo, including the files
    for the AI workflow (`CLAUDE.md`, `.claude/`, `docs/`).
  - Markdown files are linted in CI (new, section 4.1).
- **Non-goals:**
  - App features. The site deployed by E0 is the current placeholder page.
  - A coverage minimum (section 10.1: reported, not enforced).
  - Preview deploys per PR.
- **Anti-goals:**
  - A required check that can stay "waiting" forever (see 3, option B).
  - A check that fails on every Dependabot PR (see 4.2).
  - A deploy of a build that `e2e` did not test.

## 3. Approaches (CI scope for docs-only changes)

The user asked whether changes to `CLAUDE.md`, `.claude/`, and `docs/`
are checked by CI.

| Option | What it does | Trade-off |
| --- | --- | --- |
| **A. Full pipeline on every PR, plus a Markdown lint step** | Every PR runs `checks` and `e2e`. `checks` also runs `markdownlint-cli2` on all `*.md` files. | One new dev dependency and a few seconds per run. Docs format is checked, and docs are part of what reviewers read. |
| B. Skip CI for docs-only PRs (`paths-ignore`) | Faster docs PRs. | A skipped workflow never reports `checks` and `e2e`, so a required check stays "waiting" and the PR cannot merge. The fix (a changed-files job) makes the workflow harder to read. |
| C. Full pipeline, no Markdown lint | No change to section 10. | Markdown errors reach `main` and are only seen in an editor. |

**Chosen: A** (user decision, 2026-11-23).

CI does not check that `CLAUDE.md` agrees with the code. The code review
step in CLAUDE.md Rule 8 covers that.

## 4. Additions and settled points

### 4.1 Markdown lint (option A)

- New dev dependency: `markdownlint-cli2`.
- New file `.markdownlint-cli2.jsonc` at the repo root:
  - `config`: the markdownlint defaults with `MD013` (line length) off.
    Reason: the spec and ADR tables have long rows that cannot wrap.
  - `globs`: `**/*.md`.
  - `ignores`: `node_modules/**`, `dist/**`, `coverage/**`,
    `playwright-report/**`, `test-results/**`.
- New script `lint:md`: `markdownlint-cli2` (reads the globs from the
  config file).
- `check` runs typecheck → lint → lint:md → test → build.
- The `checks` job runs `lint:md` right after `lint`.
- On 2026-11-23 all 5 Markdown files in the repo pass with this config, so
  E0 needs no doc fixes.

### 4.2 Dependabot and commitlint

- **Problem:** Dependabot's default message ("Bump x from 1.0 to 1.1") is
  not a Conventional Commit, and its body has release-note lines longer
  than commitlint's 100-character limit. With commitlint over every PR
  commit, every Dependabot PR would fail.
- **Decision (my call):**
  - `.github/dependabot.yml` sets `commit-message.prefix: build` and
    `include: scope` for both ecosystems. Messages become
    `build(deps): bump …` and `build(deps-dev): bump …`.
  - `commitlint.config.js` turns off `body-max-line-length` and
    `footer-max-line-length`. The header rules stay on.
- Dependabot PRs go through the same `checks` and `e2e` and are merged
  by the user with rebase merge, like any other PR.

### 4.3 Repository ruleset instead of classic branch protection

- **Decision (my call):** the `main` rule in section 10.4 is a repository
  ruleset, not classic branch protection. A ruleset with an empty bypass
  list applies to admins too. Rulesets are GitHub's current method.
- Ruleset contents: target `main` (the default branch); rules: deletion
  blocked, non-fast-forward blocked, linear history required, PR required
  (0 approvals), status checks `checks` and `e2e` required with "up to
  date" (strict) on.
- The required check names must equal the job names in `ci.yml`
  (`checks`, `e2e`). The plan checks the names after the first run and
  before the ruleset is created (section 10.5, step 4).

### 4.4 Steps that change GitHub

The auto-mode permission check blocks `git push` from Claude in this
session. These steps are run by the user with `! <command>` in the
prompt, and Claude gives the exact command at each point:

1. `git push -u origin ci/pipeline`, then `gh pr create …`.
2. The rebase merge (`gh pr merge --rebase --delete-branch`, or the
   GitHub UI).
3. The `gh api` calls for Pages, merge settings, and the ruleset.

If a command that does not change GitHub is blocked, the same rule
applies.

### 4.5 Smoke test at E0

- `e2e/smoke.spec.ts` opens `/` (that is, `/customer-360/`), checks that
  the heading "Customer 360" is visible, and fails on any `pageerror` or
  `console.error`.
- The deep-link test starts in F1, when `/customers/:id` exists.

### 4.6 ADR 0003

- Task 1 of the plan (CLAUDE.md Rule 8).
- Content: section 10.1 of the parent spec plus 4.1–4.3 above, in the ADR
  format (Status, Context, Decision, Consequences, Alternatives
  considered).
- `docs/adr/0003-engineering-workflow.md`.

### 4.7 Other settled points

- `npm run data:build` was run on 2026-11-23 and gave no diff in
  `src/data`, so the drift check gives no false failures today.
- All 10 commits on `main` already follow Conventional Commits.
- `npm ci` in CI runs `prepare`, which installs the git hook on the CI
  runner. This has no effect on CI and needs no special case.
- The plan is run with `executing-plans` in the main session, because the
  tasks are mostly config files (CLAUDE.md Rule 8 allows this).
- README: a CI status badge and the live URL are added (my call).
- CLAUDE.md: the Commands table gets `check`, `lint:md`,
  `test:coverage`, and `e2e`. The folder structure gets `.github/` and
  `e2e/`. The line "Before every commit, all of `typecheck`, `lint`,
  `test`, and `build` must pass" becomes "`npm run check` must pass before
  every push" (my call).

## 5. Done when

- The `ci/pipeline` PR is green on `checks` (including `lint:md`) and
  `e2e`.
- After the rebase merge, the `deploy` job succeeds and
  `https://rizkiafdl.github.io/customer-360/` shows "Customer 360".
- The ruleset is active. A direct `git push` to `main` is rejected.

## 6. Left to the builder

- Exact action versions and cache keys.
- Exact `gh api` payloads, checked against the GitHub REST docs when the
  plan is written.
- The order of tasks inside the plan, except that ADR 0003 is first and
  the ruleset is last.
