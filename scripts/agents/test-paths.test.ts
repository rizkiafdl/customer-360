// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { guardDecision, hookFilePath, isTestPath, pathViolations } from './test-paths.ts'

describe('isTestPath', () => {
  it.each([
    'src/lib/format.test.ts',
    'src/pages/CustomerDetail.test.tsx',
    'e2e/smoke.spec.ts',
    'src/test/fixtures.ts',
    'eslint.config.test.ts',
    '/Users/x/repo/.claude/worktrees/a/src/test/setup.ts',
    'C:\\repo\\e2e\\smoke.spec.ts',
  ])('counts %s as a test file', (path) => {
    expect(isTestPath(path)).toBe(true)
  })

  it.each([
    'src/lib/format.ts',
    'src/lib/latest.ts',
    'src/testing.ts',
    '/repo/.claude/worktrees/e2e-fix/src/App.tsx',
    '/repo/.claude/worktrees/e2e/src/App.tsx',
    'docs/adr/0003-engineering-workflow.md',
  ])('counts %s as source, not a test file', (path) => {
    expect(isTestPath(path)).toBe(false)
  })
})

describe('guardDecision', () => {
  it('blocks the implementer from a test file and names the test-writer', () => {
    expect(guardDecision('implementer', 'src/lib/format.test.ts')).toContain('test-writer')
  })

  it('lets the implementer edit source', () => {
    expect(guardDecision('implementer', 'src/lib/format.ts')).toBeNull()
  })

  it('blocks the test-writer from source and names the implementer', () => {
    expect(guardDecision('test-writer', 'src/lib/format.ts')).toContain('implementer')
  })

  it('lets the test-writer edit an e2e spec', () => {
    expect(guardDecision('test-writer', 'e2e/smoke.spec.ts')).toBeNull()
  })

  it('lets the docs-writer edit docs only', () => {
    expect(guardDecision('docs-writer', 'docs/superpowers/plans/x.md')).toBeNull()
    expect(guardDecision('docs-writer', 'src/lib/format.ts')).toEqual(expect.any(String))
  })
})

describe('hookFilePath', () => {
  it('reads file_path from an Edit or Write call', () => {
    expect(hookFilePath('{"tool_name":"Edit","tool_input":{"file_path":"/r/a.ts"}}')).toBe('/r/a.ts')
  })

  it('reads notebook_path from a NotebookEdit call', () => {
    expect(hookFilePath('{"tool_name":"NotebookEdit","tool_input":{"notebook_path":"/r/a.ipynb"}}')).toBe('/r/a.ipynb')
  })

  it.each(['not json', '{"tool_input":{}}'])('gives null when the path cannot be read (%s)', (stdin) => {
    expect(hookFilePath(stdin)).toBeNull()
  })
})

describe('protected files (only the orchestrator edits them)', () => {
  it.each([
    'vite.config.ts',
    'playwright.config.ts',
    'package.json',
    'package-lock.json',
    'scripts/agents/test-paths.ts',
    '.claude/agents/implementer.md',
    '/Users/x/repo/.claude/settings.json',
  ])('blocks the implementer and the test-writer from %s', (path) => {
    // A test can be switched off without touching a test file (test.exclude, the "test" script, the guard itself).
    expect(guardDecision('implementer', path)).toContain('orchestrator')
    expect(guardDecision('test-writer', path)).toContain('orchestrator')
  })

  it('does not treat a file inside a worktree as part of .claude/', () => {
    expect(guardDecision('implementer', '/repo/.claude/worktrees/w/src/lib/format.ts')).toBeNull()
    expect(guardDecision('test-writer', '/repo/.claude/worktrees/w/src/lib/format.test.ts')).toBeNull()
  })

  it('still protects the guard inside a worktree', () => {
    expect(guardDecision('implementer', '/repo/.claude/worktrees/w/scripts/agents/test-paths.ts')).toContain('orchestrator')
  })
})

describe('pathViolations', () => {
  it('lists the changed paths a role may not touch, for the RED and GREEN gates', () => {
    expect(pathViolations('test-writer', ['src/lib/a.test.ts', 'src/lib/a.ts', ''])).toEqual(['src/lib/a.ts'])
    expect(pathViolations('implementer', ['src/lib/a.ts', 'src/lib/a.test.ts', 'vite.config.ts'])).toEqual([
      'src/lib/a.test.ts',
      'vite.config.ts',
    ])
    expect(pathViolations('implementer', ['src/lib/a.ts'])).toEqual([])
  })
})
