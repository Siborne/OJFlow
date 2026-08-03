# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OJFlow is a cross-platform Electron desktop app for competitive programmers. It aggregates contests, ratings, and solved-problem statistics from 10 Online Judge platforms (Codeforces, AtCoder, LeetCode, Luogu, Nowcoder, HDU, POJ, VJudge, QOJ, Lanqiao) into a single dashboard. Built with Electron 30 + Vue 3 + TypeScript (strict mode) + Naive UI.

## Common Commands

**Development**: `bun run dev` (builds electron TS + starts Vite dev server on port 5173 + launches Electron)

**Build**:
- `bun run build` — Vite frontend build to `dist/`
- `bun run build:electron` — TypeScript compile `electron/` to `electron-dist/`
- `bun run dist` — Full production build (electron TS + vite + electron-builder)
- `bun run dist:win` / `dist:mac` / `dist:linux` — Platform-specific builds

**Testing**:
- `bun run test:unit` — Unit tests via `bun test tests/unit`
- `bun run test:e2e` — E2E tests via Playwright
- Single test file: `bun test tests/unit/contest_utils.test.ts` (pass any test file path)

**Linting/Formatting**:
- `bun run lint` / `bun run lint:fix` — ESLint on src/, electron/, shared/, tests/
- `bun run format` — Prettier
- `bun run type-check` — vue-tsc + tsc for both renderer and electron configs

Package manager: Bun (preferred). Registry configured to npmmirror.com via `.bunfig.toml`. Node >= 18, Bun >= 1.0.

## Architecture

The app uses a classic Electron two-process architecture with three code areas:

- **`src/`** — Vue 3 renderer process (views, components, Pinia stores, composables)
- **`electron/`** — Electron main process (window management, IPC handlers, platform adapters, caching, tray)
- **`shared/`** — Types, IPC channel definitions (`ipc-channels.ts`), and store schema shared between both processes

Each area has its own TypeScript config: `tsconfig.json` (renderer, ESNext) and `tsconfig.electron.json` (main process, CommonJS output to `electron-dist/`).

Vite is configured with `base: './'` (relative asset paths, required for Electron file:// protocol). ECharts and zrender are split into a separate `echarts-vendor` chunk. `build:electron` also copies `electron/app.config.json` to `electron-dist/` — if you change that config, re-run `bun run build:electron`.

### Platform Adapter Pattern

Each OJ platform implements the `PlatformAdapter` interface from `electron/services/adapters/types.ts`. `BaseAdapter` provides shared Axios HTTP + Cheerio HTML parsing + error classification. Adapters are registered as singletons in `adapters/index.ts`. Aggregator services (`contest-aggregator.ts`, `rating-aggregator.ts`, `solved-aggregator.ts`) fire all adapters in parallel via `Promise.allSettled`. Adding a new platform means creating a new adapter file, implementing the interface, and registering it.

### IPC Boundary

`preload.ts` exposes whitelisted `window.api` and `window.store` to the renderer via `contextBridge`. Channel names and typed handler signatures are defined in `shared/ipc-channels.ts`. Renderer services in `src/services/` call `window.api.*` to reach the main process.

### Caching & Request Deduplication

Main process uses a TTL-based cache (contests: 2h, ratings: 6h, solved: 12h). Cached data is returned immediately while a background refresh is triggered. `request-dedup.ts` prevents concurrent duplicate fetches for the same data.

### Streaming Contests

The contest aggregator sends partial results to the renderer via `win.webContents.send(CONTESTS_PARTIAL, ...)` as each platform responds, enabling progressive UI updates.

### State Management

Two Pinia stores: `ui` (theme scheme: ocean/violet, color mode: auto/light/dark) and `contest` (contests, favorites, platform selection, crawl days). Theme uses CSS custom properties defined in `electron/app.config.json`.

## Code Style

- Prettier: singleQuote, trailingComma: all, printWidth: 100, tabWidth: 2, LF line endings, arrowParens: avoid, no Vue script/style indent
- ESLint (flat config): `no-console` warns (except `console.warn`/`error`), `no-explicit-any` warns, `vue/multi-word-component-names` off
- Vue components use `<script setup>` Composition API exclusively
- TypeScript strict mode enforced in all three tsconfig files

## Release Process

Bump version in `package.json`, commit, push, then create and push a `v*` tag. GitHub Actions (`.github/workflows/release.yml`) builds for Windows/macOS/Linux and creates a draft GitHub Release.
