/**
 * The path rule behind the agent edit guard (spec
 * docs/superpowers/specs/2026-11-24-agent-teams-design.md, section 5.3).
 * Test files belong to test-writer, everything else to implementer, and
 * docs-writer edits docs/ only. Protected files (test config, package files,
 * the guard, `.claude/`) belong to the orchestrator: an agent could switch a
 * test off through them without touching a test file. Pure functions; the
 * hook entry is guard-paths.ts and the gate check is check-paths.ts.
 */

export type GuardRole = 'test-writer' | 'implementer' | 'docs-writer'

export const GUARD_ROLES: readonly GuardRole[] = ['test-writer', 'implementer', 'docs-writer']

// Segment matches, so a folder such as `e2e-fix` or a file such as `latest.ts` does not count.
const TEST_FILE = /\.test\.tsx?$/
const TEST_DIR = /(^|\/)(e2e|src\/test)\//
const DOCS_DIR = /(^|\/)docs\//
const PROTECTED_FILE = /(^|\/)(vite\.config\.ts|playwright\.config\.ts|package\.json|package-lock\.json)$/
const PROTECTED_DIR = /(^|\/)(scripts\/agents|\.claude)\//
// A worktree checkout sits under .claude/worktrees/<name>/. The rest of the path is the repo path.
const WORKTREE_PREFIX = /^.*\/\.claude\/worktrees\/[^/]+\//

const toPosix = (path: string): string => path.replace(/\\/g, '/').replace(WORKTREE_PREFIX, '')

function isProtectedPath(path: string): boolean {
  const posix = toPosix(path)
  return PROTECTED_FILE.test(posix) || PROTECTED_DIR.test(posix)
}

/** True for `*.test.ts(x)`, anything under `e2e/`, and anything under `src/test/`. */
export function isTestPath(path: string): boolean {
  const posix = toPosix(path)
  return TEST_FILE.test(posix) || TEST_DIR.test(posix)
}

/** Null when `role` may edit `path`; otherwise the reason the agent reads when the edit is blocked. */
export function guardDecision(role: GuardRole, path: string): string | null {
  if (role !== 'docs-writer' && isProtectedPath(path)) {
    return `${path} is protected. Only the orchestrator edits it. Report the change you need.`
  }
  switch (role) {
    case 'implementer':
      return isTestPath(path)
        ? `${path} is a test file. Test files belong to test-writer. Report the test you think is wrong to the orchestrator.`
        : null
    case 'test-writer':
      return isTestPath(path) ? null : `${path} is not a test file. test-writer edits test files only. The implementer writes the code.`
    case 'docs-writer':
      return DOCS_DIR.test(toPosix(path)) ? null : `${path} is outside docs/. docs-writer edits docs/ only.`
  }
}

/** The changed paths `role` may not touch. The orchestrator's RED and GREEN gates feed it `git` output. */
export function pathViolations(role: GuardRole, paths: readonly string[]): string[] {
  return paths.filter((path) => path !== '' && guardDecision(role, path) !== null)
}

/** The file path of an Edit, Write, or NotebookEdit call from the PreToolUse hook input, or null. */
export function hookFilePath(stdin: string): string | null {
  try {
    const input: unknown = JSON.parse(stdin)
    if (typeof input !== 'object' || input === null || !('tool_input' in input)) return null
    const toolInput = input.tool_input
    if (typeof toolInput !== 'object' || toolInput === null) return null
    const path = 'file_path' in toolInput ? toolInput.file_path : 'notebook_path' in toolInput ? toolInput.notebook_path : null
    return typeof path === 'string' && path !== '' ? path : null
  } catch {
    return null
  }
}
