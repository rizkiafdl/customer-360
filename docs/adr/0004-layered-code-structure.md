# 0004. Layered code structure with one-way imports

- **Status:** Accepted
- **Date:** 2026-11-23

## Context

CLAUDE.md Rule 1 says business logic lives in `src/lib/` as pure, tested
functions and components only render. A written rule alone does not stop a
page from importing the raw JSON and computing a total inline. Later
features (the insight rules, the worklist, the summary strip) all reuse the
same definitions, so a second copy of a calculation in a component would
make two screens disagree.

The app has static data (ADR 0001) and no global state library (ADR 0002).
Code has to be split so that every number on screen comes from one named
function, and so that a tool, not only a reviewer, checks the split.

## Decision

### Layers

Code is split into layers by folder. Imports go one way, from top to
bottom.

| Layer | Folder | May import from `src/` |
| --- | --- | --- |
| UI | `src/pages/`, `src/components/` (including `src/components/ui/`), `src/routes.tsx`, `src/main.tsx` | selectors, insights, domain, shared, types, other UI |
| Selectors | `src/lib/selectors/` | `src/data`, insights, domain, shared, types |
| Insights | `src/lib/insights/` | domain, shared, types |
| Domain | `src/lib/domain/` | shared, types |
| Data | `src/data/` | types |
| Shared | `src/lib/format.ts`, `src/lib/utils.ts` | nothing from `src/` |
| Types | `src/types/` | nothing from `src/` outside `src/types/` |

### Rules

1. Only `src/lib/selectors/` imports `src/data`. Every other layer gets data
   through a selector.
2. No layer imports a layer above it. For example, domain must not import
   insights, selectors, or UI.
3. A layer may skip layers downward. For example, UI may import a domain
   constant directly. This keeps the rule one-way without pass-through
   selectors that add nothing.
4. The rule catches both import forms: the `@/` alias (`@/data`,
   `@/data/index`, `@/lib/selectors/x`) and relative paths that reach the
   same folder (`../data`, `../../data/index`).
5. Test files follow the rule of the layer they are in, with no exception.
   Contract tests that run domain functions on the real data live in the
   selectors layer. Domain and insight tests use small hand-made fixtures.

### Selector pattern

A selector is a pure function that takes the dataset as an argument (for
example `customerCount(dataset)`), plus a thin export bound to the real
data (for example `getCustomerCount()`). Tests call the pure function with
a fixture, and contract tests call the bound export.

### Enforcement

ESLint's built-in `no-restricted-imports` rule, with one config block per
layer in `eslint.config.js`. The blocks have distinct `files` globs, because
in flat config a later block that sets the same rule for the same file
replaces the earlier setting instead of merging with it. Each block lists
the forbidden targets in both the alias form and the relative form.

`eslint.config.test.ts` runs ESLint through its Node API on short code
strings and proves that each bad import is an error and each allowed import
is not. `npm run lint` and CI apply the rule to the whole repo.

## Consequences

- A component that imports `src/data` fails `npm run lint` and CI.
- One feature's code lives in about three folders (selectors, insights or
  domain, and UI).
- Domain and insight functions take plain arrays, so their tests do not
  load the 5,000-row dataset.
- The insights and selectors folders are covered by the config before
  their first file exists.
- A default block forbids `src/data` for every file under `src/`, so a new
  folder with no layer block (for example `src/hooks/`) still cannot read
  the raw data. It gets no other layer check until the config gains a block
  for it, and the ESLint test must gain a case at the same time.

## Alternatives considered

- **Feature folders (`src/features/<name>/{logic,ui}`).** Rejected: the
  insight rules are shared by several features, so most logic would move to
  a shared folder anyway, and it breaks CLAUDE.md Rule 1.
- **A state store (Zustand, Redux selectors).** Rejected: the data is
  static, and ADR 0002 rules out a global state library.
- **`eslint-plugin-boundaries` or `eslint-plugin-import`.** Rejected: a new
  dependency for five folders, when the built-in rule is enough.
- **`dependency-cruiser`.** Rejected: a second tool and a second CI step
  for the same check.
- **Strict layering with no downward skips.** Rejected: UI would need a
  pass-through selector for every domain constant it shows (for example a
  category color map).
