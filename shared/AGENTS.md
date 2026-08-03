# SHARED KNOWLEDGE BASE

## OVERVIEW

Types and IPC channel definitions shared between Electron main process and Vue renderer. The contract layer that ensures type-safe communication.

## STRUCTURE

```
shared/
├── types.ts             # Core domain types (Contest, Rating, SolvedNum, etc.)
├── ipc-channels.ts      # IPC channel constants + type-safe handler map
└── store-schema.ts      # Persistent store schema (electron-store)
```

## WHERE TO LOOK

| Task | File |
|------|------|
| Add new IPC channel | `ipc-channels.ts` — add to `IPC_CHANNELS` + `IpcHandlerMap` |
| Add domain type | `types.ts` — add interface, update union types if needed |
| Add store field | `store-schema.ts` — add to schema interface |
| Modify fetch response | `types.ts` — update `*FetchResponse` interfaces |

## CONVENTIONS

- **Types**: Use `interface` for objects, `type` for unions/primitives
- **IPC channels**: String literal constants in `IPC_CHANNELS` object
- **Handler map**: `IpcHandlerMap` maps channel → `{ args, return }` for type safety
- **Platform types**: `ContestPlatform`, `RatingPlatform`, `SolvedPlatform` — union types

## ANTI-PATTERNS

- **NEVER** import from `electron/` or `src/` — this layer has zero runtime dependencies
- **NEVER** use `any` in type definitions — use `unknown` if type is truly dynamic
- **ALWAYS** keep `IPC_CHANNELS` and `IpcHandlerMap` in sync — they define the contract
