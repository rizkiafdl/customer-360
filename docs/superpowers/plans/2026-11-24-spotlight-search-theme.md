# Spotlight search, theme track — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Spotlight `--sp-*` tokens, Tailwind color names, panel and scrim CSS to `src/index.css`, and extend the contrast test to translucent layers.

**Architecture:** One of two plans for the spec. This track touches only `src/index.css` and `scripts/theme/`. The logic + UI plan (`2026-11-24-spotlight-search.md`) takes the names in "Interface to the UI plan" below and edits no file listed here.

**Tech Stack:** Tailwind CSS v4 (`@theme inline`), Vitest (node environment), TypeScript.

**Spec:** `docs/superpowers/specs/2026-11-24-spotlight-search-design.md` (5.7)

**Flow per task (Rule 8):** `test-writer` writes the tests, the orchestrator runs the RED gate, `implementer` writes the code, the orchestrator runs the GREEN gate and commits.

## Files

- Modify: `src/index.css`
- Modify: `scripts/theme/contrast.ts`
- Modify: `scripts/theme/contrast.test.ts`
- Create: `scripts/theme/spotlight-css.test.ts`

## Interface to the UI plan

- Tailwind colors (from `@theme inline`): `bg-sp-kbd`, `bg-sp-icon-bg`, `bg-sp-active-bg`, `text-sp-active-text`, `border-sp-divider`.
- CSS classes: `.spotlight-scrim` (the Radix overlay) and `.spotlight-panel` (the Radix content). They carry position, size, radius, background, border, shadow, `backdrop-filter`, the enter animation, the reduced-motion rule, and the fallback.

## Global Constraints

- Colors only as `oklch()` tokens in `src/index.css`: light in `:root`, dark in `.dark`. No `var()` as a token value that the contrast test reads.
- Text pairs ≥ 4.5:1, icon pairs ≥ 3:1. Every tested token must be inside the sRGB gamut.
- Write the new CSS rules at the top level of `index.css`, not inside `@layer`. Each top-level block must close with `}` at column 0 (the CSS test slices blocks this way).
- Edit nothing under `src/lib`, `src/components`, `src/pages`, or `e2e`.

## Review Focus

- A browser without `backdrop-filter`: an opaque `--card` panel and the darker scrim (Task 3 test).
- `prefers-reduced-motion: reduce`: no scrim or panel animation (Task 3 test).
- The panel over the page and over a card, in both themes, and the opaque fallback (Task 2 tests).
- `--sp-shadow` is not a color and must never reach `parseOklch` (Task 2 test).
- Dark `--sp-active-*` values are out of gamut if they keep the rounded chroma (Task 2 gamut test).

---

### Task 1: Contrast over translucent layers

**Files:** Modify `scripts/theme/contrast.ts`; Test `scripts/theme/contrast.test.ts`

**Interfaces:**

- Consumes: `oklchToLinearSrgb(value: string): [number, number, number]`, `contrastRatio(a: string, b: string): number` (existing).
- Produces: `parseAlpha(value: string): number` and `contrastOver(fg: string, layers: readonly string[]): number`.

- [ ] **Step 1 (test-writer): add to `contrast.test.ts`**
  - `describe('parseAlpha')`:
    - `it('is 1 with no alpha')`: `parseAlpha('oklch(0.5 0.1 120)')` → `1`.
    - `it('reads a percent alpha')`: `parseAlpha('oklch(1 0 0 / 74%)')` → `0.74`.
    - `it('reads a number alpha')`: `parseAlpha('oklch(1 0 0 / 0.3)')` → `0.3`.
  - `describe('contrastOver')`:
    - `it('matches contrastRatio on one opaque layer')`: `contrastOver('oklch(0.5693 0 0)', ['oklch(1 0 0)'])` `toBeCloseTo(4.48, 1)`.
    - `it('blends 50% black over white in gamma-encoded sRGB')`: `contrastOver('oklch(0 0 0)', ['oklch(1 0 0)', 'oklch(0 0 0 / 50%)'])` `toBeCloseTo(5.28, 1)`.
    - `it('lets an opaque top layer hide the base')`: `contrastOver('oklch(1 0 0)', ['oklch(1 0 0)', 'oklch(0 0 0)'])` `toBeCloseTo(21, 1)`.
    - `it('throws when the first layer is not opaque')`: `contrastOver('oklch(0 0 0)', ['oklch(1 0 0 / 50%)'])` throws `/opaque/`.
- [ ] **Step 2 (orchestrator, RED):** `npx vitest run scripts/theme/contrast.test.ts` → the 7 new tests FAIL with "parseAlpha is not a function" / "contrastOver is not a function"; the old tests pass.
- [ ] **Step 3 (implementer):** in `contrast.ts`, export `parseAlpha` and `contrastOver`. Blend from the bottom layer up in gamma-encoded sRGB: clip each layer's linear sRGB to [0, 1], encode (`c <= 0.0031308 ? 12.92c : 1.055c^(1/2.4) − 0.055`), `acc = acc × (1 − a) + layer × a`, decode the result back to linear (`c <= 0.04045 ? c/12.92 : ((c + 0.055)/1.055)^2.4`), then the WCAG ratio against the clipped luminance of `fg`.
- [ ] **Step 4 (orchestrator, GREEN):** `npm run test` → 0 failed.
- [ ] **Step 5 (orchestrator):** commit `test: measure contrast over translucent theme layers`.

### Task 2: The `--sp-*` tokens and their contrast pairs

**Files:** Modify `src/index.css`, `scripts/theme/contrast.test.ts`

**Interfaces:**

