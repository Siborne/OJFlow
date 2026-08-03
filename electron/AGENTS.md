# ELECTRON KNOWLEDGE BASE

## OVERVIEW

Electron main process — handles IPC, platform adapters, caching, system tray, auto-updater. Runs in Node.js context with full system access.

## STRUCTURE

```
electron/
├── main.ts              # App entry: window creation, IPC handlers, updater
├── preload.ts           # Context bridge: exposes typed APIs to renderer
├── store.ts             # electron-store instance for persistent config
├── app.config.json      # App configuration (crawl settings)
└── services/
    ├── adapters/        # Platform adapters (10 OJ platforms)
    │   ├── index.ts     # Adapter registry + factory functions
    │   ├── types.ts     # PlatformAdapter interface
    │   ├── base-adapter.ts # Base class for common logic
    │   └── *.adapter.ts # Individual platform implementations
    ├── cache-service.ts # In-memory cache with TTL
    ├── contest.ts       # Single-platform contest fetching
    ├── contest-aggregator.ts # Multi-platform contest aggregation
    ├── rating.ts        # Single-platform rating fetching
    ├── rating-aggregator.ts  # Multi-platform rating aggregation
    ├── solvedNum.ts     # Single-platform solved count
    ├── solved-aggregator.ts  # Multi-platform solved aggregation
    ├── request-dedup.ts # Request deduplication
    ├── tray.ts          # System tray + contest reminders
    └── validators.ts    # Input validation
```

## WHERE TO LOOK

| Task | File |
|------|------|
| Add new OJ platform | `services/adapters/` — implement `PlatformAdapter`, register in `index.ts` |
| Add IPC channel | `main.ts` — add handler + type in `shared/ipc-channels.ts` |
| Modify caching | `services/cache-service.ts` — TTL values for contests/rating/solved |
| Change tray behavior | `services/tray.ts` — system tray + reminder scheduling |
| Modify updater | `main.ts` — `checkForUpdatesOnStartup()` + `downloadAndLaunch()` |
| Add store field | `store.ts` + update `shared/store-schema.ts` |

## CONVENTIONS

- **TypeScript**: ES2022 target, CommonJS modules, strict mode
- **IPC pattern**: `ipcMain.handle()` + typed channel constants from `shared/ipc-channels.ts`
- **Cache-first**: Return cached data immediately, refresh in background
- **Streaming**: Partial results sent via `CONTESTS_PARTIAL` channel
- **Security**: Only `http/https` URLs allowed for `OPEN_URL` — validate before `shell.openExternal()`

## ANTI-PATTERNS

- **NEVER** expose `ipcRenderer` directly — always use typed API via `preload.ts`
- **NEVER** allow arbitrary URL protocols in `OPEN_URL` — only `http/https`
- **NEVER** skip input validation in IPC handlers — check type + length
- **ALWAYS** use `fetchWithTimeout()` for network requests — never raw `fetch()`
- **ALWAYS** classify errors with `classifyFetchError()` — provide user-friendly messages

## NOTES

- `electron-dist/` is committed for E2E tests — normally would be gitignored
- `app.config.json` is copied to `electron-dist/` during build (manual step)
- Cache TTLs: contests 2h, ratings 6h, solved 12h (in `cache-service.ts`)
- `request-dedup.ts` prevents duplicate concurrent requests to same platform
