# 0003. Engineering workflow: PR-only main, CI, and GitHub Pages

- **Status:** Accepted
- **Date:** 2026-11-23

## Context

The repo is a portfolio piece with one author. Reviewers read the git
history, the pull requests, and the CI runs as evidence of how the work was
done, not only the code. Before this decision, commits went straight to
`main` and nothing checked them except the author running the scripts by
hand. The app is a static site (ADR 0001), so it can be hosted for free and
deployed on every change.

The repo also holds the AI workflow files (`CLAUDE.md`, `.claude/`,
`docs/superpowers/`). They are part of what reviewers read, so they need the
same checks as the code.

## Decision

### How code reaches `main`

- `main` is PR-only, through a repository ruleset with an empty bypass list,
  so the rule also applies to admins. The ruleset requires a PR (0 approvals,
  because a solo author cannot approve their own PR), the status checks
  `checks` and `e2e` with the branch up to date, and linear history. It
  blocks force pushes and deletion.
- Rebase merge is the only merge method. Every PR commit lands on `main` with
  no merge commit. The head branch is deleted after merge.
- Every PR runs the full pipeline, including PRs that change only docs.

### Commit messages

- Conventional Commits, checked twice: a local `commit-msg` hook
  (`simple-git-hooks` + `commitlint`), and `commitlint` over every PR commit
  in CI.
- `commitlint` turns off the body and footer line-length rules, because
  Dependabot bodies carry long release-note lines and URLs. The header rules
  stay on.
- Dependabot uses the prefix `build` with scope, so its messages read
  `build(deps): bump …`.
- `commit-msg` is the only local hook. `npm run check` runs typecheck, lint,
  Markdown lint, unit tests, and build for local feedback.

### CI (`.github/workflows/ci.yml`)

- `checks`: commitlint (PRs only), typecheck, ESLint, Markdown lint
  (`markdownlint-cli2`, defaults with MD013 line length off), Vitest with v8
  coverage, a data drift check (`npm run data:build` then
  `git diff --exit-code src/data`), and the build. The build output is saved
  as the `dist` artifact. On `main` only, the same build is also saved as the
  `github-pages` artifact with `actions/upload-pages-artifact`.
- `e2e`: one Playwright smoke test (Chromium) against that build, served by
  `vite preview`. It fails on a missing heading, a page error, or a console
  error. Each feature that adds a route adds a test, with a direct deep-link
  load.
- `deploy`: on `main` only (a push, or a manual `workflow_dispatch` run).
  It runs one step, `actions/deploy-pages`, which deploys the `github-pages`
  artifact from `checks`. That is the same build that `e2e` tested. Only
  this job gets write permissions.
- The Pages artifact is uploaded in `checks`, not in `deploy`, for two
  reasons. First, `actions/deploy-pages` lists the run's artifacts once, with
  no retry, and an artifact uploaded less than a second earlier can be
  missing from that list. Main runs 45190744525 and 45199705930 failed this
  way ("Found 1 artifact(s)", then "No artifacts named github-pages").
  Second, `actions/deploy-pages` fails when the run has more than one
  `github-pages` artifact, so an upload in `deploy` made every rerun of that
  job fail.
- Coverage is shown in the job summary. No minimum is enforced.

### Hosting

- GitHub Pages at `https://rizkiafdl.github.io/customer-360/`.
- Vite `base` is `/customer-360/` in dev, preview, and production, and the
  router uses it as its basename.
- `npm run build` copies `dist/index.html` to `dist/404.html`, so a deep link
  or a reload on Pages loads the app instead of GitHub's 404 page.

### Tooling

- Node 26, pinned in `.nvmrc` and the `package.json` `engines` field. CI
  reads `.nvmrc`.
- Dependabot opens weekly, grouped update PRs for npm and GitHub Actions.

## Consequences

- Every change needs a branch and a PR, including a one-line docs fix. The
  history on `main` stays linear and every commit on it passed CI as part of
  its PR.
- A bad commit message is caught at commit time. If one reaches a PR, the
  branch history must be rewritten before merge.
- `npm run dev` serves the app at `http://localhost:5173/customer-360/`, not
  at the root.
- `npm run e2e` serves the existing `dist/`, so it needs `npm run build`
  first.
- Dependabot PRs need a manual rebase merge, like any other PR.
- Deploys need no secrets. Pages uses the workflow's OIDC token.
- If `deploy` fails, use "Re-run failed jobs". "Re-run all jobs" runs
  `checks` again, which uploads a second `github-pages` artifact, so the
  deploy fails. To redeploy from a clean run, start a `workflow_dispatch` run
  on `main`.
- A docs-only PR waits a few minutes for the full pipeline.

