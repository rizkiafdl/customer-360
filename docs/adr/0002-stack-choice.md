# 0002. Frontend stack

- **Status:** Accepted
- **Date:** 2026-11-23

## Context

The assessment asks for a React app. The app is a client-only dashboard over
static data (see ADR 0001). It needs customer search/filter, data tables,
charts, and a few routes. As a portfolio piece, the stack should be current
and widely known, so a reviewer can read the code without learning niche
tools. It should also make testing pure logic and components cheap.

## Decision

| Concern | Choice | Why |
| --- | --- | --- |
| Build tool | **Vite** (`react-ts` template) | Fast dev server, the current default for client-only React apps, no server runtime needed. |
| Language | **TypeScript, strict** (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`) | Catches missing-data bugs at compile time. The data has nulls, and indexed access into arrays and records is common in aggregation code. |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`) | Utility classes keep styles next to markup. v4 needs no config file. |
| Components | **shadcn/ui** (`radix-nova` style, Radix base, lucide icons) | The source is copied into `src/components/ui/`, so we own it and can change it. Accessible Radix primitives. Set up with the official Vite guide, non-interactive: `npx shadcn@latest init -t vite -b radix -p nova -y --no-monorepo --no-rtl`. |
| Charts | **Recharts** | Declarative React charts. Enough for bar, line, and pie views of portfolio and transactions. |
| Tables | **TanStack Table** | Headless: sorting, filtering, and pagination logic without imposed markup, so it renders with shadcn table styles. |
| Routing | **React Router** (library mode, `createBrowserRouter`) | The standard React router. The route table in `src/routes.tsx` is shared by the app and by tests through `createMemoryRouter`. |
| Unit / component tests | **Vitest + React Testing Library + jsdom** | Vitest reuses the Vite config and alias. RTL tests behavior the way users see it. |
| Lint | **ESLint** (typescript-eslint, react-hooks, react-refresh) | Chosen over the template's new Oxlint default because ESLint is what most reviewers know. |
| Excel ingest | **exceljs + tsx** (dev only) | Reads `.xlsx` in Node with typed cell values. `tsx` runs the TypeScript script with no build step. |

## Consequences

- One toolchain (Vite) serves dev, build, and tests.
- shadcn components are vendored code. Updates are manual
  (`npx shadcn@latest add <name> --overwrite`). The `react-refresh/only-export-components`
  lint rule is off for `src/components/ui/**`, because shadcn files export
  variants next to components.
- TypeScript 6 deprecates `baseUrl`. The `@/*` alias uses `paths` only.
- shadcn's current init uses the `cn` package (by shadcn) instead of
  `clsx` + `tailwind-merge`. `src/lib/utils.ts` re-exports it.
- No global state library. Static data and URL state (React Router search
  params) should be enough. If that changes, write a new ADR.

## Alternatives considered

- **Next.js / React Router framework mode.** Rejected: server rendering and
  server routes add nothing for static, client-only data, and they make
  hosting and testing more complex.
- **Create React App.** Rejected: deprecated.
- **MUI / Ant Design.** Rejected: heavier, harder to restyle, and the result
  looks generic. shadcn gives owned, editable components.
- **AG Grid.** Rejected: too heavy for tables of at most 5,000 rows. The free
  tier is also limited.
- **Chart.js / ECharts.** Rejected: imperative APIs that need React wrappers.
  Recharts is React-native and enough for this scope.
- **Jest.** Rejected: needs a separate transform setup. Vitest shares Vite's config.
