/**
 * PreToolUse hook entry for the agent edit guard. Each editing agent's
 * frontmatter runs `npx --no-install tsx "$CLAUDE_PROJECT_DIR/scripts/agents/guard-paths.ts" <role>`.
 * Reads the hook input from stdin. Exit 0 allows the edit; exit 2 blocks it, and
 * Claude Code shows the stderr reason to the agent. Unreadable input blocks (fail closed).
 */
import { GUARD_ROLES, guardDecision, hookFilePath, type GuardRole } from './test-paths.ts'

const BLOCK = 2

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

async function main(): Promise<void> {
  const role = process.argv[2]
  const path = hookFilePath(await readStdin())
  if (!GUARD_ROLES.includes(role as GuardRole) || path === null) {
    process.stderr.write('path guard: cannot read the file path or the role, so the edit is blocked.\n')
    process.exitCode = BLOCK
    return
  }
  const reason = guardDecision(role as GuardRole, path)
  if (reason !== null) {
    process.stderr.write(`${reason}\n`)
    process.exitCode = BLOCK
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`path guard: ${String(error)}\n`)
  process.exitCode = BLOCK
})
