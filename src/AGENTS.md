# SRC KNOWLEDGE BASE

## OVERVIEW

Vue 3 renderer process — the user-facing UI layer. Uses Composition API exclusively with `<script setup>`.

## STRUCTURE

```
src/
├── main.ts              # App entry: creates Vue app, initializes Pinia + router
├── App.vue              # Root component
├── router/index.ts      # Vue Router v5 config
├── views/               # Page components (11 views)
├── components/          # Reusable UI components
│   └── contest/         # Contest-specific sub-components (6 files)
├── stores/              # Pinia stores (contest, ui)
├── services/            # Frontend data fetching (contest, rating, solved)
├── composables/         # Vue composables (useKeyboardShortcuts)
├── utils/               # Pure utilities (contest_utils, echarts-setup, platform-icons, rating-colors)
├── types/               # Re-exports from shared/types
├── styles/              # CSS (theme, a11y, animations, mobile)
├── assets/              # Icons (ico, icns, png)
└── updater/             # Auto-update logic
```

## WHERE TO LOOK

| Task | File |
|------|------|
| Add new page | Create in `views/`, add route in `router/index.ts` |
| Add reusable component | `components/` (contest-specific → `components/contest/`) |
| Add Pinia store | `stores/` using `defineStore` with Composition API |
| Add composable | `composables/` — name as `use*.ts` |
| Add frontend service | `services/` — wraps IPC calls to main process |
| Add utility | `utils/` — pure functions only, no side effects |
| Modify theme | `styles/theme.css` |
| Add mobile styles | `styles/mobile.css` |

## CONVENTIONS

- **Vue**: `<script setup lang="ts">` exclusively — no Options API
- **Component naming**: PascalCase filenames matching component name
- **Store pattern**: `defineStore` with Composition API (setup function syntax)
- **Services**: Thin wrappers around `window.api.*` IPC calls
- **Composables**: Return reactive state + methods, name with `use` prefix

## ANTI-PATTERNS

- **NEVER** import from `electron/` or `shared/` directly — use `window.api.*` for IPC
- **NEVER** use `any` type — use proper interfaces from `types/` or `shared/types`
- **ALWAYS** stub Naive UI components in tests (`n-button`, `n-grid`, etc.)
