// @vitest-environment node
/**
 * Runs the PreToolUse hook command from each editing agent file, the way
 * Claude Code runs it (`sh -c`). A hook that cannot start must block (exit 2),
 * because Claude Code lets the edit through on any other non-zero exit.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.join(import.meta.dirname, '../..')

function hookCommand(agent: string): string {
  const text = readFileSync(path.join(root, '.claude/agents', `${agent}.md`), 'utf8')
  const match = /^\s+command: '(.+)'$/m.exec(text)
  if (!match?.[1]) throw new Error(`${agent}.md has no hook command`)
  return match[1]
}

function runHook(agent: string, projectDir: string, filePath: string): number | null {
  const input = JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: filePath } })
  return spawnSync('sh', ['-c', hookCommand(agent)], {
    cwd: root,
    input,
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
  }).status
}

describe.each(['test-writer', 'implementer', 'docs-writer'])('%s hook command', (agent) => {
  it('blocks the edit when the guard script cannot be found', () => {
    expect(runHook(agent, '/nonexistent', path.join(root, 'docs/x.md'))).toBe(2)
  }, 30_000)
})

describe('implementer hook command', () => {
  it('allows a source edit when the guard runs', () => {
    expect(runHook('implementer', root, path.join(root, 'src/lib/format.ts'))).toBe(0)
  }, 30_000)
})
