# Agent Teams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `docs-writer`, `test-writer`, `implementer`, and `reviewer` agents, a path-guard hook that keeps tests and code apart, and the CLAUDE.md / ADR 0003 rules for the new flow and for parallel work.

**Architecture:** A pure path rule in `scripts/agents/test-paths.ts` (unit tested) and a thin stdin entry in `scripts/agents/guard-paths.ts` that each agent's `PreToolUse` hook calls. Four agent files in `.claude/agents/` carry the role prompts. CLAUDE.md Rule 8 and a new Rule 11 describe the flow, and ADR 0003 gets a dated update.

**Tech Stack:** TypeScript run by `tsx`, Vitest, Claude Code agent frontmatter (`model`, `tools`, `hooks`).

**Spec:** `docs/superpowers/specs/2026-11-24-agent-teams-design.md`

## Global Constraints

- Commits: Conventional Commits, author is the repo owner only, no `Co-Authored-By` trailer (Rule 7).
- No change to the app (`src/` outside tests), the data, CI, or `.claude/settings.json`.
- Models: `docs-writer` opus, `test-writer` sonnet, `implementer` sonnet, `reviewer` opus. `pr-shipper` unchanged.
- Test files: `**/*.test.ts`, `**/*.test.tsx`, `e2e/**`, `src/test/**` (spec 5.3).
- The orchestrator makes every commit. No new agent commits, pushes, or spawns agents.
- Docs: no citation of a path outside the repo.
- `npm run check` passes at the end of every task.

## Review Focus

1. A path whose name only contains "test" (`src/lib/latest.ts`, `src/testing.ts`, a worktree folder named `e2e-fix`) must count as source, not as a test file.
2. Absolute paths inside a worktree (`/…/.claude/worktrees/x/src/test/fixtures.ts`) and Windows separators must classify the same as repo-relative paths.
3. Hook input that cannot be read (bad JSON, no `file_path`) must block, not allow: the guard fails closed.
4. The hook command must still find the script when the agent works in a worktree (`$CLAUDE_PROJECT_DIR` is the session root, not the worktree).
5. A hook command that errors (exit code other than 0 or 2) does not block in Claude Code. The GREEN gate's `git diff --name-only` check stays the backstop, and the CLAUDE.md rule must say so.

Lines 1–3 are tests in Task 1. Line 4 is a manual check in Task 1, Step 6. Line 5 is text in Task 3.

---

### Task 1: Path rule and hook entry

**Files:**

- Create: `scripts/agents/test-paths.ts`
- Create: `scripts/agents/test-paths.test.ts`
- Create: `scripts/agents/guard-paths.ts`

**Interfaces:**

- Produces:
  - `type GuardRole = 'test-writer' | 'implementer' | 'docs-writer'`
  - `isTestPath(path: string): boolean`
  - `guardDecision(role: GuardRole, path: string): string | null` (null = allow; otherwise the block reason the agent reads)
  - `hookFilePath(stdin: string): string | null` (reads `tool_input.file_path`, or `tool_input.notebook_path`)
  - CLI: `npx --no-install tsx "$CLAUDE_PROJECT_DIR/scripts/agents/guard-paths.ts" <role>`, exit 0 = allow, exit 2 = block, with the reason on stderr.

- [ ] **Step 1: Write the failing tests** in `scripts/agents/test-paths.test.ts`:
  - `isTestPath` is true for `src/lib/format.test.ts`, `src/pages/CustomerDetail.test.tsx`, `e2e/smoke.spec.ts`, `src/test/fixtures.ts`, `eslint.config.test.ts`, `/Users/x/repo/.claude/worktrees/a/src/test/setup.ts`, and `C:\\repo\\e2e\\smoke.spec.ts`.
  - `isTestPath` is false for `src/lib/format.ts`, `src/lib/latest.ts`, `src/testing.ts`, `/repo/.claude/worktrees/e2e-fix/src/App.tsx`, and `docs/adr/0003-engineering-workflow.md`.
  - `guardDecision('implementer', 'src/lib/format.test.ts')` returns a string containing `test-writer`. `guardDecision('implementer', 'src/lib/format.ts')` returns null.
  - `guardDecision('test-writer', 'src/lib/format.ts')` returns a string containing `implementer`. `guardDecision('test-writer', 'e2e/smoke.spec.ts')` returns null.
  - `guardDecision('docs-writer', 'docs/superpowers/plans/x.md')` returns null. `guardDecision('docs-writer', 'src/lib/format.ts')` returns a string.
  - `hookFilePath('{"tool_name":"Edit","tool_input":{"file_path":"/r/a.ts"}}')` is `/r/a.ts`. The `notebook_path` form works too. `'not json'` and `'{"tool_input":{}}'` give null.

