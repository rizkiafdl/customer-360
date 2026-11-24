# Agent teams: separate test and code agents — design

- **Date:** 2026-11-24
- **Status:** Approved by the user on 2026-11-24.
- **Branch:** `chore/agent-workflow`. One plan, one PR.
- **Size:** a small change (short design). It changes how every later
  feature is built, so it follows Rule 8 and gets a dated update in ADR 0003.

## 1. Intent

Until now, the main session wrote most code itself (executing-plans), and
for some features one subagent wrote both the tests and the code. The user
wants the roles split. One agent writes the tests, another writes the code,
another reviews, and the main session coordinates. Each role has a fixed
model. The user also wants a clear rule for parallel work.

The reasons:

- **Honest tests.** The agent that writes the code cannot change the tests
  to make them pass. A test is written from the plan, before the code
  exists, by an agent that does not write that code.
- **Cost.** Code and tests run on sonnet. Only the plan and the review,
  which need the most judgment, run on opus.
- **Repeatable setup.** The agent prompts live in `.claude/agents/`, in the
  repo, not in one session's memory. Recruiters can read the process.

## 2. Goals, non-goals, anti-goals

### 2.1 Goals

- Four new agent files: `docs-writer`, `test-writer`, `implementer`,
  `reviewer`. `pr-shipper` stays as it is.
- A per-task loop with two gates that the orchestrator checks: RED (the new
  tests fail for the right reason) and GREEN (the full suite passes).
- A hook that stops `implementer` from editing test files and stops
  `test-writer` from editing anything other than test files.
- A written rule for when work may run in parallel.

### 2.2 Non-goals

- No change to the app, the data, or CI.
- No review after each task. Rule 8 keeps one review of the whole branch.
  TDD is the per-task gate.
- No change to `.claude/settings.json` permissions. If a new agent triggers
  a permission prompt, the user decides.

### 2.3 Anti-goals (it fails even if it works)

- A subagent asks the user a question or makes a business decision. Only
  the orchestrator talks to the user (Rule 3 still binds: a subagent that
  needs a threshold stops and reports).
- A commit on `main` that fails CI. A red test is never committed alone.
- Two agents edit the same worktree at the same time.

## 3. Constraints

- **Rule 7:** commits are by the repo owner only, with no `Co-Authored-By`
  trailer, also in subagent commits.
- **Rule 8:** brainstorming → spec → plan → build → one check and one
  review → PR through `pr-shipper`.
- **Claude Code facts this design relies on** (checked in the Claude Code
  subagent docs on 2026-11-24):
  - An agent file's frontmatter sets `model`, `tools`, `disallowedTools`,
    and `hooks`. Hooks in the frontmatter run only while that agent runs.
  - `PreToolUse` hooks can block a tool call. `tools` cannot be limited by
    file path, so a path rule needs a hook.
  - The orchestrator can continue an agent with `SendMessage`, and the
    agent keeps its full context.
  - A subagent cannot ask the user questions.

## 4. Approaches

| | Approach | Trade-off | Chosen |
| --- | --- | --- | --- |
| A | One `implementer` writes tests and code (TDD inside one agent). | Cheapest, but the code author also writes and can change the tests. | No |
| B | A new `test-writer` and `implementer` for each task. | Clean split, but two cold starts per task, and each agent must re-read the code from earlier tasks. | No |
| C | **One `test-writer` and one `implementer` for each spec.** They stay alive for the whole plan and take turns per task, continued with `SendMessage`. | Clean split, one cold start per agent, and tasks still run in plan order, so each task sees the code of the earlier ones. On a long plan an agent's context can fill and compact; the ledger keeps the progress. | **Yes (user, 2026-11-24)** |

## 5. Decisions

### 5.1 Roles and models

| Role | Who | Model | Edits |
| --- | --- | --- | --- |
| Orchestrator | The main session | The session's model | Ledger, commits, PR body, rulings |
| `docs-writer` | Agent, one per spec | opus | `docs/` only (spec and plan) |
| `test-writer` | Agent, one per spec | sonnet | Test files only (5.3) |
| `implementer` | Agent, one per spec | sonnet | Everything except test files |
| `reviewer` | Agent, one per branch | opus | Nothing (read-only) |
| `pr-shipper` | Existing agent | sonnet | Nothing (git push and `gh` only) |

The user chose sonnet for tests and code, and opus for `docs-writer` and
`reviewer`.

### 5.2 Flow for one feature

1. **Brainstorm** (orchestrator and user). The questions and answers stay in
   the main session, because a subagent cannot ask the user.
