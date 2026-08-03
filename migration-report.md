# OJFlow Migration Report: Vue → React

## Executive Summary

Migrate the renderer process from Vue 3 + Naive UI + Pinia to React + TailwindCSS/shadcn/ui + Zustand. The Electron main process, shared types, adapters, and utilities are **framework-agnostic and require zero changes**.

**Important clarification**: This project is already Electron-based (no Tauri code exists). The migration is purely Vue → React on the renderer side.

---

## 1. Code Classification

### Reusable Without Changes (~36 files)

| Category | Files | Notes |
|----------|-------|-------|
| Electron main process | `electron/main.ts`, `preload.ts`, `store.ts` | Zero changes |
| Adapters | 13 files in `electron/services/adapters/` | Zero changes |
| Aggregators & services | `contest-aggregator.ts`, `rating-aggregator.ts`, `solved-aggregator.ts`, `cache-service.ts`, `request-dedup.ts`, `validators.ts`, `tray.ts` | Zero changes |
| Shared types | `shared/types.ts`, `ipc-channels.ts`, `store-schema.ts` | Zero changes |
| Frontend services | `src/services/contest.ts`, `rating.ts`, `solved.ts` | Thin IPC wrappers, framework-agnostic |
| Utilities | `contest_utils.ts`, `rating-colors.ts`, `platform-icons.ts`, `echarts-setup.ts`, `migrate-storage.ts` | Pure functions |
| i18n | `src/i18n.ts` | No Vue dependency |
| Updater | `src/updater/checkUpdate.ts` | Pure fetch logic |
| CSS | `theme.css`, `a11y.css`, `animations.css`, `mobile.css` | Framework-agnostic custom properties |

### Vue-Specific (Requires Conversion — 28 files)

| Category | Files | Effort |
|----------|-------|--------|
| Entry point | `src/main.ts`, `src/App.vue` | Low — boilerplate swap |
| Stores | `src/stores/contest.ts`, `ui.ts` | Low — Pinia → Zustand |
| Router | `src/router/index.ts` | Low — Vue Router → React Router |
| Composable | `src/composables/useKeyboardShortcuts.ts` | Low — one hook |
| Components | 10 `.vue` files in `src/components/` | Medium — template → JSX, Naive UI → shadcn |
| Views | 11 `.vue` files in `src/views/` | Medium-High — largest files |
| Type declarations | `src/types/global.d.ts` | Low — remove `.vue` module decl |
| Tests | 7 unit + 1 e2e | Medium — store tests need rewrite |

---

## 2. Dependency Migration

### Remove (Vue-specific)
- `vue`, `vue-router`, `pinia`, `naive-ui`
- `@vicons/material`, `@vicons/utils`, `vfonts`
- `sass`, `@vitejs/plugin-vue`, `vue-tsc`
- `@vue/test-utils`, `eslint-plugin-vue`

### Add (React stack)
- `react`, `react-dom`, `@types/react`, `@types/react-dom`
- `react-router-dom`
- `zustand`, `@tanstack/react-query`
- `@vitejs/plugin-react`
- `tailwindcss`, `@tailwindcss/vite`
- shadcn/ui (via CLI init)
- `@testing-library/react`, `@testing-library/jest-dom`
- `eslint-plugin-react`, `eslint-plugin-react-hooks`

### Keep
- `axios`, `cheerio`, `date-fns`, `echarts` (runtime)
- `electron`, `electron-store`, `electron-builder` (desktop)
- `vite`, `typescript`, `eslint`, `prettier` (tooling)
- `@playwright/test`, `concurrently`, `wait-on` (dev)

---

## 3. Architecture Changes

### Current
```
src/
  main.ts          (Vue createApp)
  App.vue          (Naive UI providers + router-view)
  router/          (Vue Router)
  stores/          (Pinia)
  views/           (11 Vue SFCs)
  components/      (10 Vue SFCs)
  composables/     (1 Vue composable)
  services/        (IPC wrappers — keep)
  utils/           (pure functions — keep)
  styles/          (CSS — keep)
```

### Target
```
src/
  main.tsx         (React createRoot)
  App.tsx          (QueryClientProvider + RouterProvider)
  router.tsx       (React Router v6)
  stores/          (Zustand)
  hooks/           (TanStack Query hooks + custom hooks)
  views/           (11 React function components)
  components/      (10 React function components + shadcn/ui)
  services/        (IPC wrappers — unchanged)
  utils/           (pure functions — unchanged)
  styles/          (TailwindCSS entry + theme)
```

Note: The monorepo `apps/packages` structure from the original request is **deferred** — the project is a single Electron app with no shared packages needed yet. Premature splitting adds complexity without benefit. The `shared/` directory already serves as the cross-process type boundary.

---

## 4. Migration Order (Module by Module)

1. **Foundation** — Vite React plugin, TailwindCSS, shadcn/ui init, React entry point
2. **Router + Shell** — React Router, NavigationPage layout
3. **Stores** — Zustand stores (contest, ui) + TanStack Query hooks
4. **Dashboard/Contest** — Contest page + sub-components (most complex)
5. **Settings** — Settings page
6. **Rating** — RatingPage with ECharts
7. **Solved** — SolvedNumPage with ECharts
8. **Favorites** — FavoritesPage
9. **Services/Feature** — ServicePage, Feature page
10. **Cleanup** — Remove Vue deps, old files, update tests

Each step produces a runnable app.

---

## 5. Vue → React Pattern Mapping

| Vue | React |
|-----|-------|
| `ref()` | `useState()` |
| `computed()` | `useMemo()` |
| `watch()` | `useEffect()` with deps |
| `onMounted()` | `useEffect(() => {}, [])` |
| `onUnmounted()` | `useEffect(() => () => {}, [])` cleanup |
| `reactive()` | `useState()` object or `useReducer()` |
| `defineProps<T>()` | Function component props type |
| `defineEmits<T>()` | Callback props |
| `v-if` | `&&` conditional |
| `v-for` | `.map()` |
| `v-model` | Controlled `value` + `onChange` |
| `<slot>` | `children` or render props |
| `<transition>` | CSS transitions or framer-motion |
| Naive UI components | shadcn/ui + TailwindCSS |

---

## 6. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| ECharts integration in React | Use `echarts-for-react` wrapper or keep manual ref-based init (current pattern) |
| Theme system (CSS vars) | Keep existing `theme.css` custom properties, map to Tailwind `dark:` variant |
| Responsive sidebar/bottom nav | shadcn/ui Sheet + custom Tailwind responsive classes |
| IPC event listener cleanup | Ensure `useEffect` cleanup removes `onContestsPartial` listener |
| Test migration | Keep Playwright e2e mostly as-is; rewrite unit tests for Zustand |
