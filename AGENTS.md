# PROJECT KNOWLEDGE BASE

**Stack:** Electron 30 + React 18 + TypeScript strict + Zustand + Tailwind CSS 4
**Package manager:** Bun
**Desktop target:** Windows, macOS, Linux

## OVERVIEW

OJFlow aggregates upcoming contests, ratings, solved counts, Codeforces problem
search and Codeforces reports from multiple online judge platforms.

The renderer is a React application. Vue, Pinia, Naive UI and Vue Router were
removed during the migration tracked in `migration-report.md`. Do not add new
Vue files or use Vue-era commands from old documents.

## STRUCTURE

```text
src/                  React renderer
electron/             Electron main process, preload and platform adapters
shared/               IPC contracts, domain types and persistent-store schema
tests/unit/           Bun unit and interaction tests
tests/e2e/            Playwright Electron tests
scripts/              Developer and test-runner scripts
docs/                 Product, design and release documentation
reference/oj_helper/  Original Flutter reference implementation
```

## IMPORTANT FILES

| Task | Location |
|------|----------|
| Add an OJ adapter | `electron/services/adapters/`, register in `index.ts` |
| Add an IPC channel | `shared/ipc-channels.ts`, `electron/preload.ts`, `electron/main.ts` |
| Change typed renderer API | `electron/preload.ts`, `src/types/global.d.ts` |
| Change contest state | `src/stores/contest.ts` |
| Change UI mode/theme/features | `src/stores/ui.ts`, `src/views/Settings.tsx` |
| Change design tokens | `src/styles/theme.css` |
| Change Codeforces APIs | `electron/services/codeforces-service.ts` |
| Change cache TTL | `electron/services/cache-service.ts` |
| Change routes | `src/router.tsx` |
| Change window/tray/update behavior | `electron/main.ts`, `electron/services/tray.ts` |

## ARCHITECTURE RULES

- Keep `nodeIntegration: false` and `contextIsolation: true`.
- Never expose `ipcRenderer`; expose focused methods through `electron/preload.ts`.
- Keep all network access and HTML parsing in the Electron main process.
- Use HTTP(S) validation before opening external URLs or downloads.
- Cache-first contest loading must stream fresh platform results to the renderer.
- UI preferences are persisted in `electron-store` with localStorage fallback.
- `appMode` is `simple` or `full`; themes are `ocean` or `ember`; color mode is
  `auto`, `light` or `dark`.
- Feature flags live in `UserConfig.ui.features` and must have a working Settings
  control.

## TEST REQUIREMENTS

Every module and user-visible function must have a test. Do not consider work
complete until all of these pass:

```bash
bun run type-check
bun run lint
bun run format:check
bun run test:unit
bun run test:e2e
bun run build
```

`test:unit` runs each unit file in an isolated Bun process. This is deliberate:
Bun module mocks leak across files in a shared process. Add new unit tests under
`tests/unit/`; do not point Bun at the repository root because `reference/`
contains unrelated tests.

E2E runs against `dist/` with `NODE_ENV=test`. `test:e2e` compiles the main
process to `electron-dist/` before launching Playwright; both `dist/` and
`electron-dist/` are generated outputs and must not be committed.

## CODE STYLE

- Prettier: single quotes, trailing commas, width 100, 2 spaces, LF.
- TypeScript strict mode is mandatory.
- Do not use `as any` or `@ts-ignore`.
- Production logs may use `console.warn` and `console.error`; do not add
  `console.log`.
- React components use function components and hooks. No Options API patterns.
- Prefer shared contracts over local casts.

## COMMANDS

```bash
bun run dev
bun run build
bun run build:electron
bun run dist
bun run type-check
bun run lint
bun run format
bun run format:check
bun run test:unit
bun run test:e2e
```

## NOTES

- The runtime ECharts vendor chunk is intentionally split from the app chunk.
- `reference/` is ignored by Git and must not be treated as application code.
- Old docs may mention Vue; use this file and current source as the source of truth.