- Consumes: `contrastOver` (Task 1), `parseThemeBlocks`, `inGamut` (existing).
- Produces: the ten tokens below in `:root` and `.dark`.

- [ ] **Step 1 (test-writer): in the existing `describe.each(['dark', 'light'])` block of `contrast.test.ts`**
  - Constants: `SPOTLIGHT_STACKS = { 'the panel over --background': ['background', 'sp-scrim', 'sp-panel'], 'the panel over --card': ['card', 'sp-scrim', 'sp-panel'], 'the fallback panel': ['card'] }` and `SPOTLIGHT_PAIRS: [string, string | null, number][] = [['foreground', null, 4.5], ['muted-foreground', null, 4.5], ['muted-foreground', 'sp-kbd', 4.5], ['sp-active-text', 'sp-active-bg', 4.5], ['muted-foreground', 'sp-active-bg', 4.5], ['muted-foreground', 'sp-icon-bg', 3]]`.
  - `it.each` over every stack × pair, name `'--%s on %s + %s is at least %d:1'`: `contrastOver(get(fg), [...stack, extra].filter(Boolean).map(get))` ≥ the minimum (18 cases per theme).
  - `it('keeps --sp-shadow as a string the parser never reads')`: `tokens['sp-shadow']` matches `/^0 30px 80px oklch\(/`.
  - Extend the gamut test's `tested` set with `sp-scrim`, `sp-scrim-fallback`, `sp-panel`, `sp-panel-border`, `sp-divider`, `sp-active-bg`, `sp-active-text`, `sp-icon-bg`, `sp-kbd`.
- [ ] **Step 2 (orchestrator, RED):** `npx vitest run scripts/theme/contrast.test.ts` → the new cases FAIL with "--sp-scrim is missing from the light block" (and dark).
- [ ] **Step 3 (implementer):** add to `src/index.css`, `:root` and `.dark`, exactly the values in spec 5.7 "Tokens": `--sp-scrim`, `--sp-scrim-fallback`, `--sp-panel`, `--sp-panel-border`, `--sp-divider`, `--sp-active-bg`, `--sp-active-text`, `--sp-icon-bg`, `--sp-kbd`, `--sp-shadow`. One comment line above them: "Spotlight search (spec 2026-11-24-spotlight-search-design.md, 5.7)."
- [ ] **Step 4 (orchestrator, GREEN):** `npm run test` → 0 failed. The lowest Spotlight pair is about 4.75 (dark, `muted-foreground` on `sp-kbd`, over `--card`).
- [ ] **Step 5 (orchestrator):** commit `feat: add the spotlight theme tokens`.

### Task 3: Tailwind colors, panel and scrim CSS

**Files:** Modify `src/index.css`; Create `scripts/theme/spotlight-css.test.ts`

**Interfaces:**

- Consumes: the Task 2 tokens.
- Produces: "Interface to the UI plan" (top of this plan).

- [ ] **Step 1 (test-writer): create `spotlight-css.test.ts`** (`// @vitest-environment node`, read `src/index.css` like `contrast.test.ts`, helper `blockAfter(css, marker)` = text from `marker` to the first `\n}` after it).
  - `it.each(['kbd', 'icon-bg', 'active-bg', 'active-text', 'divider'])('maps --color-sp-%s in @theme inline')`: `blockAfter(css, '@theme inline')` contains `--color-sp-${name}: var(--sp-${name});`.
  - `it('defines the sp-fade and sp-pop keyframes')`: css contains `@keyframes sp-fade` and `@keyframes sp-pop`; `blockAfter(css, '@keyframes sp-pop')` contains `translateY(-8px) scale(.97)`.
  - `it('gives the scrim its blur and the fade')`: `blockAfter(css, '.spotlight-scrim {')` contains `var(--sp-scrim)`, `blur(14px) saturate(140%)`, `sp-fade .2s ease-out`.
  - `it('gives the panel the reference size and frost')`: `blockAfter(css, '.spotlight-panel {')` contains `top: 104px`, `width: min(680px, calc(100vw - 32px))`, `border-radius: 20px`, `var(--sp-panel)`, `var(--sp-panel-border)`, `var(--sp-shadow)`, `blur(32px) saturate(180%)`, `sp-pop .22s cubic-bezier(.2, .8, .2, 1)`.
  - `it('turns both animations off for reduced motion')`: `blockAfter(css, '@media (prefers-reduced-motion: reduce)')` contains `.spotlight-scrim`, `.spotlight-panel`, `animation: none`.
  - `it('falls back to an opaque panel without backdrop-filter')`: `blockAfter(css, '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))')` contains `var(--sp-scrim-fallback)` and `var(--card)`.
- [ ] **Step 2 (orchestrator, RED):** `npx vitest run scripts/theme/spotlight-css.test.ts` → 10 FAIL (strings not found).
- [ ] **Step 3 (implementer):** in `src/index.css`, add the five `--color-sp-*` lines to `@theme inline`; then, at the top level after the `.dark` block, `.spotlight-scrim` (`position: fixed; inset: 0; z-index: 50`), `.spotlight-panel` (`position: fixed; z-index: 50; left: 50%; transform: translateX(-50%); overflow: hidden; border: 1px solid …`), both with `-webkit-backdrop-filter` too, the two keyframes (the reference's, with `translateX(-50%)` kept in both `sp-pop` frames), the reduced-motion block, and the `@supports not` block. Values from spec 5.7.
- [ ] **Step 4 (orchestrator, GREEN):** `npm run test` → 0 failed; `npm run build` → exit 0.
- [ ] **Step 5 (orchestrator):** commit `feat: add the spotlight panel and scrim styles`.
