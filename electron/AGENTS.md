# ELECTRON KNOWLEDGE BASE

## OVERVIEW

Electron main process: window management, typed IPC, persistent settings,
caching, platform adapters, Codeforces queries, tray reminders and updates.

## STRUCTURE

```text
main.ts                    App lifecycle, IPC handlers, updater
preload.ts                 Context bridge
store.ts                   electron-store instance and defaults
services/
  adapters/                Ten platform adapters
  *-aggregator.ts          Parallel aggregation and streaming
  cache-service.ts         Contest/rating/solved persistent cache
  request-dedup.ts         In-flight request deduplication
  codeforces-service.ts    Problemset search and user reports
  url-security.ts          URL and store-key validation
  tray.ts                  Tray menu and reminder scheduling
  validators.ts            Domain payload validators
```

## RULES

- Never expose `ipcRenderer` directly.
- Validate every IPC input before using it.
- Only open HTTP(S) URLs. Update packages must use HTTPS, except local development.
- Do not accept arbitrary store keys; use `isAllowedStoreKey`.
- Use `fetchWithTimeout` or Axios timeout for every external request.
- Aggregate adapters with `Promise.allSettled`; one platform failure must not
  fail the whole response.
- Send contest updates using `CONTESTS_PARTIAL` with the requested day.
- Keep cache-first behavior while emitting fresh partial results to the renderer.
- Use `app.getAppPath()`-independent paths for committed build artifacts:
  production HTML is at `__dirname/../../dist/index.html`.
- Test every adapter and service with mocked HTTP/electron boundaries.

## SECURITY NOTES

- `nodeIntegration` stays disabled and `contextIsolation` enabled.
- `sandbox` is disabled because `electron-store` runs in preload; do not add
  renderer Node access.
- Downloaded updates currently rely on the configured HTTPS manifest and must
  not be replaced with arbitrary local paths.
