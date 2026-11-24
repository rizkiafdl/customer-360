/**
 * Gate check for the orchestrator (CLAUDE.md Rule 8). Reads changed paths, one
 * per line, from stdin (`git diff --name-only` and `git ls-files -o --exclude-standard`),
 * prints each path the role may not touch, and exits 1 if there is one.
 * Run: `npx tsx scripts/agents/check-paths.ts <role>`.
 */
import { GUARD_ROLES, pathViolations, type GuardRole } from './test-paths.ts'

async function main(): Promise<void> {
  const role = process.argv[2]
  if (!GUARD_ROLES.includes(role as GuardRole)) {
    process.stderr.write(`check-paths: unknown role "${String(role)}"\n`)
    process.exitCode = 1
    return
  }
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
  const paths = Buffer.concat(chunks).toString('utf8').split('\n').map((line) => line.trim())
  const violations = pathViolations(role as GuardRole, paths)
  for (const path of violations) process.stdout.write(`${path}\n`)
  if (violations.length) process.exitCode = 1
}

main().catch((error: unknown) => {
  process.stderr.write(`check-paths: ${String(error)}\n`)
  process.exitCode = 1
})
