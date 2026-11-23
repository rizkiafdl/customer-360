# F3. "What to offer" panel — design

- **Date:** 2026-11-23
- **Status:** Written in a non-interactive run on 2026-11-23. Product
  decisions are the user's (2026-11-23). Other calls are marked "builder's
  call", each with one line of reason.
- **Parent spec:** `docs/superpowers/specs/2026-11-23-customer-360-product-design.md`,
  feature F3, sections 5.3, 5.4, and 6.
- **Depends on:** F2 (merged) and F1
  (`docs/superpowers/specs/2026-11-23-f1-visual-system-and-customer-detail-design.md`,
  sections 4.2 and 4.5). The build starts after F1 merges.
- **ADR:** none. F3 makes no project-wide decision.

If this document and the parent spec disagree, this document wins.

## 1. Intent

F3 answers the parent spec's fourth question: "What should I offer next,
and why?" On `/customers/:id` it shows the rules that fired for the
customer, each with the reason and rule text from F2. The RM reads the
reason, then checks the evidence in the sections below.

## 2. Goals, non-goals, anti-goals

- **Goals:**
  - A "What to offer" panel: one insight card per fired rule, in
    `RULE_ORDER`, and a fixed empty-state line when no rule fired.
  - The KYC income-band note, shown apart from the offers.
  - Every new text is a constant or a fixed template in
    `src/lib/insights/` with an exact-string test (CLAUDE.md Rule 9).
- **Non-goals:** no new rule or threshold; no unfired rules (F6 lists
  every rule); no dedupe; no worklist (F4), `/overview` (F5), or `/rules`
  (F6).
- **Anti-goals (failure even if it works):**
  - Brand red on a card, or a card colored on its whole surface.
  - A kind shown by color alone, with no icon and no text label.
  - The KYC note shown as an offer, counted as one, or placed first.
  - Text built in a component, or text with an adjective or advice tone.
  - A component that maps `CustomerEvaluation` or reads `RULES` itself
    (CLAUDE.md Rule 1).

## 3. Constraints

- Layers (ADR 0004): the page renders the `Customer360` view model.
  Components may import types from lower layers, never compute.
- Colors only through the F1 tokens `--opportunity`, `--warning`, `--info`
  and their Tailwind mappings. No hex, `rgb()`, or `oklch()`.
- Reason and rule text come from F2 unchanged; their money already went
  through `formatIDR()`.

## 4. Decisions

### 4.1 Settled by the user (2026-11-23)

- Order: `RULE_ORDER` (`cash-heavy` → `investment-gap-reksa` →
  `investment-gap-ori` → `investment-gap-banca` → `no-aum` →
  `high-income-no-banca`). `evaluateCustomer` already returns this order.
- **Double "No BANCA":** a customer who fires `investment-gap-banca` and
  `high-income-no-banca` sees both cards. They are two rules with different
  evidence. Real data: customers 6386, 6513, 8797.
- The KYC note is a note, not an offer: never ranked, never a top reason.

### 4.2 Approaches: where the panel's data comes from

| Option | Outcome |
| --- | --- |
| **A. A pure `offerPanel(evaluation)` in insights; `buildCustomer360` adds its result as `offers`** | **Chosen (builder's call).** One view model per screen (parent spec 6). `buildCustomer360` already holds the profile and portfolio rows, so it calls `evaluateCustomer` once. Page tests keep using the fixture dataset. |
| B. A second selector `getOfferPanel(id)`, called by `CustomerPage` | Rejected. Two lookups, and the page joins two view models. |
| C. The component calls `getCustomerEvaluation` and maps it | Rejected. Mapping in a component (CLAUDE.md Rule 1). |

### 4.3 Shape, kinds, and copy (builder's call)

New file `src/lib/insights/panel.ts`. Reason: CLAUDE.md Rule 9 puts every
template in `src/lib/insights/`.

```ts
type InsightKind = 'opportunity' | 'warning' | 'info'   // F1 spec 4.5
interface OfferCard { id: InsightId; kind: InsightKind; kindLabel: string;
                      label: string; reason: string; ruleText: string }
interface OfferPanel { cards: OfferCard[]; emptyText: string | null;
                       note: OfferCard | null }
```

- `cards`: fired rules, in order, never deduped. `label` from `RULES`.
- `emptyText`: the empty-state line when `cards` is empty, else `null`.
- `note`: the KYC note (`label` from `KYC_NOTE`), or `null`.
- `INSIGHT_KINDS`: the six rules → `opportunity` (they are the offer rules
  F4 ranks); `kyc-income-band` → `warning` (F1 spec 4.2 names the KYC note
  as the `--warning` example). F3 does not use `info`; it stays in the type
  because the F1 card design has it.

| Constant | Text |
| --- | --- |
| Panel title | `What to offer` |
| Empty-state line | `No offer rule fired.` |
| Note heading | `Note` |
| Kind labels | `Opportunity`, `Warning`, `Info` |

The empty line says "offer rule", so it stays true when the KYC note shows
below it (9 of the 16 customers with no fired rule have the note).

### 4.4 Placement and the card (builder's call)

- The panel sits between the KPI row and Holdings, full width. Reason: it
  answers the page's last question, and the evidence follows below it.
- The card follows F1 spec 4.5: kind icon and kind label, rule label,
  reason, then the rule text in muted type. Color is a left border and the
  icon tint only. Icons (lucide): `Lightbulb` (opportunity),
  `TriangleAlert` (warning), `Info` (info), `aria-hidden`.
- Offer cards are a list named `Offers`. The note follows a separator,
  under the `Note` heading.

```text
┌ WHAT TO OFFER ─────────────────────────────────────────────┐
│ ▌[bulb] Opportunity · No BANCA                             │
│ ▌No BANCA. AUM Rp 1.384.200.000.                           │
│ ▌Holds no BANCA, and AUM is above Rp 100.000.000.  (muted) │
│ ▌[bulb] Opportunity · High income, no BANCA                │
│ ▌No BANCA. Income band >25 Juta - 50 Juta.                 │
│ ── Note ────────────────────────────────────────────────── │
│ ▌[!] Warning · KYC income band                             │
│ ▌Income band >3 Juta - 5 Juta. AUM Rp 2.000.000.000.       │
└────────────────────────────────────────────────────────────┘
```

## 5. Real-data counts (measured 2026-11-23)

Selector contract tests pin these numbers.

| Item | Count |
| --- | --- |
| Customers with 0 / 1 / 2 / 3 / 4 cards | 16 / 49 / 26 / 8 / 1 |
| Empty panel that still shows the KYC note | 9 (for example 1047) |
| Both BANCA cards | 3 (6386, 6513, 8797) |

## 6. Done when

- `panel.ts` tests: order, both BANCA cards, empty line only with no card,
  the note never in `cards`, kinds, exact strings for every constant.
- Selector tests: the counts in section 5; for all 100 customers, card ids
  equal `getCustomerEvaluation(id).insights` ids.
- UI tests on fixture view models: cards, empty state, note apart, kind
  label as text.
- e2e: `/customers/6513` shows exactly two cards, both with `No BANCA.`
  reasons;
  `/customers/1047` shows `No offer rule fired.` and the KYC note. No
  console errors.
- `npm run check` passes; `checks` and `e2e` pass on the PR.

## 7. Left to the builder

- Type and component names, and file splits inside each layer.
- Spacing and type scale, within F1 "compact".
- The fixture customer for "no offer rule, KYC note shown".
