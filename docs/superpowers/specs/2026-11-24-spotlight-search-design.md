# Spotlight search — design

- **Date:** 2026-11-24
- **Status:** Written by `docs-writer` on 2026-11-24 from the brainstorm
  decisions. The user asked to skip further approval rounds ("just go
  straight into spec plan and development").
- **Branch:** `feat/spotlight-search`. One plan, one PR.
- **Reference design:** `docs/design-system/design/search-spotlight.html`
  (committed on this branch). It is a standalone HTML demo with sample
  data. This feature rebuilds it in the app's stack; it does not paste the
  file in.
- **ADR:** none. The feature makes no project-wide decision: it adds no
  dependency, and `localStorage` is already in use for the theme
  (ADR 0009). See 3.
- **Markers:** "User decision" is the user's. "Orchestrator's reading" is
  how the orchestrator read a user answer during the brainstorm. "My call"
  is a choice `docs-writer` made, with its reason.

## 1. Intent

The top bar has a small customer-ID combobox (`CustomerSearch`, a Popover
with cmdk). It finds customers only. The user wants a Spotlight-style
search in its place: one field, opened from the top bar or with ⌘K /
Ctrl+K, that finds customers, the opportunity filters, and the two pages.
It still covers the assessment's "filter per customer".

The search uses real data only: real customer IDs with their AUM and
first fired rule, the real opportunity counts over the whole book, and the
real routes.

## 2. Goals, non-goals, anti-goals

### 2.1 Goals

- A trigger in the top bar and a global ⌘K / Ctrl+K shortcut open a modal
  search panel that matches the reference's look and behaviour (5.3–5.7).
- Three kinds of result: customers, filters (the six rules and the KYC
  note), and pages. Each opens the matching route.
- A "Recently viewed" list of the last 5 Customer 360 pages, kept in
  `localStorage`, and a "Recently active" list from transaction data.
- Full keyboard and screen-reader support (combobox + listbox pattern).
- Light and dark themes through tokens in `src/index.css`, with the
  contrast test extended to the new pairings.

### 2.2 Non-goals

- No free-text search over products, transactions, or income bands. A
  query matches customer IDs (digits), filter labels, and page labels only.
- No fuzzy matching or ranking by relevance.
- No sync of "Recently viewed" across tabs or devices.
- No exit animation (the reference has none).
- No new filter in the Customers list. The search links to filters that
  already exist (`?rule=` and `?kyc=yes`).

### 2.3 Anti-goals (it fails even if it works)

- A pasted copy of the reference HTML, `innerHTML`, or its inline styles.
- Any hex, `rgb()`, `rgba()`, or `oklch()` in `src/components/` or
  `src/pages/` (Rule 10).
- Any `Rp` string or money formatting outside `formatIDR()` /
  `formatIDRShort()` (Rule 2).
- Search, sort, or section logic inside a component (Rule 1).
- Invented data: a field, count, or rule the dataset does not have.

## 3. Constraints

- **Rule 1 and ADR 0004 (layers):** section building lives in a selector
  (`src/lib/selectors/spotlight.ts`). Storage, shortcut, and index helpers
  are shared helpers in `src/lib/*.ts`, which import nothing from `src/`
  (the same place as `src/lib/theme.ts`, the precedent for `localStorage`).
  Only the selector reads `src/data` (through the existing selectors).
- **Rule 2:** the customer subtitle shows `formatIDRShort(aum)`. The full
  `formatIDR(aum)` value is reachable on the same row (5.4).
- **Rule 3:** no new threshold. The list sizes (5 recent, 5 customer
  results) are user decisions about the list, not business cut-offs, so
  they do not go in `src/lib/insights/thresholds.ts`.
- **Rule 9:** every text is a fixed string or a fixed template. The rule
  chip comes from the existing `ruleChip()` in `src/lib/insights/`.
- **Rule 10 and ADR 0009:** colors only as tokens in `src/index.css`, light
  under `:root`, dark under `.dark`. Red stays for primary buttons, active
  nav, and the focus ring. The active row's solid red icon tile (34 px) is
  a selection marker in the same role as the active nav bar, and the user
  asked for it. It is not a large surface, a flag, or a series.
- **No ADR:** the decisions here touch one feature. No new dependency
  (Radix Dialog is in `radix-ui`, already installed). `localStorage` is
  already used by `src/lib/theme.ts`.
- **Console check:** the e2e smoke tests fail on any console error. The
  Radix dialog gets a visually hidden `Dialog.Title` ("Search"), which also
  gives the dialog its accessible name, and `aria-describedby={undefined}`,
  so no Radix version has a reason to log a missing-title or
  missing-description message.

## 4. Approaches

1. **Radix Dialog + our own combobox and listbox (chosen, user decision).**
   Radix (`Dialog` from the installed `radix-ui` package) gives the modal
   parts: focus trap, scroll lock, Esc, outside click, focus return to the
   trigger, and `aria-hidden` on the rest of the page. The input, the
   listbox, the sections, and the active-row state are ours, so the exact
   section rules, ordering, and ARIA attributes from the reference are easy
   to own and test.
2. **cmdk `CommandDialog` with `shouldFilter={false}`.** Rejected: cmdk
   keeps its own selection and ordering model and sets its own ARIA. Owning
   the reference's sections, wrap-around, and `aria-activedescendant` means
   fighting it.
3. **A fully hand-rolled dialog, like the reference.** Rejected: it
   re-implements the focus trap, scroll lock, and focus return that Radix
   already gives, and each needs its own tests.

## 5. Decisions

### 5.1 Settled by the user (2026-11-24)

1. **Data:** real customers, real opportunity counts, real routes. No
   invented fields.
2. **Customer subtitle:** `AUM ${formatIDRShort(aum)} · ${chip}`, where
   `chip` is `CustomerRow.chip` (the first fired rule, for example
   `Cash-heavy 84%`). When `chip` is `null` (no rule fired), the subtitle is
   `AUM ${formatIDRShort(aum)}` only.
3. **Recent customers** come from transaction data, and a last-visited list
   is also built and kept in `localStorage` (the orchestrator's reading is
   in 5.2).
4. **Filters:** the six rules from `getPortfolio(null).opportunities` plus
   the KYC note from `getPortfolio(null).kyc`. Counts are over the whole
   book.
5. **Pages:** Portfolio (`/`) and Customers (`/customers`).
6. **Customer match:** the trimmed query is all digits and the customer ID
   (as a string) contains it. At most 5 results. A non-digit query matches
   no customer.
7. **Routes:** customer → `/customers/<id>`; filter → its `to`; page → its
   path. Navigation through React Router (`useNavigate`).
8. **`CustomerSearch` is deleted.** Spotlight replaces it.
9. **Approach 1** in section 4.
10. **No ADR.**

### 5.2 Orchestrator's readings (from the brainstorm)

- **Two recent sections with an empty query:**
  - **"Recently viewed":** the last 5 customer IDs whose Customer 360 page
    (`/customers/:id`) rendered a real customer, from any route (search,
    table, links, prev/next). Most recent first, no duplicates, at most 5.
    Kept in `localStorage`. Each read and write is in `try/catch`; blocked
    storage or bad data gives an empty list. IDs that are not real
    customers are dropped when the sections are built. The section is
    hidden when empty.
  - **"Recently active":** the 5 customers with the latest
    customer-initiated transaction (`CustomerRow.lastActive.date`; bank
    entries are already left out, ADR 0006). Customers with
    `lastActive === null` are left out. Ties keep the worklist order
    (`CustomerRow.rank`). IDs already in "Recently viewed" are skipped,
    and the list still fills up to 5. Same subtitle as 5.1.2.
- **Quick filters with an empty query:** the reference's three, in this
  order: "Cash-heavy AUM", "No REKSA", "With KYC note".
- **Filters with a query:** all seven whose label contains the query
  (trimmed, case-insensitive), in `RULE_ORDER`, then the KYC note.
- **Filter item:** label, count, subtitle `Open Customers filtered`
  (reference copy). The six rules use the label and `to` of
  `getPortfolio(null).opportunities` (`/customers?rule=<id>`). The KYC note
  uses the label `With KYC note`, `getPortfolio(null).kyc.count`, and
  `getPortfolio(null).kyc.to` (`/customers?kyc=yes`).
- **Page items:** Portfolio, subtitle `Your book overview`, `to` `/`;
  Customers, subtitle `Ranked list with preview`, `to` `/customers`
  (reference copy). A page matches when its label contains the query
  (trimmed, case-insensitive).
- **Customer order:** worklist order (`CustomerRow.rank`).
- **Remove `customerOptions` / `getCustomerOptions`** if nothing else uses
  them.
- **Theme:** the reference's `--sp-*` tokens, light and dark, converted to
  `oklch` with alpha (5.7).
- **Shortcut label:** `⌘K` when `/Mac|iPhone|iPad/` matches
  `navigator.platform`, else `Ctrl K` (reference).

### 5.3 Behaviour

- **Open:** a click on the trigger, or ⌘K / Ctrl+K anywhere in the app
  (`metaKey || ctrlKey` and `key.toLowerCase() === 'k'`, as the
  reference). The shortcut calls `preventDefault()` and toggles: it closes
  the panel when it is open.
- **On open:** the query is empty, the first row is active, focus is in the
  input, and the "Recently viewed" list is read from storage. My call:
  read once per open, because the list only changes when a Customer 360
  page renders, and the panel is closed then.
- **Close:** Esc, a click on the scrim, a click on the `esc` button, or the
  shortcut. Focus returns to the trigger (Radix `Dialog.Trigger`). Body
  scroll is locked while the panel is open (Radix).
- **Active row:** one index shared by the mouse and the keyboard.
  - ↑ / ↓ move it and wrap around at both ends. The active row scrolls into
    view (`scrollIntoView({ block: 'nearest' })`) on keyboard moves only.
  - Moving the mouse over a row makes it active (`mousemove`, as the
    reference, so a row that scrolls under a still pointer does not take
    the active state).
  - A change of the query resets the active row to the first row.
- **Choose:** Enter, or a click on a row, closes the panel and navigates to
  the row's `to`. Enter with no rows does nothing. `mousedown` on the list
  calls `preventDefault()`, so the input keeps focus.
- **Tab:** Radix keeps focus inside the dialog; Tab moves between the input
  and the `esc` button. My call: the reference blocks Tab in the input, but
  the Radix trap keeps focus in the dialog and lets a keyboard user reach
  the `esc` button.
- **Visits:** `CustomerPage` records the customer ID once per customer
  (when the rendered customer ID changes) and only when the customer
  exists. "Customer not found" records nothing. The hook runs before the
  page's early return (Rules of Hooks). Choosing a customer in the search
  does not record anything itself; the page render does.

### 5.4 Sections and copy

All strings below are exact. `formatIDRShort` output contains no-break
spaces (` `); tests must expect them.

**Empty query** (trimmed query is `''`), in this order:

| Section title | Items |
| --- | --- |
| `Recently viewed` | Stored IDs that are real customers, stored order, at most 5. |
| `Recently active` | 5.2 rule, at most 5, skipping the IDs above. |
| `Quick filters` | Cash-heavy AUM, No REKSA, With KYC note. |
| `Go to` | Portfolio, Customers. |

**With a query**, in this order:

| Section title | Items |
| --- | --- |
| `Customers` | 5.1.6, at most 5, worklist order. |
| `Filters` | 5.2 rule. |
| `Pages` | 5.2 rule. |

- A section with no items is dropped, with or without a query. My call:
  the reference drops empty sections only with a query, but an empty
  "Recently viewed" must be hidden too (5.2), and one rule is simpler.
- **No rows at all:** one line, `No customer, filter or page matches
  “<query>”.` with typographic quotes, where `<query>` is the query as
  typed (the reference uses the raw input value). It shows only when the
  trimmed query is not empty.
- **Item text:**

  | Kind | Title | Subtitle | Count | Icon (Lucide) |
  | --- | --- | --- | --- | --- |
  | customer | `Customer <id>` | 5.1.2 | none | `UserRoundIcon` |
  | filter | the label | `Open Customers filtered` | the count | `SlidersHorizontalIcon` |
  | page | `Portfolio` / `Customers` | 5.2 | none | `ArrowUpRightIcon` |

  The three icons are the reference's SVG paths, which match these Lucide
  icons. The input row uses `SearchIcon`.
- **Full AUM (Rule 2), my call:** the customer subtitle element carries a
  `title` attribute with `AUM ${formatIDR(aum)}` (for example
  `AUM Rp 1.262.383.866`). Reason: it is the simplest way to show the full
  value next to the short one on the row. A Radix tooltip inside a listbox
  option would add a second focus and hover model inside the option.
- **Trigger:** text `Search customer, filter or page`, then a `kbd` with
  `⌘K` or `Ctrl K`. My call: the `kbd` is `aria-hidden="true"`, so the
  button's accessible name is exactly `Search customer, filter or page`;
  `aria-keyshortcuts` carries the shortcut for assistive tech.
- **Input:** visually hidden label `Search customers, filters and pages`,
  placeholder `Customer ID, opportunity or page`.
- **`esc` button:** visible text `esc`. My call: `aria-label="Close search
  (esc)"`, because "esc" alone is a weak name; the name still contains the
  visible text (WCAG 2.5.3).
- **Row hint:** `↵ Open`, shown on the active row only, `aria-hidden="true"`
  (my call: it repeats what Enter does and would add noise to every option
  name).
- **Footer:** `↑` `↓` `Navigate`, `↵` `Open`, `esc` `Close`, and on the
  right `Try typing 87` (the reference copy; `87` finds two real customers,
  8797 and 8779).

### 5.5 Logic and files

**Shared helpers** (`src/lib/*.ts`, import nothing from `src/`, each with a
co-located test):

- `src/lib/keyboard.ts`
  - `isApplePlatform(platform: string): boolean` — `/Mac|iPhone|iPad/`.
  - `shortcutLabel(platform: string): string` — `'⌘K'` or `'Ctrl K'`.
  - `isSpotlightShortcut(event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey'>): boolean`.
  - `wrapIndex(index: number, count: number): number` — wraps into
    `0..count-1`; `0` when `count` is `0`.
- `src/lib/recent-customers.ts`
  - `RECENT_CUSTOMERS_KEY = 'recent-customers'` (my call: the key the
    orchestrator suggested, next to the existing `theme` key).
  - `RECENT_CUSTOMERS_LIMIT = 5`.
  - `parseRecentCustomers(raw: string | null): number[]` — a JSON array;
    keeps positive safe integers, first occurrence of each, at most 5.
    Anything else (null, bad JSON, not an array) gives `[]`. Non-integer
    entries are dropped, the rest kept.
  - `pushRecentCustomer(ids: readonly number[], id: number): number[]` —
    `id` first, the others after it without `id`, at most 5.
  - `readRecentCustomers(): number[]` and
    `recordCustomerVisit(id: number): void` — the storage calls, each in
    `try/catch` (a blocked storage reads as `[]` and drops the write).

**Selector** `src/lib/selectors/spotlight.ts` (pure function over derived
inputs, plus a bound export):

```ts
export type SpotlightKind = 'customer' | 'filter' | 'page'

export interface SpotlightItem {
  /** Unique in one result: `customer-8797`, `filter-cash-heavy`, `filter-kyc`, `page-portfolio`, `page-customers`. */
  key: string
  kind: SpotlightKind
  title: string
  subtitle: string
  /** `AUM <formatIDR(aum)>` for customers (the subtitle's title attribute); `null` otherwise. */
  subtitleTitle: string | null
  /** Filters only; `null` otherwise. */
  count: number | null
  to: string
}

export interface SpotlightSection { title: string; items: SpotlightItem[] }

export interface SpotlightFilter { id: RuleId | 'kyc'; label: string; count: number; to: string }

export interface SpotlightSource { rows: readonly CustomerRow[]; filters: readonly SpotlightFilter[] }

export function spotlightFilters(portfolio: Pick<Portfolio, 'opportunities' | 'kyc'>): SpotlightFilter[]
export function customerSubtitle(row: Pick<CustomerRow, 'aum' | 'chip'>): string
export function buildSpotlightSections(source: SpotlightSource, query: string, recentIds: readonly number[]): SpotlightSection[]
export function noMatchText(query: string): string
/** Bound to getCustomerRows() and getPortfolio(null). */
export function getSpotlightSections(query: string, recentIds: readonly number[]): SpotlightSection[]
```

My call: the pure function takes the rows and filters, not a `Dataset`,
so it does not rebuild every customer row on each keystroke; the tests
build the source from `src/test/fixtures.ts` with `buildCustomerRows` and
`buildPortfolio`. The page list, the quick-filter IDs
(`['cash-heavy', 'investment-gap-reksa', 'kyc']`), and the result limit
(`5`) are constants in this file.

**Components** (render only):

- `src/components/SpotlightSearch.tsx` — owns the open state, the Radix
  `Dialog.Root`, the trigger (`Dialog.Trigger asChild` on a `<button>`),
  and the document `keydown` listener for the shortcut. It is placed in
  `AppShell` where `CustomerSearch` was.
- `src/components/Spotlight.tsx` — the dialog content: scrim
  (`Dialog.Overlay`), panel (`Dialog.Content`), a visually hidden
  `Dialog.Title` "Search", the input, the listbox, the footer. It holds the
  query and the active index, calls `getSpotlightSections`, and navigates.
- My call: use the `Dialog` primitives from `radix-ui` directly, not
  `src/components/ui/dialog.tsx`. The shadcn `DialogContent` brings its own
  overlay classes, centring, and close button, which this panel would all
  override; the shadcn file stays as generated.

### 5.6 Accessibility

- Panel: `role="dialog"` (Radix), `aria-modal="true"` (set explicitly;
  Radix does not set it), name "Search" from the hidden `Dialog.Title`, and
  `aria-describedby={undefined}` (no description).
- Input: `role="combobox"`, `aria-expanded="true"`,
  `aria-controls=<listbox id>`, `aria-autocomplete="list"`,
  `aria-activedescendant=<active option id>`, removed when there are no
  options. `autoComplete="off"`, `spellCheck={false}`.
- Listbox: `role="listbox"`, `aria-label="Results"` (reference). Rows are
  `role="option"` with a unique `id` (from `useId`) and
  `aria-selected="true"` on the active row only (`"false"` on the others).
- Section headings and the empty line: `role="presentation"`.
- Icons are `aria-hidden="true"`.
- Trigger: a `<button>`, `aria-haspopup="dialog"` (Radix sets it),
  `aria-keyshortcuts="Meta+K Control+K"`.
- Focus: in the input on open, trapped in the dialog, back on the trigger
  on close.

### 5.7 Visual

Sizes come from the reference CSS:

| Part | Values |
| --- | --- |
| Trigger | `flex: 0 1 460px`, min-height 40 px, padding `0 8px 0 12px`, radius 10 px, 1 px `--border`, background `--muted`, text `--muted-foreground` 14 px. |
| Scrim | fixed, full screen, `--sp-scrim`, `backdrop-filter: blur(14px) saturate(140%)`. |
| Panel | fixed, top 104 px, centred, width `min(680px, calc(100vw - 32px))`, radius 20 px, `overflow: hidden`, `--sp-panel`, 1 px `--sp-panel-border`, `box-shadow: var(--sp-shadow)`, `backdrop-filter: blur(32px) saturate(180%)`. |
| Input row | gap 14 px, padding `18px 20px`, bottom 1 px `--sp-divider`; search icon 22 px at 70% opacity; input 21 px / 500, `--foreground`; placeholder `--muted-foreground`. |
| `esc` button | min-height 32 px, padding `0 10px`, radius 8 px, `--sp-kbd`, 12 px / 600, `--muted-foreground`. |
| List | `max-height: min(440px, 60vh)`, scrolls, padding `8px 10px 10px`. |
| Section heading | padding `12px 12px 6px`, 12 px / 600, letter-spacing `.03em`, `--muted-foreground`. |
| Option | gap 12 px, min-height 52 px, padding `6px 12px`, radius 12 px, background transition `.12s ease`. |
| Icon tile | 34 × 34 px, radius 9 px, `--sp-icon-bg`, icon 16 px `--muted-foreground`. |
| Title / subtitle | 15 px / 600; 13 px `--muted-foreground`, margin-top 2 px, one line with ellipsis. |
| Count badge | min-width 28 px, padding `2px 8px`, radius 10 px, 12 px / 600, `--sp-kbd`, `--muted-foreground`. |
| Hint | 12 px / 600, `--sp-active-text`. |
| Active row | background `--sp-active-bg`, text `--sp-active-text`; icon tile `--primary` with a `--primary-foreground` icon; hint shown; count hidden. |
| Empty line | padding `28px 12px`, centred, 14 px, `--muted-foreground`. |
| Footer | gap 18 px, padding `12px 20px`, top 1 px `--sp-divider`, 12 px, `--muted-foreground`. |
| `kbd` | min-width 22 px, height 22 px, padding `0 6px`, radius 6 px, `--sp-kbd`, 12 px / 600, `--muted-foreground`. |

- Mapping of the reference's names: `--surface-subtle` → `--muted`,
  `--border` → `--border`, `--muted` → `--muted-foreground`, `--text` →
  `--foreground`, `--surface` → `--card`, `#fff` on red →
  `--primary-foreground`. My call: the trigger uses the existing `--muted`
  token for the reference's `--surface-subtle`, since both are the
  slightly-off-white field fill and no new token is needed.
- **Placeholder, my call:** full `--muted-foreground`, without the
  reference's `opacity: .8`. Measured: muted text at 80% on the light panel
  is 3.86:1, under 4.5:1. At full strength it is 6.07:1.
- **Motion:** scrim `sp-fade` (opacity 0 → 1, `.2s ease-out`); panel
  `sp-pop` (from opacity 0, `translateY(-8px) scale(.97)`, `.22s
  cubic-bezier(.2,.8,.2,1)`). No animation under
  `prefers-reduced-motion: reduce`.
- **Fallback:** under
  `@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))`
  the scrim uses `--sp-scrim-fallback` and the panel uses `--card`.
- The keyframes, the reduced-motion rule, the fallback, and the two
  `backdrop-filter` values go in `src/index.css` (for example as
  `.spotlight-scrim` and `.spotlight-panel` classes). Tailwind variants are
  allowed instead (implementer's call). Colors come from tokens either way.

**Tokens** (in `src/index.css`; reference `rgba` converted to `oklch`):

| Token | Light (`:root`) | Dark (`.dark`) |
| --- | --- | --- |
| `--sp-scrim` | `oklch(0.974 0.002 0 / 30%)` | `oklch(0.134 0 0 / 45%)` |
| `--sp-scrim-fallback` | `oklch(0 0 0 / 35%)` | `oklch(0 0 0 / 35%)` |
| `--sp-panel` | `oklch(1 0 0 / 74%)` | `oklch(0.269 0 0 / 72%)` |
| `--sp-panel-border` | `oklch(1 0 0 / 75%)` | `oklch(1 0 0 / 10%)` |
| `--sp-divider` | `oklch(0.224 0.004 48.6 / 8%)` | `oklch(1 0 0 / 8%)` |
| `--sp-active-bg` | `oklch(0.585 0.223 29.1 / 9%)` | `oklch(0.71 0.182 26.6 / 16%)` |
| `--sp-active-text` | `oklch(0.447 0.164 28.9)` | `oklch(0.837 0.089 24.2)` |
| `--sp-icon-bg` | `oklch(0.224 0.004 48.6 / 6%)` | `oklch(1 0 0 / 8%)` |
| `--sp-kbd` | `oklch(0.224 0.004 48.6 / 7%)` | `oklch(1 0 0 / 10%)` |
| `--sp-shadow` | `0 30px 80px oklch(0.224 0.004 48.6 / 22%), 0 0 0 1px oklch(0.224 0.004 48.6 / 6%)` | `0 30px 80px oklch(0 0 0 / 55%), 0 0 0 1px oklch(0 0 0 / 40%)` |

- Light `--sp-active-text` is the value of `--primary-strong` (`#9B1B14`).
  My call: write the literal `oklch`, not `var(--primary-strong)`, because
  the contrast parser reads only literal `oklch()` values.
- Dark `--sp-active-bg` (`#FF6B61`) and `--sp-active-text` (`#FFB3AD`):
  my call, chroma lowered by 0.001 (0.183 → 0.182, 0.090 → 0.089) because
  the rounded conversion falls just outside sRGB and the gamut test would
  reject it. The visible change is nil.
- `--sp-scrim-fallback` is new (the reference's `rgba(0,0,0,.35)`); my
  call: a token, because Rule 10 forbids the literal in components.
- `--sp-shadow` is not a color. The parser stores it as a string and
  never parses it, because no contrast pair uses it. It is not checked.

**Contrast test** (`scripts/theme/contrast.test.ts`, both themes):

- New helper in `scripts/theme/contrast.ts`:
  `contrastOver(fg: string, layers: readonly string[]): number`. `layers`
  goes from the bottom up; the first is opaque, the others may carry an
  alpha. It blends in gamma-encoded sRGB (the browser default for CSS
  colors), then returns the WCAG ratio of the opaque `fg` on the result.
  `parseOklch` already accepts and ignores the alpha; a small
  `parseAlpha(value: string): number` (1 when there is none) reads it.
- Stacks: **frosted** = `[base, sp-scrim, sp-panel]` for base `background`
  and for base `card` (the page and the cards fill most of what sits behind
  the panel); **fallback** = `[card]`. My call: these two bases, because
  the blurred content behind the panel cannot be known; the blur averages
  text into its surface, so the surface is the fair base.
- Pairs, on each stack (with the extra layer added on top):

  | Text | Extra layer | Minimum | Lowest measured |
  | --- | --- | --- | --- |
  | `foreground` | none | 4.5 | 13.84 (dark, card) |
  | `muted-foreground` | none | 4.5 | 6.07 (light, background) |
  | `muted-foreground` | `sp-kbd` | 4.5 | 4.75 (dark, card) |
  | `sp-active-text` | `sp-active-bg` | 4.5 | 6.99 (light, background) |
  | `muted-foreground` | `sp-active-bg` | 4.5 | 5.07 (dark, card) |
  | `muted-foreground` (icon) | `sp-icon-bg` | 3 | 5.08 (dark, card) |

  The active icon tile (`primary-foreground` on `primary`) is already
  tested. The `sp-*` color tokens join the gamut check.

### 5.8 Removed and updated

- **Deleted:** `src/components/CustomerSearch.tsx`.
- **Removed:** `CustomerOption`, `customerOptions`, and
  `getCustomerOptions` from `src/lib/selectors/customer360.ts`, and their
  tests in `src/lib/selectors/customer360.test.ts`. Only tests use them
  besides `CustomerSearch`: `src/pages/CustomerDetail.test.tsx` and
  `src/pages/CustomerDetail.all.test.tsx` switch to
  `getCustomerRows().map((row) => row.customerId)`. My call: remove them,
  so no product code is kept only for tests; the order change (ID order →
  worklist order) does not matter to those tests.
- **Left in place, my call:** `src/components/ui/command.tsx`,
  `src/components/ui/popover.tsx`, and the `cmdk` dependency lose their
  last importer. Removing the dependency edits `package.json`, which only
  the orchestrator may touch. The plan's last task lists the removal as an
  orchestrator-only chore; it is not needed for the feature to work.
- **Tests updated:** `src/routes.test.tsx` (the two search tests),
  `src/components/AppShell.test.tsx` (the trigger in the top bar),
  `e2e/smoke.spec.ts` ("the search opens a customer").
- **Test setup, my call:** `src/test/setup.ts` clears `localStorage` after
  each test, because Customer 360 renders now write the recent list and it
  must not leak between tests.
- **CLAUDE.md:** the folder structure lists the two new shared helpers and
  the new selector.

## 6. Deliverables

| Path | Change |
| --- | --- |
| `src/lib/keyboard.ts` + `.test.ts` | New. |
| `src/lib/recent-customers.ts` + `.test.ts` | New. |
| `src/lib/selectors/spotlight.ts` + `.test.ts` | New, with fixture tests and real-data contract tests (section 7). |
| `src/components/SpotlightSearch.tsx` + `.test.tsx` | New. |
| `src/components/Spotlight.tsx` + `.test.tsx` | New. |
| `src/components/AppShell.tsx` + `.test.tsx` | `SpotlightSearch` in place of `CustomerSearch`. |
| `src/pages/CustomerPage.tsx` | Records the visit. |
| `src/routes.test.tsx` | New search flow; visit recorded for a real customer, not for "Customer not found". |
| `src/index.css` | `--sp-*` tokens; keyframes, reduced motion, fallback. |
| `scripts/theme/contrast.ts` + `.test.ts` | `parseAlpha`, `contrastOver`, the new pairs. |
| `src/lib/selectors/customer360.ts` + `.test.ts` | Remove the customer options. |
| `src/pages/CustomerDetail.test.tsx`, `src/pages/CustomerDetail.all.test.tsx` | Use `getCustomerRows()` for the ID list. |
| `src/components/CustomerSearch.tsx` | Deleted. |
| `src/test/setup.ts` | Clear `localStorage` after each test. |
| `e2e/smoke.spec.ts` | Search through Spotlight; open with the shortcut. |
| `CLAUDE.md` | Folder structure. |

## 7. Real-data values (measured 2026-11-24)

Measured with the committed data and the current selectors. The contract
tests in `src/lib/selectors/spotlight.test.ts` pin them.

- **Filters (whole book), in order:** Cash-heavy AUM 12, No REKSA 29, No
  ORI 37, No BANCA 29, No AUM 16, High income, no BANCA 6, With KYC note
  43.
- **Empty query, no recent IDs:** sections `Recently active`,
  `Quick filters`, `Go to`. Recently active: 2759, 7550, 7903, 2237, 3349
  (all last active on 2024-04-26, 57 customers share that date, so the
  worklist order decides). Subtitles: `AUM Rp 13 M · Cash-heavy 91%`,
  `AUM Rp 137,6 jt · No REKSA`, `AUM Rp 21,1 M · No REKSA`,
  `AUM Rp 14,3 M · No REKSA`, `AUM Rp 4,6 M · Cash-heavy 90%`.
- **Empty query, recent `[2759, 99999]`:** Recently viewed: 2759 (99999 is
  not a customer and is dropped). Recently active: 7550, 7903, 2237, 3349,
  5725.
- **Query `87`:** one section, `Customers`: 8797 (`AUM Rp 1,3 M ·
  Cash-heavy 84%`, title `AUM Rp 1.262.383.866`), 8779
  (`AUM Rp 2,9 M · No REKSA`).
- **Query `1`:** 33 IDs contain it; the 5 shown are 7163, 2146, 4251, 6217,
  7170.
- **Query `4857`:** Customer 4857, `AUM Rp 2,3 M · No ORI`.
- **Query `3569`:** Customer 3569, `AUM Rp 9,1 M` (no rule fired, no chip).
- **Query `no`:** one section, `Filters`: No REKSA, No ORI, No BANCA, No
  AUM, High income, no BANCA, With KYC note ("note" contains "no").
- **Query `cus`:** one section, `Pages`: Customers.
- **Query `zzz`:** no sections; text
  `No customer, filter or page matches “zzz”.`

The spaces inside the short money values above are no-break spaces.

## 8. Left to the builder

- The exact prop shapes between `SpotlightSearch` and `Spotlight`, within
  5.5.
- CSS classes in `src/index.css` or Tailwind variants for the motion,
  `backdrop-filter`, and fallback rules (colors from tokens only).
- The plan's task order and test names. The plan must carry every name a
  later task uses in its Interfaces blocks.

## 9. Verification

- `npm run check` passes: typecheck, lint (layer rule included), markdown
  lint, unit tests (the contrast test with the new pairs), build.
- `npm run e2e` passes: the trigger opens the panel, typing `4857` and
  choosing the row opens `/customers/4857`, Ctrl+K opens the panel and
  Escape closes it, no console errors, and the touch-target check still
  passes with the new trigger.
- Manual check in both themes: the frosted panel, the active row, the
  reduced-motion setting, and a browser without `backdrop-filter`.
