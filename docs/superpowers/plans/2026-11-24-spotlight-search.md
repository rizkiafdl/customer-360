# Spotlight search, logic + UI track — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `CustomerSearch` with a Spotlight search (customers, filters, pages) opened from the top bar or ⌘K / Ctrl+K, with a "Recently viewed" list in `localStorage`.

**Architecture:** Pure helpers (`keyboard.ts`, `recent-customers.ts`) and a selector (`spotlight.ts`) come first. Two render-only components follow: `SpotlightSearch` (Radix `Dialog.Root`, trigger, shortcut) and `Spotlight` (dialog content, combobox, listbox). `CustomerPage` records each visit.

**Tech Stack:** React 19, React Router, `Dialog` from `radix-ui`, Tailwind v4, Vitest + RTL + user-event, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-24-spotlight-search-design.md` (5.3–5.6, 5.8, 7)

**Flow per task (Rule 8):** `test-writer` writes the tests, the orchestrator runs the RED gate, `implementer` writes the code, the orchestrator runs the GREEN gate and commits. Tasks 8 and 9 are orchestrator-only (no test-writer, no implementer).

## Files

- Create: `src/lib/keyboard.ts`, `src/lib/keyboard.test.ts`
- Create: `src/lib/recent-customers.ts`, `src/lib/recent-customers.test.ts`
- Create: `src/lib/selectors/spotlight.ts`, `src/lib/selectors/spotlight.test.ts`
- Create: `src/pages/CustomerPage.test.tsx`
- Modify: `src/pages/CustomerPage.tsx`, `src/test/setup.ts`
- Create: `src/components/Spotlight.tsx`, `src/components/Spotlight.test.tsx`
- Create: `src/components/SpotlightSearch.tsx`, `src/components/SpotlightSearch.test.tsx`
- Modify: `src/components/AppShell.tsx`, `src/components/AppShell.test.tsx`, `src/routes.test.tsx`, `e2e/smoke.spec.ts`
- Delete: `src/components/CustomerSearch.tsx`
- Modify: `src/lib/selectors/customer360.ts`, `src/lib/selectors/customer360.test.ts`, `src/pages/CustomerDetail.test.tsx`, `src/pages/CustomerDetail.all.test.tsx`
- Modify (orchestrator): `CLAUDE.md`, `package.json`, `package-lock.json`
- Delete (orchestrator): `src/components/ui/command.tsx`, `src/components/ui/popover.tsx`

## Interface from the theme plan

`2026-11-24-spotlight-search-theme.md` owns `src/index.css`. This plan edits no file in that plan and uses only these names from it:

- Tailwind colors: `bg-sp-kbd`, `bg-sp-icon-bg`, `bg-sp-active-bg`, `text-sp-active-text`, `border-sp-divider`.
- CSS classes: `spotlight-scrim` (on `Dialog.Overlay`), `spotlight-panel` (on `Dialog.Content`). They carry position, size, frost, shadow, animation, reduced motion, and the fallback, so the components add none of these.
- Existing tokens: `bg-primary`, `text-primary-foreground`, `bg-muted`, `text-muted-foreground`, `border-border`, `text-foreground`.

## Global Constraints

- Layers (ADR 0004): `src/lib/*.ts` helpers import nothing from `src/`; only `spotlight.ts` (a selector) reads data, through `getCustomerRows()` and `getPortfolio(null)`.
- Money only through `formatIDR()` / `formatIDRShort()`. Both output no-break spaces: tests write them as ` `.
- No hex, `rgb()`, or `oklch()` in `src/components/` or `src/pages/`.
- Exact copy from spec 5.4. The no-match quotes are `“` and `”`.
- jsdom's `navigator.platform` is `''`, so component tests see `Ctrl K`.

## Review Focus

- Blocked or corrupt `localStorage`: empty recent list, no crash (Task 2 tests).
- A whitespace-only query shows the empty-query sections (Task 3 test).
- ⌘K / Ctrl+K while focus is in another input still toggles the panel (Task 6 test).
- Enter with no rows neither navigates nor closes (Task 5 test).
- Reopening the panel starts with an empty query and the first row active (Task 6 test).

---

### Task 1: Keyboard helpers

**Files:** Create `src/lib/keyboard.ts`; Test `src/lib/keyboard.test.ts`

**Interfaces:** Produces `isApplePlatform(platform: string): boolean`, `shortcutLabel(platform: string): string`, `isSpotlightShortcut(event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey'>): boolean`, `wrapIndex(index: number, count: number): number`.

- [ ] **Step 1 (test-writer):**
  - `it.each([['MacIntel', true], ['iPhone', true], ['iPad', true], ['Win32', false], ['Linux x86_64', false], ['', false]])('isApplePlatform(%j) is %s')`.
  - `it('labels the shortcut ⌘K on Apple and Ctrl K elsewhere')`: `shortcutLabel('MacIntel')` → `'⌘K'`, `shortcutLabel('Win32')` → `'Ctrl K'`.
  - `it.each` `isSpotlightShortcut`: `{ key: 'k', metaKey: true, ctrlKey: false }` → true; `{ key: 'K', metaKey: false, ctrlKey: true }` → true; `{ key: 'k', metaKey: false, ctrlKey: false }` → false; `{ key: 'j', metaKey: false, ctrlKey: true }` → false.
  - `it.each([[-1, 10, 9], [10, 10, 0], [3, 10, 3], [0, 0, 0], [-1, 0, 0]])('wrapIndex(%d, %d) is %d')`.
- [ ] **Step 2 (RED):** `npx vitest run src/lib/keyboard.test.ts` → FAIL, cannot resolve `./keyboard`.
- [ ] **Step 3 (implementer):** `isApplePlatform` is `/Mac|iPhone|iPad/.test(platform)`; the shortcut test is `(metaKey || ctrlKey) && key.toLowerCase() === 'k'`.
- [ ] **Step 4 (GREEN):** `npm run test` → 0 failed. **Step 5:** commit `feat: add the spotlight keyboard helpers`.

### Task 2: Recent customers in storage

**Files:** Create `src/lib/recent-customers.ts`; Test `src/lib/recent-customers.test.ts`

**Interfaces:** Produces `RECENT_CUSTOMERS_KEY = 'recent-customers'`, `RECENT_CUSTOMERS_LIMIT = 5`, `parseRecentCustomers(raw: string | null): number[]`, `pushRecentCustomer(ids: readonly number[], id: number): number[]`, `readRecentCustomers(): number[]`, `recordCustomerVisit(id: number): void`.

- [ ] **Step 1 (test-writer):** `beforeEach(() => localStorage.clear())`, `afterEach(() => vi.restoreAllMocks())`.
  - `it.each([[null, []], ['not json', []], ['{"a":1}', []], ['[4857,2759]', [4857, 2759]], ['[4857,"x",-1,0,1.5,2759]', [4857, 2759]], ['[1,1,2]', [1, 2]], ['[1,2,3,4,5,6]', [1, 2, 3, 4, 5]]])('parseRecentCustomers(%j) is %j')`.
  - `it.each([[[2759, 4857], 4857, [4857, 2759]], [[1, 2, 3, 4, 5], 6, [6, 1, 2, 3, 4]], [[], 7, [7]]])('pushRecentCustomer(%j, %d) is %j')`.
  - `it('reads the stored list')`: set `'recent-customers'` to `'[4857]'` → `readRecentCustomers()` is `[4857]`.
  - `it('reads [] when storage is blocked')`: `vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })` → `[]`.
  - `it('records visits, latest first')`: `recordCustomerVisit(4857)`, `recordCustomerVisit(2759)` → `localStorage.getItem('recent-customers')` is `'[2759,4857]'`.
  - `it('drops the write when storage is blocked')`: `setItem` spy throws → `expect(() => recordCustomerVisit(1)).not.toThrow()`.
- [ ] **Step 2 (RED):** `npx vitest run src/lib/recent-customers.test.ts` → FAIL, cannot resolve module.
- [ ] **Step 3 (implementer):** parse keeps positive safe integers (`Number.isSafeInteger(n) && n > 0`), first occurrence, at most 5; the storage calls each sit in `try/catch`, the same as `src/lib/theme.ts`.
- [ ] **Step 4 (GREEN):** `npm run test` → 0 failed. **Step 5:** commit `feat: keep the recently viewed customers in storage`.

### Task 3: Spotlight selector

**Files:** Create `src/lib/selectors/spotlight.ts`; Test `src/lib/selectors/spotlight.test.ts`

**Interfaces:**

- Consumes: `CustomerRow`, `buildCustomerRows(data)`, `getCustomerRows()` from `./customers`; `Portfolio`, `buildPortfolio(data, band)`, `getPortfolio(band)` from `./portfolio`; `RuleId` from `@/lib/insights`.
- Produces (exact types in spec 5.5): `SpotlightKind`, `SpotlightItem { key, kind, title, subtitle, subtitleTitle, count, to }`, `SpotlightSection { title, items }`, `SpotlightFilter { id, label, count, to }`, `SpotlightSource { rows, filters }`, `spotlightFilters(portfolio)`, `customerSubtitle(row)`, `buildSpotlightSections(source, query, recentIds)`, `noMatchText(query)`, `getSpotlightSections(query, recentIds)`.

- [ ] **Step 1 (test-writer):** fixture source is `{ rows: buildCustomerRows(fixtureDataset), filters: spotlightFilters(buildPortfolio(fixtureDataset, null)) }`. `keys(s)` is `s.items.map((i) => i.key)`.
  - `it('builds seven filters with counts and links')`: fixture `spotlightFilters(...)` → `[id, label, count, to]` tuples `['cash-heavy', 'Cash-heavy AUM', 0, '/customers?rule=cash-heavy']`, `['investment-gap-reksa', 'No REKSA', 0, …]`, `['investment-gap-ori', 'No ORI', 0, …]`, `['investment-gap-banca', 'No BANCA', 1, …]`, `['no-aum', 'No AUM', 2, …]`, `['high-income-no-banca', 'High income, no BANCA', 1, …]`, `['kyc', 'With KYC note', 1, '/customers?kyc=yes']` (each `…` is `/customers?rule=<id>`).
  - `it('writes the customer subtitle with and without a chip')`: `customerSubtitle({ aum: 1e9, chip: 'No BANCA' })` → `'AUM Rp 1 M · No BANCA'`; `chip: null` → `'AUM Rp 1 M'`.
  - `it('writes the no-match line')`: `noMatchText('zzz')` → `'No customer, filter or page matches “zzz”.'`.
  - `it('shows Recently active, Quick filters, and Go to for an empty query')`: titles `['Recently active', 'Quick filters', 'Go to']`; keys `['customer-2', 'customer-1', 'customer-3', 'customer-4']`, `['filter-cash-heavy', 'filter-investment-gap-reksa', 'filter-kyc']`, `['page-portfolio', 'page-customers']`; item `customer-1` equals `{ key: 'customer-1', kind: 'customer', title: 'Customer 1', subtitle: 'AUM Rp 1 M · No BANCA', subtitleTitle: 'AUM Rp 1.000.000.000', count: null, to: '/customers/1' }`; item `filter-kyc` equals `{ key: 'filter-kyc', kind: 'filter', title: 'With KYC note', subtitle: 'Open Customers filtered', subtitleTitle: null, count: 1, to: '/customers?kyc=yes' }`; item `page-customers` equals `{ key: 'page-customers', kind: 'page', title: 'Customers', subtitle: 'Ranked list with preview', subtitleTitle: null, count: null, to: '/customers' }`.
  - `it('treats a whitespace query as empty')`: `'   '` gives the same result as `''`.
  - `it('puts real recent IDs first and skips them in Recently active')`: recent `[3, 99]` → titles start `['Recently viewed', 'Recently active']`; keys `['customer-3']`, `['customer-2', 'customer-1', 'customer-4']`.
  - `it('hides Recently viewed when no stored ID is a customer')`: recent `[99]` → no section titled `Recently viewed`.
  - `it.each` over queries → `[title, keys]` per section: `'1'` → `[['Customers', ['customer-1']]]`; `' NO '` → `[['Filters', ['filter-investment-gap-reksa', 'filter-investment-gap-ori', 'filter-investment-gap-banca', 'filter-no-aum', 'filter-high-income-no-banca', 'filter-kyc']]]`; `'port'` → `[['Pages', ['page-portfolio']]]`; `'1a'` → `[]`; `'zzz'` → `[]`.
  - Real data, `describe('getSpotlightSections on the real data')`:
    - `it('counts the filters over the whole book')`: `spotlightFilters(getPortfolio(null)).map((f) => f.count)` → `[12, 29, 37, 29, 16, 6, 43]`.
    - `it('lists the five most recently active customers')`: `getSpotlightSections('', [])[0]` keys `['customer-2759', 'customer-7550', 'customer-7903', 'customer-2237', 'customer-3349']`; subtitles `['AUM Rp 13 M · Cash-heavy 91%', 'AUM Rp 137,6 jt · No REKSA', 'AUM Rp 21,1 M · No REKSA', 'AUM Rp 14,3 M · No REKSA', 'AUM Rp 4,6 M · Cash-heavy 90%']`.
    - `it('fills Recently active past a viewed customer')`: recent `[2759, 99999]` → section 0 keys `['customer-2759']`, section 1 keys `['customer-7550', 'customer-7903', 'customer-2237', 'customer-3349', 'customer-5725']`.
    - `it('finds 8797 and 8779 for " 87 "')`: one section `Customers`; subtitles `['AUM Rp 1,3 M · Cash-heavy 84%', 'AUM Rp 2,9 M · No REKSA']`; first `subtitleTitle` `'AUM Rp 1.262.383.866'`.
    - `it('shows five customers for "1"')`: keys `['customer-7163', 'customer-2146', 'customer-4251', 'customer-6217', 'customer-7170']`.
    - `it('shows no chip for 3569')`: subtitle `'AUM Rp 9,1 M'`.
- [ ] **Step 2 (RED):** `npx vitest run src/lib/selectors/spotlight.test.ts` → FAIL, cannot resolve `./spotlight`.
- [ ] **Step 3 (implementer):** follow spec 5.2 and 5.4. "Recently active" is a stable sort of the rows (already in rank order) by `lastActive.date`, descending, with `null` left out. Constants in the file: the two pages, `QUICK_FILTER_IDS = ['cash-heavy', 'investment-gap-reksa', 'kyc']`, `MAX_CUSTOMER_RESULTS = 5`, KYC label `'With KYC note'`. Drop empty sections.
- [ ] **Step 4 (GREEN):** `npm run test` → 0 failed; `npm run lint` → 0 problems. **Step 5:** commit `feat: add the spotlight search selector`.

### Task 4: Record Customer 360 visits

**Files:** Modify `src/pages/CustomerPage.tsx`, `src/test/setup.ts`; Create `src/pages/CustomerPage.test.tsx`

**Interfaces:** Consumes `recordCustomerVisit(id)` (Task 2).

- [ ] **Step 1 (test-writer):** in `setup.ts`, add `localStorage.clear()` to the `afterEach` when `window` exists. In `CustomerPage.test.tsx`, render `routes` in `createMemoryRouter` (as `routes.test.tsx` does):
  - `it('records a real customer')`: `/customers/4857` → `localStorage.getItem('recent-customers')` is `'[4857]'`.
  - `it('moves a revisited customer to the front')`: store `'[2759,4857]'`, render `/customers/4857` → `'[4857,2759]'`.
  - `it('records nothing for Customer not found')`: `/customers/99999` → `null`.
- [ ] **Step 2 (RED):** `npx vitest run src/pages/CustomerPage.test.tsx` → the first two FAIL (`null` received); the third is a guard and passes before and after.
- [ ] **Step 3 (implementer):** before the `if (!vm)` return: `const realId = vm ? vm.id : null` and `useEffect(() => { if (realId !== null) recordCustomerVisit(realId) }, [realId])`.
- [ ] **Step 4 (GREEN):** `npm run test` → 0 failed. **Step 5:** commit `feat: remember the customers whose page was opened`.

### Task 5: Spotlight dialog content

Depends on: the theme plan merged to main.

**Files:** Create `src/components/Spotlight.tsx`; Test `src/components/Spotlight.test.tsx`

**Interfaces:**

- Consumes: `getSpotlightSections`, `noMatchText`, `SpotlightItem` (Task 3); `readRecentCustomers` (Task 2); `wrapIndex` (Task 1); the theme plan names (top of this plan).
- Produces: `Spotlight({ onClose }: { onClose: () => void }): JSX.Element`. It must be rendered inside a `Dialog.Root` from `radix-ui`. It renders `Dialog.Portal` > `Dialog.Overlay className="spotlight-scrim"` + `Dialog.Content className="spotlight-panel" aria-modal="true" aria-describedby={undefined}`, with a visually hidden `Dialog.Title` `Search`, and the `esc` button as `Dialog.Close` with `aria-label="Close search (esc)"`. Choosing a row calls `onClose()`, then `navigate(item.to)`.

- [ ] **Step 1 (test-writer):** harness `createMemoryRouter([{ path: '*', element: <Dialog.Root open><Spotlight onClose={onClose} /></Dialog.Root> }], { initialEntries: ['/'] })`, `onClose = vi.fn()`, `user = userEvent.setup()`. `options()` = `screen.queryAllByRole('option')`. Real data. "pathname" and "search" below are `router.state.location.pathname` / `.search`.
  - `it('names the dialog and wires the combobox to the listbox')`: dialog name `Search` with `aria-modal="true"`; combobox name `Search customers, filters and pages`, placeholder `Customer ID, opportunity or page`, `aria-expanded="true"`, `aria-autocomplete="list"`, `aria-controls` equal to the id of listbox `Results`, `aria-activedescendant` equal to `options()[0].id`; `options()[0]` has `aria-selected="true"`, `options()[1]` has `"false"`; the combobox has focus.
  - `it('lists Recently active, Quick filters, and Go to for an empty query')`: texts `Recently active`, `Quick filters`, `Go to`, `Try typing 87`; no `Recently viewed`; 10 options; `options()[0]` name `/^Customer 2759/`.
  - `it('puts stored recent customers first')`: before render, store `'[2759,99999]'` → text `Recently viewed`; options 0 and 1 named `/^Customer 2759/` and `/^Customer 7550/`.
  - `it('shows the full AUM as the subtitle title')`: type `87` → 2 options; `getByText('AUM Rp 1,3 M · Cash-heavy 84%')` has `title="AUM Rp 1.262.383.866"`.
  - `it('shows the no-match line for zzz')`: type `zzz` → text `No customer, filter or page matches “zzz”.`; 0 options; the combobox has no `aria-activedescendant`.
  - `it('wraps the active row with the arrow keys')`: `{ArrowUp}` → `options()[9]` selected and the activedescendant; `{ArrowDown}` → `options()[0]`.
  - `it('resets the active row when the query changes')`: `{ArrowDown}{ArrowDown}`, type `n` → `options()[0]` selected.
  - `it('makes the row under a moving mouse active')`: `fireEvent.mouseMove(options()[3])` → `options()[3]` selected.
  - `it('shows ↵ Open and hides the count on the active row only')`: type `no` → `options()[0]` has `↵ Open` and no `29`; `options()[1]` has `37` and no `↵ Open`.
  - `it('opens the customer on Enter')`: type `4857{Enter}` → pathname `/customers/4857`; `onClose` called once.
  - `it('opens a filter on click')`: type `kyc`, click option `/^With KYC note/` → pathname `/customers`, search `?kyc=yes`.
  - `it('does nothing on Enter with no rows')`: type `zzz{Enter}` → pathname `/`; `onClose` not called.
  - `it('keeps focus in the input on mousedown in the list')`: `fireEvent.mouseDown(options()[0])` returns `false`.
  - `it('has the esc button')`: button name `Close search (esc)` with text `esc`.
- [ ] **Step 2 (RED):** `npx vitest run src/components/Spotlight.test.tsx` → FAIL, cannot resolve `./Spotlight`.
- [ ] **Step 3 (implementer):** state: `useState(readRecentCustomers)`, `query`, `active`. Option ids are `${useId()}-${index}`. ↑/↓ use `wrapIndex` and `scrollIntoView({ block: 'nearest' })` (keyboard only). `onMouseMove` sets the active row. `onMouseDown` on the listbox calls `preventDefault()`. `onOpenAutoFocus` focuses the input. Render `↵ Open` (`aria-hidden`) only on the active row, and the count only on the others. Sizes from spec 5.7; icons `UserRoundIcon`, `SlidersHorizontalIcon`, `ArrowUpRightIcon`, `SearchIcon`.
- [ ] **Step 4 (GREEN):** `npm run test` → 0 failed; `npm run lint` → 0 problems. **Step 5:** commit `feat: add the spotlight search dialog`.

### Task 6: Trigger, shortcut, and the swap in the top bar

**Files:** Create `src/components/SpotlightSearch.tsx`, `src/components/SpotlightSearch.test.tsx`; Modify `src/components/AppShell.tsx`, `src/components/AppShell.test.tsx`, `src/routes.test.tsx`, `e2e/smoke.spec.ts`; Delete `src/components/CustomerSearch.tsx`

**Interfaces:** Consumes `Spotlight` (Task 5), `shortcutLabel`, `isSpotlightShortcut` (Task 1). Produces `SpotlightSearch(): JSX.Element`.

- [ ] **Step 1 (test-writer):**
  - `SpotlightSearch.test.tsx`, harness: a layout route `<><input aria-label="Other field" /><SpotlightSearch /><Outlet /></>` with child `{ path: '*', element: null }`; `options()` and "pathname" as in Task 5.
    - `it('shows the trigger name, popup, shortcuts, and the Ctrl K label')`: button `Search customer, filter or page` has `aria-haspopup="dialog"` and `aria-keyshortcuts="Meta+K Control+K"`; text `Ctrl K` has `aria-hidden="true"`.
    - `it('opens on click with the input focused')`: dialog `Search` shown; the combobox has focus.
    - `it('closes on Escape and returns focus to the trigger')`.
    - `it('toggles with Control+K, also from another input')`: click `Other field`, `{Control>}k{/Control}` → dialog; again → no dialog.
    - `it('opens with Meta+K')`: `{Meta>}k{/Meta}` → dialog.
    - `it('closes from the esc button')`: click `Close search (esc)` → no dialog.
    - `it('starts empty each time it opens')`: open, type `87`, `{Escape}`, open → combobox value `''`, `options()[0]` selected.
    - `it('closes and navigates when a row is chosen')`: type `4857{Enter}` → no dialog; pathname `/customers/4857`.
  - `AppShell.test.tsx`: in the top-bar test, the banner holds button `Search customer, filter or page`.
  - `routes.test.tsx`: replace the two search tests with `it('opens the search from the top bar')` (click the trigger → dialog `Search`, placeholder `Customer ID, opportunity or page`) and `it('opens a customer from the search')` (type `4857`, click option `/^Customer 4857/` → pathname `/customers/4857`, heading level 1 `Customer 4857`).
  - `e2e/smoke.spec.ts`: rewrite `the search opens a customer` with the trigger, the new placeholder, and option `/^Customer 4857/`. Add `test('Control+K opens the search and Escape closes it')` (dialog `Search` visible, then hidden, and the trigger `toBeFocused()`) and `test('a visited customer is listed under Recently viewed')` (goto `./customers/4857`, `Control+k` → text `Recently viewed` visible, first option `/^Customer 4857/`). Each keeps `expect(errors).toEqual([])`.
- [ ] **Step 2 (RED):** `npx vitest run src/components src/routes.test.tsx` → the new tests FAIL (no `SpotlightSearch`, no trigger button).
- [ ] **Step 3 (implementer):** `SpotlightSearch` holds `open`. It adds a document `keydown` listener in `useEffect`: if `isSpotlightShortcut(e)`, call `preventDefault()` and toggle `open`. It renders `Dialog.Root open onOpenChange`, then `Dialog.Trigger asChild` on a `<button>` (the `SearchIcon`, the text, and a `kbd` with `shortcutLabel(navigator.platform)`, `aria-hidden`), then `{open && <Spotlight onClose={() => setOpen(false)} />}` (mounting it only while open resets the query). In `AppShell`, `SpotlightSearch` replaces `CustomerSearch`. Delete `CustomerSearch.tsx`.
- [ ] **Step 4 (GREEN):** `npm run test` → 0 failed; `npm run build && npm run e2e` → all passed, the touch-target tests included.
- [ ] **Step 5:** commit `feat: open the spotlight search from the top bar and with Ctrl+K`.

### Task 7: Remove the old customer options

**Files:** Modify `src/lib/selectors/customer360.ts`, `src/lib/selectors/customer360.test.ts`, `src/pages/CustomerDetail.test.tsx`, `src/pages/CustomerDetail.all.test.tsx`

**Interfaces:** Removes `CustomerOption`, `customerOptions`, `getCustomerOptions`. Later tasks use none of them.

- [ ] **Step 1 (test-writer):** in `customer360.test.ts`, delete `describe('customerOptions')` and the `getCustomerOptions` length line (keep the `snapshotLabel` assertion). Add `it('no longer exports the customer options')`: with `import * as customer360 from './customer360'`, `Object.keys(customer360)` contains neither `customerOptions` nor `getCustomerOptions`. In both `CustomerDetail` tests, replace `getCustomerOptions()…id` with `getCustomerRows().map((row) => row.customerId)`.
- [ ] **Step 2 (RED):** `npx vitest run src/lib/selectors/customer360.test.ts` → only the new test FAILS.
- [ ] **Step 3 (implementer):** delete the interface, both functions, and the `options` constant.
- [ ] **Step 4 (GREEN):** `npm run check` → exit 0. **Step 5:** commit `refactor: drop the customer options the old search used`.

### Task 8 (orchestrator-only): CLAUDE.md folder structure

No tests: CLAUDE.md is the orchestrator's file, so the ledger records this task as docs-only.

- [ ] In `CLAUDE.md` "Folder structure", under `src/lib/`, add `keyboard.ts` (shortcut label, shortcut test, list index wrap) and `recent-customers.ts` (recently viewed IDs in `localStorage`). Add `spotlight.ts` to the selectors line. Change "search" in the `src/components/` line to "Spotlight search (`SpotlightSearch`, `Spotlight`)".
- [ ] `npm run lint:md` → 0 errors. Commit `docs: list the spotlight files in the project guide`.

### Task 9 (orchestrator-only): Remove cmdk and the unused shadcn files

No tests: this is a dependency change, so the ledger records it as config-only.

- [ ] `grep -rn "cmdk\|ui/command\|ui/popover" src` lists only `src/components/ui/command.tsx` and the comment in `src/test/setup.ts`.
- [ ] `npm uninstall cmdk`; `git rm src/components/ui/command.tsx src/components/ui/popover.tsx`. Drop "cmdk" from the `setup.ts` comment.
- [ ] `npm run check && npm run build && npm run e2e` → all pass. Commit `chore: remove cmdk and the unused command and popover components`.
