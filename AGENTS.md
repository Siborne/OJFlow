# PROJECT KNOWLEDGE BASE

**Generated:** 2026-05-23
**Commit:** f4ac762
**Branch:** main

## OVERVIEW

OJFlow is an Electron desktop app for competitive programmers. It aggregates contests, ratings, and solved-problem statistics from 10 Online Judge platforms (Codeforces, AtCoder, LeetCode, Luogu, Nowcoder, HDU, POJ, VJudge, QOJ, Lanqiao) into a single dashboard. Built with Electron 30 + Vue 3 + TypeScript (strict mode) + Naive UI.

## STRUCTURE

```
OJFlow/
├── src/                  # Vue 3 renderer process (views, components, stores, services)
├── electron/             # Electron main process (IPC handlers, platform adapters, caching)
├── shared/               # Types + IPC channel definitions shared between processes
├── tests/                # Unit (Bun test) + E2E (Playwright) tests
├── docs/                 # PRD, design docs, release guide
├── reference/            # Reference implementations (oj_helper, OJFlow)
├── .github/workflows/    # CI/CD (release.yml - build matrix for Win/Mac/Linux)
├── index.html            # Vite entry HTML
├── vite.config.ts        # Vite config (base: './', echarts chunking)
├── tsconfig.json         # Renderer TypeScript (ESNext, strict)
├── tsconfig.electron.json # Main process TypeScript (ES2022, CommonJS)
└── eslint.config.js      # Flat config: TypeScript-ESLint + Vue + Prettier
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add new OJ platform | `electron/services/adapters/` | Implement `PlatformAdapter` interface, register in `index.ts` |
| Add IPC channel | `shared/ipc-channels.ts` | Add to `IPC_CHANNELS` + `IpcHandlerMap`, then handler in `electron/main.ts` |
| Add Vue page | `src/views/` + `src/router/index.ts` | Create component, add route |
| Add Pinia store | `src/stores/` | Use `defineStore` with Composition API |
| Modify contest logic | `src/utils/contest_utils.ts` | Date formatting, filtering |
| Change platform icons | `src/utils/platform-icons.ts` | Map platform name to icon component |
| Update rating colors | `src/utils/rating-colors.ts` | Color thresholds for rating display |
| Modify cache TTL | `electron/services/cache-service.ts` | Currently: contests 2h, ratings 6h, solved 12h |
| Change build config | `package.json` → `"build"` | electron-builder settings |

## ANTI-PATTERNS (THIS PROJECT)

- **NEVER** expose `ipcRenderer` directly to renderer — always use typed `window.api.*` via `preload.ts`
- **NEVER** use `console.log` in production — only `console.warn` and `console.error` allowed (ESLint enforced)
- **NEVER** use `as any` or `@ts-ignore` — TypeScript strict mode is enforced
- **NEVER** commit build artifacts (`dist/`, `electron-dist/`, `release/`) — they should be gitignored
- **ALWAYS** use `<script setup>` in Vue components — no Options API
- **ALWAYS** stub Naive UI components in unit tests — keep tests focused on logic

## CONVENTIONS

- **Formatter**: Prettier — `singleQuote`, `trailingComma: all`, `printWidth: 100`, `tabWidth: 2`, `endOfLine: lf`
- **Linter**: ESLint flat config — TypeScript-ESLint + Vue plugin + Prettier integration
- **TypeScript**: Strict mode in both renderer and electron tsconfigs
- **Vue**: Composition API with `<script setup>` exclusively
- **Package Manager**: Bun (preferred) — `bun.lock` present
- **Tests**: Bun test runner (`bun:test`) for unit, Playwright for E2E

## COMMANDS

```bash
# Development
bun run dev                    # Build electron TS + start Vite + launch Electron

# Build
bun run build                  # Vite frontend build
bun run build:electron         # TypeScript compile electron/ to electron-dist/
bun run dist                   # Full production build (electron TS + vite + electron-builder)

# Quality
bun run lint                   # ESLint check
bun run lint:fix               # ESLint auto-fix
bun run format                 # Prettier format
bun run type-check             # vue-tsc + tsc for both configs

# Tests
bun run test:unit              # Bun test (tests/unit/)
bun run test:e2e               # Playwright (tests/e2e/)
```

## NOTES

- `electron-dist/` is committed to repo (unusual) — contains compiled main.js for E2E tests
- `package_old.json` is a leftover file — can be removed
- `vue-router` uses v5.x (newer than typical Vue 3 v4.x)
- `release/` directory contains packaged binaries — should be gitignored
- `.qoder/repowiki/` contains internal documentation wiki content
- Cache-first strategy: return cached data immediately, refresh in background
- Streaming contests: partial results sent to renderer via `CONTESTS_PARTIAL` IPC channel