2. **Spec and plan** (`docs-writer`). The orchestrator passes the decided
   points. `docs-writer` writes the spec, and the user approves it. Then
   `docs-writer` writes the plan with the `writing-plans` skill.
3. **Build, one task at a time, in plan order:**
   1. The orchestrator sends the task brief to `test-writer`.
   2. `test-writer` writes the tests, runs them, and reports the names and
      the failure output.
   3. **RED gate.** The orchestrator runs the tests itself. Each must fail
      because the behavior is missing (a missing export or a wrong value),
      not because of a typo or a broken import path. If not, back to step 2.
   4. The orchestrator sends the brief and the test file list to
      `implementer`, which writes the code until the tests pass.
   5. **GREEN gate.** The orchestrator runs the full suite, then
      `git diff --name-only` to confirm that `implementer` changed no test
      file.
   6. The orchestrator commits the tests and the code together in **one
      commit** (user, 2026-11-24), with the message from the plan, and
      writes the ledger line.
   - If `implementer` reports that a test is wrong, the orchestrator decides
     and records a `Ruling:` line. A test change always goes back to
     `test-writer`.
   - A task with no testable behavior (docs or config only) skips
     `test-writer`. The orchestrator records why in the ledger.
4. **Check and review.** One `npm run check`, then `reviewer` reviews the
   whole branch. The fix pass for critical and important findings uses the
   same pair and the same two gates.
5. **Ship.** The orchestrator writes the PR body and dispatches
   `pr-shipper`.

### 5.3 Test files and the path hook

- **Test files** are `**/*.test.ts`, `**/*.test.tsx`, `e2e/**`, and
  `src/test/**` (the fixtures and the Vitest setup).
- `implementer` has a `PreToolUse` hook on `Edit|Write` that blocks a test
  file path. `test-writer` has the reverse hook, which blocks any path that
  is not a test file.
- The hook calls one small script. The path rule in it is a pure function
  with its own unit test.
- **Known gap:** the hook does not see files written through `Bash` (for
  example `sed -i`). The GREEN gate's `git diff --name-only` check covers
  that gap.

### 5.4 Parallel work (new CLAUDE.md rule)

1. **Specs and plans:** always allowed in parallel. Each team works in its
   own worktree and branch.
2. **Code within one plan:** never in parallel.
3. **Code across features:** allowed only if the orchestrator compares the
   two plans' file lists and Interfaces blocks first and finds no shared
   file and no shared interface. Otherwise the second team waits until the
   first PR merges.
4. **Reviews:** allowed in parallel (read-only).
5. **`pr-shipper`:** one at a time. A second branch rebases onto `main`
   before it ships.

A **team** is one worktree, one branch, and its own `docs-writer`,
`test-writer`, `implementer`, and `reviewer`. The orchestrator is shared,
and so is `pr-shipper`.

### 5.5 Rules every agent file repeats

Every agent file states the repo rules that bind its role:

- Commit rules: Rule 7, no trailer.
- Rule 1: layers and pure functions in `src/lib/`.
- Rule 2: money formatters.
- Rule 3: stop and report, never invent a threshold.
- Rule 9: copy rule.
- Rule 10: colors only as tokens.
- No citations of paths outside the repo.
- The agent works only in the worktree path that the orchestrator passes.

## 6. Deliverables

- **New agent files:** `.claude/agents/docs-writer.md`, `test-writer.md`,
  `implementer.md`, `reviewer.md`.
- **The path-guard script and its unit test.** `scripts/` is the natural home
  next to `scripts/theme/`.
- **`CLAUDE.md`:**
  - Rule 8 steps 2–4 follow 5.2.
  - A new rule holds 5.4.
  - The folder list names the new files.
- **`docs/adr/0003-engineering-workflow.md`:** a dated update that records
  the roles, the gates, and the parallel rule.

## 7. Left to the builder

- The exact wording of each agent prompt, within 5.1–5.5.
- The script language for the hook (Node or `tsx`), as long as the path
  rule has a unit test and `npm run check` covers it.
- The report format each agent returns to the orchestrator. It must include
  the commands run and their output tails.

## 8. Verification

- `npm run check` passes (the new script test included, and markdownlint on
  the new files).
- **Hook proof:** a scripted check sends the hook one test path and one
  source path for each role, and the hook allows or blocks as 5.3 says.
- **Pilot after the merge:** one deferred minor (the "No amount" label on
  the Loans and Holdings tables) goes through the full loop on its own
  `fix/` branch.
