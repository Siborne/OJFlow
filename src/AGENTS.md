# SRC KNOWLEDGE BASE

## OVERVIEW

React 18 renderer for OJFlow. State uses Zustand, routing uses React Router 6,
styling uses Tailwind CSS 4 with CSS variables, and asynchronous server data uses
TanStack Query where appropriate.

## STRUCTURE

```text
main.tsx              React root and startup migration
App.tsx               Providers, store initialization, IPC subscriptions
router.tsx            Hash router and lazy page loading
views/                Pages
components/           Shared and contest components
components/ui/        shadcn/Radix primitives
stores/               Zustand UI and contest stores
services/             Typed renderer wrappers around window.api
utils/                Pure utilities
hooks/                React hooks
styles/               Theme, accessibility, motion and mobile CSS
updater/              Renderer-side update manifest checks
```

## RULES

- Use function components and hooks.
- Use `useUiStore` selectors rather than subscribing to the entire UI store.
- Every Settings toggle must persist and affect runtime behavior.
- Use CSS variables from `styles/theme.css`; do not add hard-coded orange/teal
  rgba values.
- Use `ContestService.openUrl` instead of browser navigation for external links.
- Keep pages usable at 320 px width and in both simple/full app modes.
- Add `aria-label`/`title` to icon-only controls.
- Test every page and interactive component under `tests/unit/`.

## UI MODES

- `simple`: fewer navigation entries, no quick-stat dashboard or history section.
- `full`: all navigation entries and advanced tools.
- Color modes: `auto`, `light`, `dark`.
- Accent schemes: `ocean`, `ember`.

The DOM exposes `data-mode`, `data-theme`, `data-scheme` and
`data-reduce-motion` on `<html>`.

## ANTIPATTERNS

- Do not import `electron/` runtime code into the renderer.
- Do not call `window.api` directly from views; use `src/services/`.
- Do not use `as any`; model the IPC response in `shared/types.ts`.
- Do not leave a button with only visual styling and no behavior.
- Do not use Vue directives, SFCs, Pinia or Naive UI APIs.