- [ ] **Step 2: Run** `npx vitest run scripts/agents/test-paths.test.ts`. Expected: FAIL, cannot resolve `./test-paths`.

- [ ] **Step 3: Implement `scripts/agents/test-paths.ts`.** Normalize `\` to `/`, then match by path segment: a file name ending `.test.ts` or `.test.tsx`, or a segment sequence `e2e/` or `src/test/` (exact segments, so `e2e-fix` does not match). `docs-writer` allows only paths with a `docs/` segment. The reasons name who owns the file: "Test files belong to test-writer. Report the test you think is wrong to the orchestrator." and "test-writer edits test files only. The implementer writes the code."

- [ ] **Step 4: Run** the same command. Expected: PASS. Then run `npm run test`. Expected: all files pass.

- [ ] **Step 5: Implement `scripts/agents/guard-paths.ts`** (I/O only, like `scripts/excel-to-json.ts`). Read stdin and the role from `process.argv[2]`. An unknown role, or a null `hookFilePath`, writes "path guard: cannot read the file path" to stderr and exits 2 (fail closed). Otherwise, exit 2 with the reason, or exit 0.

- [ ] **Step 6: Hook proof** (spec section 8). Run, from the repo root:

```bash
for c in "implementer src/lib/a.ts" "implementer src/lib/a.test.ts" "test-writer e2e/x.spec.ts" "test-writer src/lib/a.ts"; do
  set -- $c
  echo "{\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"$PWD/.claude/worktrees/w/$2\"}}" \
    | CLAUDE_PROJECT_DIR=$PWD npx --no-install tsx "$PWD/scripts/agents/guard-paths.ts" $1; echo "$1 $2 -> $?"
