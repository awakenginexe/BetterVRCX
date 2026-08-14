# BetterVRCX Redesign Baseline Verification

Captured before production redesign edits in the isolated worktree at commit `914ea4d3c4d253a3733d364dbaeff99449c6c202`.

## Environment

- Windows PowerShell
- System Node: `v22.19.0`
- System npm: `10.9.3`
- Bundled workspace Node path: `C:\Users\sigma\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`
- Bundled workspace Node: `v24.14.0`
- Package engine floor: Node `>=24.15.0`, npm `>=11.5.0`
- Install command used: `npm ci --engine-strict=false`

## Results

| Command | Result | Baseline observation |
|---|---|---|
| `npm run format:check` | Fails | Oxfmt reports pre-existing formatting issues in `src/stores/invite.js` and `src/views/Settings/dialogs/OpenSourceSoftwareNoticeDialog.vue`. |
| `npm run lint` | Fails | `lint:oxlint` reports pre-existing errors/warnings across Vue, Electron, service, store, and utility files; the chained ESLint stage is not reached. |
| `npm run typecheck:js` | Fails | Existing errors across API/avatar/instance/notification/VRC+/*world*, stores, views, coordinators, and Vite configuration. |
| `npm run typecheck:vue` | Fails | Existing inference/prop/store/type errors across App, navigation, dialogs, settings, tables, sidebar, and configuration. |
| `npm run typecheck:node` | Fails | Existing localization, CLI, and Vite configuration typing errors. |
| `npm run test` | Fails | `35 failed / 157 passed` test files; `143 failed / 1961 passed` tests; 3 unhandled errors. Failures include missing test mocks/imports, Pinia/i18n setup issues, UI warnings, and a database mock method mismatch. |
| `npm run prod` | Passes | Vite production build completed; license manifest generated with 105 entries, 2 requiring review. |

## Interpretation

These are baseline failures, not redesign claims. Each task must run targeted checks and avoid adding new failures in files it changes. The production build is the initial executable gate. The final report must distinguish baseline failures from regressions and must not claim that the whole repository’s pre-existing checks pass unless they are independently repaired and verified.

