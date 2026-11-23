import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Layer rule (docs/adr/0004-layered-code-structure.md). Each pattern matches a
// layer in both import forms: the `@/` alias and a relative path that reaches
// the same folder (`../data`, `../../data/index`).
const layer = (alias, relative) => `^(@/${alias}|(\\.{1,2}/)+${relative})(/.*)?$`
const DATA = {
  regex: layer('data', 'data'),
  message: 'Only src/lib/selectors/ may import src/data (ADR 0004).',
}
const SELECTORS = {
  regex: layer('lib/selectors', '(lib/)?selectors'),
  message: 'Selectors are the layer above insights and domain (ADR 0004).',
}
const INSIGHTS = {
  regex: layer('lib/insights', '(lib/)?insights'),
  message: 'Insights are the layer above domain (ADR 0004).',
}
const UI = {
  regex: layer('(pages|components|hooks|routes|main)', '(pages|components|hooks|routes|main)'),
  message: 'UI is the top layer. Nothing below it may import it (ADR 0004).',
}
const ANY_SRC_OUTSIDE_TYPES = {
  regex: '^(@/(?!types(/|$))|\\.\\./)',
  message: 'This layer may import only src/types (ADR 0004).',
}
const restrict = (...patterns) => ({
  rules: { 'no-restricted-imports': ['error', { patterns }] },
})

export default defineConfig([
  // .claude/worktrees/ holds local Claude Code agent checkouts, not repo files.
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results', '.claude/worktrees']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Build-time Node code: the Excel converter, e2e tests, and tool configs.
    files: ['scripts/**/*.ts', 'e2e/**/*.ts', '*.config.{js,ts}', 'eslint.config.test.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // shadcn/ui generated components export variants next to components.
    files: ['src/components/ui/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // shadcn's generated sidebar hook sets state once in its effect to read
    // the first viewport width. Kept as generated.
    files: ['src/hooks/use-mobile.ts'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  // Default for every file under src/: no import of src/data. A file in a
  // folder with no layer block (a new `src/utils/`, say) is still covered.
  // Each layer block below replaces this setting for its own files.
  { files: ['src/**/*.{ts,tsx}'], ...restrict(DATA) },
  // One block per layer. The `files` globs do not overlap: a later block that
  // sets the same rule for the same file would replace this one, not merge.
  {
    files: [
      'src/*.{ts,tsx}',
      'src/pages/**/*.{ts,tsx}',
      'src/components/**/*.{ts,tsx}',
      'src/hooks/**/*.{ts,tsx}',
    ],
    ...restrict(DATA),
  },
  { files: ['src/lib/selectors/**/*.{ts,tsx}'], ...restrict(UI) },
  { files: ['src/lib/insights/**/*.{ts,tsx}'], ...restrict(DATA, SELECTORS, UI) },
  { files: ['src/lib/domain/**/*.{ts,tsx}'], ...restrict(DATA, SELECTORS, INSIGHTS, UI) },
  { files: ['src/data/**/*.{ts,tsx}'], ...restrict(ANY_SRC_OUTSIDE_TYPES) },
  {
    // Shared helpers (format.ts, utils.ts) import nothing from src/ except
    // each other, so a helper's test may import the helper.
    files: ['src/lib/*.{ts,tsx}'],
    ...restrict({
      regex: '^(@/|\\.\\./|\\./(domain|insights|selectors)(/|$))',
      message: 'Shared helpers in src/lib/ import nothing from src/ (ADR 0004).',
    }),
  },
  { files: ['src/types/**/*.ts'], ...restrict(ANY_SRC_OUTSIDE_TYPES) },
])
