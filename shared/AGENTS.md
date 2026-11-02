# SHARED KNOWLEDGE BASE

## OVERVIEW

Framework-neutral contracts shared by the React renderer and Electron main
process. This directory must remain free of runtime dependencies on either side.

## FILES

- `types.ts`: domain models, IPC payloads, problem search, reports, UI modes and
  feature flags.
- `ipc-channels.ts`: channel constants and `IpcHandlerMap`.
- `store-schema.ts`: persistent `electron-store` schema.

## RULES

- Keep `IPC_CHANNELS` and `IpcHandlerMap` synchronized.
- Prefer discriminated and explicit interfaces over loose records.
- Use `unknown` at trust boundaries, then narrow with validators.
- Do not import from `src/` or `electron/`.
- Add tests for every new runtime contract constant or payload helper.
