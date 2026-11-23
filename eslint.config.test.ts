// @vitest-environment node
/**
 * Proves that eslint.config.js enforces the layer rule (ADR 0004): each bad
 * import is a `no-restricted-imports` error, and each allowed import is not.
 */
import path from 'node:path'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const eslint = new ESLint({ cwd: import.meta.dirname })

/** Number of `no-restricted-imports` errors for `source` imported from `file`. */
async function layerErrors(file: string, source: string): Promise<number> {
  const code = `import * as target from '${source}'\nexport const used = target\n`
  const [result] = await eslint.lintText(code, {
    filePath: path.join(import.meta.dirname, file),
  })
  return (result?.messages ?? []).filter((m) => m.ruleId === 'no-restricted-imports').length
}

describe('layer rule', () => {
  it.each([
    // Only selectors import src/data, in both import forms.
    ['src/pages/X.tsx', '@/data'],
    ['src/pages/X.tsx', '../data'],
    ['src/components/X.tsx', '../data/index'],
    ['src/components/ui/x.tsx', '@/data/index'],
    ['src/routes.tsx', './data'],
    ['src/lib/domain/x.ts', '@/data'],
    ['src/lib/domain/x.ts', '../../data/index'],
    ['src/lib/domain/x.test.ts', '@/data'],
    ['src/lib/insights/x.ts', '@/data'],
    ['src/lib/format.ts', '@/data'],
    // A folder with no layer block of its own still may not import src/data.
    ['src/utils/x.ts', '@/data'],
    ['src/lib/newdir/x.ts', '../../data'],
    ['src/test/x.ts', '@/data'],
    // No upward imports.
    ['src/lib/domain/x.ts', '@/lib/selectors/book'],
    ['src/lib/domain/x.ts', '../selectors/book'],
    ['src/lib/domain/x.ts', '@/lib/insights'],
    ['src/lib/domain/x.ts', '@/pages/HomePage'],
    ['src/lib/domain/x.ts', '../../components/X'],
    ['src/lib/insights/x.ts', '@/lib/selectors/book'],
    ['src/lib/insights/x.ts', '../selectors'],
    ['src/lib/selectors/x.ts', '@/pages/HomePage'],
    ['src/lib/selectors/x.ts', '../../routes'],
    ['src/data/x.ts', '@/lib/domain'],
    ['src/data/x.ts', '../lib/domain'],
    ['src/lib/format.ts', '@/lib/domain'],
    ['src/lib/format.ts', './domain'],
    ['src/lib/format.ts', '../data'],
    ['src/types/x.ts', '@/lib/domain'],
    ['src/types/x.ts', '../lib/format'],
    // src/hooks/ (shadcn's hooks folder) is part of the UI layer.
    ['src/lib/domain/x.ts', '@/hooks/use-mobile'],
    ['src/lib/selectors/x.ts', '../../hooks/use-mobile'],
    ['src/hooks/use-x.ts', '@/data'],
  ])('%s may not import %s', async (file, source) => {
    expect(await layerErrors(file, source)).toBe(1)
  })

  it.each([
    ['src/lib/selectors/x.ts', '@/data'],
    ['src/lib/selectors/x.ts', '../../data'],
    ['src/lib/selectors/x.ts', '@/lib/domain'],
    ['src/lib/selectors/x.ts', './dataset'],
    ['src/pages/X.tsx', '@/lib/domain'],
    ['src/pages/X.tsx', '@/lib/selectors/book'],
    ['src/pages/X.tsx', '@/lib/format'],
    ['src/components/ui/x.tsx', '@/lib/utils'],
    ['src/lib/insights/x.ts', '@/lib/domain'],
    ['src/lib/domain/x.ts', '@/lib/format'],
    ['src/lib/domain/x.ts', '@/types'],
    ['src/lib/domain/x.ts', './portfolio'],
    ['src/data/index.ts', '@/types'],
    ['src/data/index.ts', './profiles.json'],
    ['src/types/index.ts', './profile.ts'],
    ['src/lib/format.ts', 'clsx'],
    ['src/lib/format.test.ts', './format'],
    ['src/components/ui/x.tsx', '@/hooks/use-mobile'],
    ['src/hooks/use-x.ts', '@/lib/selectors/book'],
  ])('%s may import %s', async (file, source) => {
    expect(await layerErrors(file, source)).toBe(0)
  })
})
