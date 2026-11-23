# Customer 360 redesign — handoff for implementation

Reference designs: the `.dc.html` files in `design/` (open in a browser to read the markup; they
need the design tool's runtime to render fully, so treat them as layout + style reference, not
production code). Two colour options exist: teal (`*.dc.html`) and OCBC red (`*-OCBC.dc.html`).

**Do not change the data layer or the opportunity rules.** This is a UI/IA redesign on the
existing dataset (snapshot as of 26 Apr 2024, 100 customers, transactions 2011–2024).

---

## 1. Navigation (replaces the sidebar)

- Slim top bar: product name · tabs `Portfolio` / `Customers` · customer search (by ID) ·
  "Snapshot as of 26 Apr 2024" on the right.
- Remove the left sidebar.
- Flow: Portfolio → Customers → Customer 360.
- Customer 360 has a breadcrumb `Customers › Customer {id}` and prev/next buttons that step
  through the **current filtered list** ("1 of N in your filtered list").

## 2. Portfolio (was "Overview")

- **Income band filter** (chips: All + the 8 bands `sd. 1 Juta … >100 Juta`). Filters every
  number on the page.
- KPI tiles: Customers (with "X with AUM · Y without"), Total AUM, Loan exposure ("Not part of
  AUM"), Customers with KYC note.
- **Opportunity tiles**: count, label, the rule condition in plain words, and the amount behind
  it. Tiles must state their condition so they don't contradict product penetration
  (e.g. "No REKSA, AUM above Rp 100 jt" = 29, while 46 customers hold no REKSA at all).
  - Amount per tile: cash-heavy → sum of cash; No X → sum of AUM of matching customers.
  - "High income, no BANCA" overlaps "No BANCA" — say so on the tile.
- Product penetration bars show held + "N not held".
- Engagement row: counts of customers by last customer-initiated transaction
  (≤30 days, 31–90, >90) relative to the snapshot date.
- Keep the existing Income band vs AUM scatter as a full-width card.
- Every tile/bar is a link to Customers with that filter pre-applied.

## 3. Customers (list + preview)

- Filters: opportunity type, income band, KYC note, last active bucket, AUM range, ID search,
  Clear filters.
- Lean table columns: Rank · Customer · AUM · Opportunities · Last active · KYC.
  - Opportunities: chip for the top rule (`Cash-heavy 84%`, `No REKSA`, `No ORI`…) plus `+N`
    for the other fired rules. Remove the long "Top reason" sentence.
  - KYC: warning icon only (accessible label "KYC note").
  - Loan exposure leaves the table (shown in preview / 360).
- Selecting a row opens a **preview panel** (right side, stacks below on narrow screens):
  flags, AUM, loan exposure, #1 next best action (+ #2 if any), main channel + last active,
  button "Open full 360". Prev/next buttons in the panel.
- Pagination 25 per page.

## 4. Customer 360

**Fixed summary header**: Customer ID, gender, income band, flags (High income, KYC note),
"Customer since {month year of first transaction}", rank label (clarify what it ranks!),
KPI tiles: AUM, Loan exposure (outside AUM), Products held (count of held, not table rows),
Last active (relative + date), Digital share (+ "x of y transactions").

**Tabs**: Overview · Holdings · Activity · Transactions

- **Overview**
  - "What to offer": rules **grouped by product**, ranked.
    - Cash-heavy is a reason supporting REKSA/ORI, not its own card.
    - Two BANCA rules → one BANCA card.
    - Ranking: (1) number of rules supporting the product, (2) amount to pitch from
      (idle cash or AUM), (3) recency of activity.
    - #1 card shows: rules as bullets with figures, "Pitch from: Rp …", "Reach via {top channel}
      ({share}% of transactions)".
  - Right column: AUM by category (stacked bar + legend, not-held categories greyed),
    5 most recent transactions with "View all" → Transactions tab.
- **Holdings**: only held products (sorted by amount, with share of AUM); not-held products
  collapsed behind "N products not held". One line: loan exposure is outside AUM, no facility detail.
- **Activity**: per-week customer-initiated chart, channel mix, type mix, bank entries table
  (BUNGA/BIAYA/PAJAK). Next step: monthly view over full history to flag dropping activity.
- **Transactions**: full table, filter chips All / Customer-initiated / Bank entries.

## 5. Data not available (do NOT fake)

Assigned RM, branch, age band, contact preference, risk profile/suitability, KYC note detail,
loan facility detail (type, kolektibilitas, DPD, maturity), AUM history, interaction/offer
history. Anything derived must come from the existing snapshot + transactions.

## 6. Design tokens

Fonts: Inter (body, tabular numbers), Space Grotesk (page titles, big numbers).
Radius 8 (controls) / 12–14 (cards). Touch targets ≥ 40–44 px. Icons: Lucide, 16 px, stroke 2.

| Token | Teal | OCBC red |
|---|---|---|
| primary | #0E6B66 | #E2231A |
| primary-strong (hover, text on tint) | #0A4F4B | #9B1B14 |
| primary-tint | #E3F0EE | #FFF1EF |
| selected-bg | #F2F8F7 | #FFF7F6 |
| primary-border | #BFDCD8 | #F5C2BE |
| page-bg | #F6F6F3 | #F7F6F5 |
| text | #17181C | #1D1B1A |
| text-muted | #5E6169 | #5E6169 |
| border | #E4E4DF | #E4E4DF |
| surface | #FFFFFF | #FFFFFF |
| warning-bg / text (KYC) | #FBF1DC / #6B4600 | same |

Product colours (charts only, same in both themes): FUNDING #4A6FD1 · ORI #1E8C84 ·
BANCA #8063C9 · REKSA #C9921A · LOAN #8B8E95.

Icons (Lucide): Portfolio `layout-dashboard`, Customers `users`, search `search`, AUM `wallet`,
loan `landmark`, KYC `triangle-alert`, high income `badge-check`, last active `clock`,
mobile `smartphone`, next best action `target`, REKSA `trending-up`, BANCA `shield`,
filters `sliders-horizontal`, open `arrow-up-right`, prev/next `chevron-left/right`.

## 7. Acceptance checklist

- [ ] Sidebar removed; top nav + search work on all pages.
- [ ] Portfolio tiles state their rule and link to a pre-filtered Customers list.
- [ ] Income band filter updates all Portfolio numbers.
- [ ] Customers table has the 6 lean columns; preview panel works with keyboard.
- [ ] Customer 360 offers grouped by product and ranked; no duplicate BANCA.
- [ ] Holdings hide not-held rows by default; "Products held" counts products.
- [ ] Prev/next on 360 follows the active filter.
- [ ] Theme tokens applied via CSS variables so teal/OCBC can be switched.
- [ ] No placeholder or invented values in production; missing data is simply not shown.