done
echo 'bad' | npx --no-install tsx scripts/agents/guard-paths.ts implementer; echo "bad -> $?"
```

Expected: `0`, `2`, `0`, `2`, and `bad -> 2`.

- [ ] **Step 7: Commit.** Run `npm run check` (expected exit 0), then:

```bash
git add scripts/agents
git commit -m "feat: add the path guard that keeps test and code edits apart"
```

### Task 2: Agent files

**Files:**

- Create: `.claude/agents/docs-writer.md`, `.claude/agents/test-writer.md`, `.claude/agents/implementer.md`, `.claude/agents/reviewer.md`

**Interfaces:**

- Consumes: the Task 1 CLI.
- Produces: agent names `docs-writer`, `test-writer`, `implementer`, `reviewer`, which Task 3 names in CLAUDE.md.

No unit test: these are prompt files (spec 5.2, "docs or config only"). Steps 2–3 are the check.

- [ ] **Step 1: Write the four files** in the shape of `.claude/agents/pr-shipper.md`: frontmatter, then a short role prompt.

| File | `model` | `tools` | `hooks` |
| --- | --- | --- | --- |
| `docs-writer.md` | `opus` | Read, Grep, Glob, Edit, Write, Bash, Skill | `PreToolUse`, matcher `Edit\|Write\|NotebookEdit`, role `docs-writer` |
| `test-writer.md` | `sonnet` | Read, Grep, Glob, Edit, Write, Bash | the same matcher, role `test-writer` |
| `implementer.md` | `sonnet` | Read, Grep, Glob, Edit, Write, Bash | the same matcher, role `implementer` |
| `reviewer.md` | `opus` | Read, Grep, Glob, Bash | none (it has no edit tool) |

Hook command, for each role: `npx --no-install tsx "$CLAUDE_PROJECT_DIR/scripts/agents/guard-paths.ts" <role>`.

Each prompt states:

- the inputs it gets from the orchestrator:
  - **all:** `WORKTREE`.
  - **`docs-writer`:** the decided points, the spec path, and the plan path.
  - **`test-writer` / `implementer`:** the task brief path. `implementer` also gets the test file list.
  - **`reviewer`:** the review package, the plan, the spec, and the ledger rulings.
- that it works only inside `WORKTREE` and never commits, pushes, or spawns agents;
- the repo rules from spec 5.5;
- its stop conditions:
  - a missing threshold (Rule 3) → stop and report the question;
  - a test that looks wrong (`implementer`) → stop and report the test and the reason;
- its report: the files changed, every command run with the tail of its output, and open questions.

Role-specific lines:

- **`test-writer`:** writes only the tests the brief names, with the brief's exact values. It runs them and reports each failure message. It confirms that each test fails because the behavior is missing, not because of a typo or a bad import path.
- **`implementer`:** makes the named tests pass with the smallest change, then runs `npm run test` and reports the result. It never edits, skips, or loosens a test.
- **`reviewer`:** read-only. It uses Bash only for `git`, `npx tsc -b`, `npm run lint`, and `npm run test`. It reports Critical / Important / Minor with file:line, plus "Declined to judge", in at most 900 words.
- **`docs-writer`:** writes the spec in the Superpowers default format (Rule 4), and the plan with the `superpowers:writing-plans` skill. It asks no questions: if a decision is missing, it stops and lists it.

- [ ] **Step 2: Run** `npx markdownlint-cli2 ".claude/agents/*.md"`. Expected: 0 issues.

- [ ] **Step 3: Run** `grep -H "^model:\|guard-paths.ts" .claude/agents/*.md`. Expected: each of the 4 new files shows its model from the table, and the 3 editing agents show the guard command with their own role.

- [ ] **Step 4: Commit.**

```bash
git add .claude/agents
git commit -m "chore: add the docs-writer, test-writer, implementer, and reviewer agents"
```

### Task 3: CLAUDE.md rules and ADR 0003 update

**Files:**

- Modify: `CLAUDE.md`: Rule 8 steps 2–4, a new Rule 11, and the folder list (`scripts/agents/`, the 4 agent files).
- Modify: `docs/adr/0003-engineering-workflow.md`: append `## Update, 2026-11-24: agent teams`.

**Interfaces:**

- Consumes: the agent names from Task 2 and the CLI from Task 1.

No unit test (docs only). Step 2 is the check.

- [ ] **Step 1: Edit.**
  - **Rule 8, step 2:** `docs-writer` writes the spec and the plan from the brainstorm's decisions.
  - **Rule 8, step 3:** the per-task loop from spec 5.2. `test-writer` → RED gate → `implementer` → GREEN gate (full suite plus `git diff --name-only` for test files) → one commit by the orchestrator. There is one pair per spec, continued with `SendMessage`, and tasks run in plan order. A wrong test goes back to `test-writer` with a `Ruling:` line.
  - **Rule 8, step 4:** `reviewer` reviews the whole branch. The fix pass uses the same pair and gates.
  - **Rule 8, last line:** the path hook can fail open (Review Focus 5), so the diff check is required.
  - **Rule 11 "Parallel work":** spec 5.4, items 1–5, and the definition of a team.
  - **ADR 0003 update:**
    - Context: one paragraph on why the roles are split.
    - The roles table from spec 5.1.
    - The two gates.
    - The parallel rule.
    - Alternatives A and B from spec section 4, each with why it was rejected.
    - A link to the spec.

- [ ] **Step 2: Run** `npm run check`. Expected: exit 0.

- [ ] **Step 3: Commit.**

```bash
git add CLAUDE.md docs/adr/0003-engineering-workflow.md
git commit -m "docs: describe the agent team flow and the parallel work rule"
```
