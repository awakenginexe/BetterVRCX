# Task 7 — Dashboard and Charts Analytics Workspaces

## Scope and commits

- Branch: `codex/vrcnext-redesign`
- Required base: `b57b72c4bcec00e3ecca47d4b79bac763a12084b`
- Implementation: `a6b7c87b6b949ef3a6d364e5539f39bd09ebef58` (`feat: redesign dashboards and analytics`)
- Remote writes: none. No push, PR, or GitHub change was made.

## Delivered design

- Reframed the dashboard as a clear builder canvas with an elevated edit toolbar, distinct row boundaries, layout-choice affordances, selector metadata, and compact embedded-panel chrome.
- Retained persisted panel keys and all existing panel imports; registry audit found all 20 persisted panel keys and their 20 component imports.
- Added a shared responsive analytics frame for Instance Activity, Mutual Friends, and Hot Worlds. The frame groups controls, constrains summary/content widths, gives the graph/progress and rankings readable surface boundaries, and uses parent-aware sizing when embedded in a dashboard.
- Added reduced-motion handling for the dashboard builder and responsive toolbar/ranking layout. Existing localization keys were reused; no locale files changed.

## Protected contracts reviewed

- Dashboard persistence remains in `useDashboardStore`; its config key, sanitize/clone paths, edit/save/cancel/delete flow, live panel updates, one/two-panel rows, split direction, and `ResizablePanelGroup` autosave IDs were not changed.
- `panelComponentMap` retains every existing page, chart, and widget mapping. `panelRegistryKeys` is a derived audit export only and does not alter lazy loading.
- Instance Activity retains its date navigation, calendar conversion, filters, lazy detail rendering, ECharts options/click handling, and data composables. Only wrapper classes and height calculation were adjusted for layout-safe embedding.
- Mutual Friends retains opt-out privacy gates, progress/cancel forwarding, cached graph load, worker serialization, Sigma graph/context actions, and database calls. Worker and store processor logic were unchanged.
- Hot Worlds retains date windows, ranking/trend calculation, world/user dialog actions, and lazy detail retrieval. Only workspace wrappers and height calculation changed.

## TDD evidence

RED command:

```text
npm test -- src/views/Dashboard/__tests__/DashboardWorkspace.test.js src/views/Charts/__tests__/analyticsWorkspace.test.js
```

Result before presentation changes: 2 files failed, 6 tests failed. Failures required the dashboard builder/edit-save-cancel boundary, panel selector metadata, split direction contract, Instance Activity date/filter toolbar, Mutual Friends cancellation/progress surface, and Hot Worlds detail activation surface.

GREEN command (final run):

```text
npm test -- src/views/Dashboard/__tests__/DashboardWorkspace.test.js src/views/Charts/__tests__/analyticsWorkspace.test.js src/views/Charts/composables/__tests__/useActivityDataFilter.test.js src/views/Charts/composables/__tests__/useActivityStats.test.js src/views/Charts/composables/__tests__/useChartHelpers.test.js src/views/Charts/composables/__tests__/useDateNavigation.test.js src/views/Charts/__tests__/graphLayoutWorker.test.js src/components/dialogs/UserDialog/__tests__/UserDialogMutualFriendsTab.test.js
```

Result: 8 files passed, 60 tests passed.

## Build and static verification

- Registry audit: PASS — 20 persisted panel keys and 20 component imports present.
- `npm run prod`: PASS (exit 0). Vite transformed 4,405 modules and completed in 8.76 seconds; the license manifest was generated with 105 entries. The build emitted non-failing plugin timing diagnostics and noted one license entry requiring review.
- `npx oxfmt --check` across all 12 changed source/test/style files: PASS.
- `git diff --check`: PASS before the implementation commit.

## Baseline and remaining concerns

- No scoped Dashboard/Charts baseline failures were encountered. The full repository test suite was not run because Task 7 requires focused and relevant broader coverage rather than whole-branch verification; Task 10 owns that aggregate gate.
- Visual desktop smoke testing was not performed in this non-interactive run. The production build validates compilation and the focused tests validate the exposed builder/analytics contracts, but manual interaction with live ECharts and Sigma rendering remains a final verification concern.
- Pre-existing untracked migrated documentation under `docs/` was preserved and excluded from both Task 7 commits.