## Alternatives considered

- **Direct push to `main`, CI after the push.** Rejected: a broken commit
  reaches `main` before CI catches it.
- **Squash merge.** Rejected: `main` would lose the step-by-step commits, for
  example a test commit before the code commit.
- **Merge commits.** Rejected: one "Merge pull request" commit per PR that
  carries no information.
- **Classic branch protection.** Rejected in favor of a ruleset: rulesets are
  GitHub's current method, and an empty bypass list covers admins.
- **commitlint in CI only.** Rejected: with rebase merge, a bad message found
  in CI forces a rewrite of the branch history. The local hook catches it
  first.
- **husky + lint-staged pre-commit hook.** Rejected: two more dependencies
  and slower commits, and it blocks nothing that CI does not already block.
- **Unit tests only.** Rejected: a wrong base path, a broken deep link, or a
  start-up crash on real data would show only on the live URL.
- **A coverage minimum.** Rejected: the number would be invented, and
  coverage does not prove the business rules are right. Rule tests do that.
- **Trust the committed JSON.** Rejected: a hand edit, or a converter change
  without regenerated JSON, would pass unnoticed.
- **Skip CI for docs-only PRs (`paths-ignore`).** Rejected: a skipped
  workflow never reports the required checks, so the PR waits forever. The
  workaround, a changed-files job, makes the workflow harder to read.
- **No Markdown lint.** Rejected: format errors in the docs reach `main`.
- **Upload the Pages artifact inside `deploy`.** Rejected: the deploy step
  can run before the new artifact is listed, and every rerun of the job adds
  one more `github-pages` artifact.
- **`gh-pages` branch.** Rejected: puts build output in the git history.
- **Vercel or Netlify.** Rejected: a second platform outside GitHub.
- **`HashRouter`.** Rejected: works without the `404.html` copy, but every
  URL gets `/#/`.
- **Unpinned Node.** Rejected: CI and local can run different versions.
- **Manual dependency updates.** Rejected: easy to forget.

## Update, 2026-11-24: agent teams

### Why the roles are split

Until this update, the main session wrote most of the code itself, and for
some features one subagent wrote both the tests and the code. The agent that
wrote the code could also change the tests until they passed, so a green
suite proved less than it seemed. Every role also ran on the same expensive
model. Design: `docs/superpowers/specs/2026-11-24-agent-teams-design.md`.

### Roles, gates, and the guard

The roles are split, and each has a fixed model:

| Role | Who | Model | Edits |
| --- | --- | --- | --- |
| Orchestrator | The main session | The session's model | Ledger, commits, PR body, rulings |
| `docs-writer` | Agent, one per spec | opus | `docs/` only (spec and plan) |
| `test-writer` | Agent, one per spec | sonnet | Test files only |
| `implementer` | Agent, one per spec | sonnet | Everything except test files |
| `reviewer` | Agent, one per branch | opus | Nothing (read-only) |
| `pr-shipper` | Agent | sonnet | Nothing (git push and `gh` only) |

- **Two gates per task, run by the orchestrator.** RED: the new tests fail
  because the behavior is missing, `scripts/agents/check-paths.ts` finds no
  changed path outside `test-writer`'s role, and the tests are staged.
  GREEN: the full suite passes, and `check-paths.ts` finds no unstaged or
  untracked path outside `implementer`'s role. Then one commit holds the
  task's tests and code, so every commit on `main` passes CI.
- **A path guard.** Each editing agent has a `PreToolUse` hook that runs
  `scripts/agents/guard-paths.ts` with its role and blocks edits outside
  it. Test config, package files, the guard, and `.claude/` are protected:
  only the orchestrator edits them. The hook command ends in `|| exit 2`,
  so a hook that cannot start blocks. The gate checks cover what the hook
  cannot see (`Bash` edits).
- **Parallel work** follows CLAUDE.md Rule 11: specs and plans in parallel,
  code in parallel only across features that share no file and no
  interface, reviews in parallel, and one `pr-shipper` at a time.

### What follows

- A test that the plan asks for is written before the code, by an agent that
  does not write that code.
- Code and tests run on a cheaper model. The plan and the review, which need
  the most judgment, run on opus. So the plan must give every name, value,
  and command a sonnet agent needs.
- Each task costs two handoffs and two gate runs. One pair per spec,
  continued with `SendMessage`, keeps that to one cold start per agent.
- A long plan can fill an agent's context. The ledger keeps the progress.

### Options not chosen

- **One implementer writes tests and code.** Rejected: the cheapest, but the
  code author can still change the tests.
- **A new test-writer and implementer for each task.** Rejected: two cold
  starts per task, and each new agent must re-read the code from earlier
  tasks.
