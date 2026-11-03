# CLAUDE.md

## Project

OJFlow is an Electron 30 desktop client for competitive programmers. The current
renderer is React 18 + TypeScript + Zustand + Tailwind CSS 4. Vue/Pinia/Naive UI
are legacy and must not be reintroduced.

## Commands

```bash
bun run dev
bun run build
bun run build:electron
bun run type-check
bun run lint
bun run format
bun run format:check
bun run test:unit
bun run test:e2e
```

## Architecture

- `src/`: React renderer, Zustand stores, typed service wrappers and settings UI.
- `electron/`: main process, preload bridge, adapters, caching, tray and updater.
- `shared/`: IPC contracts, domain types and `electron-store` schema.
- `tests/unit/`: Bun tests, run one file per process to isolate module mocks.
- `tests/e2e/`: Playwright Electron tests against `dist/`.

## Completion Gate

Every module and user-visible function must be tested. Work is not complete
until `type-check`, `lint`, `format:check`, `test:unit`, `test:e2e` and `build`
all pass.

## Key Rules

- Use typed `window.api`; never expose `ipcRenderer`.
- Keep network/parsing in the main process.
- Validate URLs, store keys and IPC inputs.
- Use CSS variables in `src/styles/theme.css`; no hard-coded accent colors.
- Preserve simple/full mode, auto/light/dark mode and ocean/ember accent options.
- Use accessible names/tooltips on icon-only controls.
