# BetterVRCX Complete Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Each task has a fresh implementer, an independent reviewer, a targeted test gate, and a local commit.

**Goal:** Redesign every meaningful BetterVRCX visible surface around the approved VRCNext-inspired desktop control-center system while preserving all VRCX behavior, native contracts, persistence, and route compatibility.

**Architecture:** Add semantic BetterVRCX tokens and shared visual primitives at the existing Vue/CSS layer, then migrate the shell, overlays, route families, and native/VR surfaces in sequential bounded tasks. Presentation components continue to call the existing Pinia stores, composables, coordinators, APIs, database services, and Electron bridges; no new global DOM/state architecture is introduced.

**Tech Stack:** Vue 3 Composition API, Pinia, Vue Router, Vite, Tailwind/Reka UI primitives, Vitest, Electron, existing C#/native bridge, existing localization and worker infrastructure.

## Global Constraints

- Preserve route names, hash paths, auth guards, navigation metadata, dashboard IDs, tool keys, and persisted configuration keys.
- Preserve API, database, coordinator, native IPC, Electron, tray, protocol, window, updater, and VR-overlay contracts.
- Preserve table columns, row actions, pagination, sorting, virtualization, lazy loading, `KeepAlive`, workers, chart data processors, and confirmation workflows.
- Preserve localization keys, accessible labels, status/platform/trust semantics, notification indicators, and platform gates.
- Use Vue components, Pinia state, existing composables, and existing UI primitives. Do not introduce a vanilla DOM/global-state architecture.
- Do not copy VRCNext source, DOM topology, CSS class names, storage keys, host bridge, or request logic.
- Keep the current VRCX logo image assets temporarily; change visible product naming to BetterVRCX.
- Make no network writes. Do not push, open a pull request, create a tag, or modify remote configuration.
- Do not add co-authors to commits.
- Every production behavior change follows TDD: write a focused failing test, run it to observe the expected failure, implement the smallest change, run the test green, then refactor while green.
- Every task has a fresh implementer and a fresh reviewer; overlapping UI changes are executed sequentially.
- A coverage row is `VERIFIED` only after implementation, review, targeted checks, and an independent final check.

## Task map

| Task | Deliverable | Coverage rows |
|---|---|---|
| 1 | BetterVRCX semantic design tokens and reusable surface/state primitives | BVX-001 |
| 2 | Desktop shell, titlebar-safe layout, navigation, sidebar, and status frame | BVX-002–BVX-005 |
| 3 | Shared dialog/detail/quick-search/fullscreen interaction layer | BVX-030–BVX-034 |
| 4 | Feed, Friends Locations, Player List, and Search route family | BVX-006–BVX-011 |
| 5 | Game Log, Friend Log, Friend List, Moderation, and Notifications route family | BVX-009, BVX-016–BVX-019 |
| 6 | Favorites, My Avatars, and Gallery visual workspaces | BVX-013–BVX-015, BVX-020, BVX-025 |
| 7 | Dashboard and Charts analytics workspaces | BVX-012, BVX-021–BVX-023 |
| 8 | Tools catalog, Screenshot Metadata, and Settings IA | BVX-024, BVX-026–BVX-029 |
| 9 | Login, Electron/native visual contracts, VR overlay, and public branding | BVX-006, BVX-035–BVX-038 |
| 10 | Whole-branch accessibility, compatibility, visual, and coverage verification | all rows |

### Task 1: BetterVRCX design tokens and surface primitives

**Files:**
- Create: `src/styles/bettervrcx.css`
- Modify: `src/styles/globals.css`
- Create: `src/shared/constants/bettervrcxDesign.js`
- Create: `src/shared/constants/__tests__/bettervrcxDesign.test.js`
- Create: `src/styles/__tests__/bettervrcxStyles.test.js`
- Create: `docs/task-reports/task-01-design-system.md`

**Interfaces:**
- `BETTERVRCX_DESIGN_TOKENS` exports the approved semantic token names and values for testable documentation/runtime inspection.
- `bettervrcx.css` defines the same `--bv-*` custom properties, aliases the existing theme variables without removing them, and provides `.bv-surface`, `.bv-surface-raised`, `.bv-eyebrow`, `.bv-status-dot`, `.bv-badge`, `.bv-focus-ring`, `.bv-skeleton`, `.bv-empty-state`, and `.bv-danger-zone` classes.

**Steps:**

- [ ] Write failing token tests that assert the exported token object includes the base/rail/surface/control/hover/border/accent/status/text roles from `docs/BETTERVRCX_DESIGN_SPEC.md` and that each token value matches the approved value.
- [ ] Run `npx vitest run src/shared/constants/__tests__/bettervrcxDesign.test.js`; observe failure because the module does not exist.
- [ ] Write a failing stylesheet contract test that reads `src/styles/bettervrcx.css` and asserts each `--bv-*` name plus reduced-motion and focus selectors are present.
- [ ] Run that test and observe the expected missing-file failure.
- [ ] Add the token module and stylesheet, import the stylesheet from the existing global style entry, preserve all existing aliases, and keep status colors semantic rather than profile-theme-dependent.
- [ ] Run both focused tests and `npm run prod`; all focused assertions must pass and the production build must complete.
- [ ] Self-review for duplicated token definitions, removed legacy selectors, color-only status cues, and selectors that affect the VR entry unintentionally.
- [ ] Commit locally with `feat: add BetterVRCX design system primitives` and write the task report with the failing and passing commands.

### Task 2: Desktop shell, navigation, sidebar, and status frame

**Files:**
- Modify: `src/App.vue`
- Modify: `src/views/Layout/MainLayout.vue`
- Modify: `src/components/MacOSTitleBar.vue`
- Modify: `src/components/nav-menu/NavMenu.vue`
- Modify: `src/components/nav-menu/NavMenuFolderItem.vue`
- Modify: `src/components/nav-menu/NavMenuFooter.vue`
- Modify: `src/views/Sidebar/Sidebar.vue`
- Modify: `src/views/Layout/StatusBar.vue`
- Create/modify: nearest existing shell/navigation test files under `src/**/__tests__` or `*.spec.js`
- Create: `docs/task-reports/task-02-shell.md`

**Interfaces:**
- Keep `MainLayout`’s existing left resize, center `RouterView`/`KeepAlive`, right resize/collapse, status bar, and global dialog mount points.
- Keep navigation state and handlers from `useNavLayout`, `uiStore`, dashboard insertion, tool pinning, context menus, and `VRCX_customNavMenuLayoutList` unchanged.
- Keep macOS draggable/non-draggable regions and existing Electron window controls intact.

**Steps:**

- [ ] Write failing render/interaction tests for collapsed navigation retaining icon/active state, navigation click preserving the existing route key, and shell rendering the existing global dialog mounts.
- [ ] Run the focused shell tests to observe failures for the new class/structure contract.
- [ ] Implement the three-rail shell styling and minimal template wrappers: 42px desktop taskbar rhythm, 220/60px left rail, 260/60px right rail, content offsets, compact active states, collapsed status dots, and BetterVRCX visible label.
- [ ] Keep all resize handles and pointer/keyboard handlers bound to the existing state; do not replace the shell with CSS-only toggles.
- [ ] Run focused tests, `npm run prod`, and `npm run format:check -- --write` only on changed files if the project command permits a scoped run; record any baseline formatter limitation.
- [ ] Verify a representative route mount and that titlebar interactive controls remain outside the drag region.
- [ ] Commit locally with `feat: redesign BetterVRCX desktop shell` and write the report.

### Task 3: Shared dialog, detail, quick-search, and fullscreen layer

**Files:**
- Modify: `src/components/dialogs/MainDialogContainer.vue`
- Modify: `src/components/dialogs/UserDialog/UserDialog.vue`
- Modify: `src/components/dialogs/WorldDialog/WorldDialog.vue`
- Modify: `src/components/dialogs/AvatarDialog/AvatarDialog.vue`
- Modify: `src/components/dialogs/GroupDialog/GroupDialog.vue`
- Modify: `src/components/dialogs/QuickSearchDialog.vue`
- Modify: `src/stores/quickSearch.js`
- Modify: `src/stores/quickSearchWorker.js`
- Modify: `src/components/FullscreenImagePreview.vue`
- Modify: existing dialog/portal primitives under `src/components/ui`
- Create/modify: focused dialog and quick-search tests in existing test directories
- Create: `docs/task-reports/task-03-overlays.md`

**Interfaces:**
- Preserve store-driven dialog selection, `uiStore.dialogCrumbs`, `showUserDialog`/`showWorldDialog`/`showAvatarDialog`/`showGroupDialog`, portal layer ordering, Promise-based confirm/prompt/OTP behavior, and existing dialog action handlers.
- Preserve quick-search worker initialization, locale/confusable indexing, Ctrl/Cmd+K, arrow-key navigation, remote target selection, and entity activation.
- Preserve fullscreen click-away, copy/download, zoom/pan/rotate/reset, and crop-dialog callers.

**Steps:**

- [ ] Write failing tests for opening a dialog through the existing store contract, Escape closing the topmost overlay, Ctrl/Cmd+K focus/activation, and fullscreen action buttons remaining available after visual restructuring.
- [ ] Run the tests to observe failures in the new overlay contract.
- [ ] Implement the shared split detail shell, modal backdrop/blur/radius/elevation, breadcrumb header, tabs, status/action groups, focus-visible treatment, and explicit loading/empty/error zones without moving business logic into the components.
- [ ] Implement the quick-search and fullscreen visual hierarchy with the existing worker and handlers unchanged.
- [ ] Run focused tests and `npm run prod`; inspect portal layers for dialogs, sheets, fullscreen preview, and notification center.
- [ ] Commit locally with `feat: unify BetterVRCX dialog and overlay surfaces` and write the report.

### Task 4: Feed, Friends Locations, Player List, and Search

**Files:**
- Modify: `src/views/Login/Login.vue`
- Modify: `src/views/Feed/Feed.vue`
- Modify: `src/views/FriendsLocations/FriendsLocations.vue`
- Modify: `src/views/FriendsLocations/components/FriendsLocationsCard.vue`
- Modify: `src/views/PlayerList/PlayerList.vue`
- Modify: `src/views/PlayerList/components/PhotonEventTable.vue`
- Modify: `src/views/Search/Search.vue`
- Modify: relevant route-family styles and nearest existing tests
- Create: `docs/task-reports/task-04-discovery.md`

**Interfaces:**
- Preserve feed filters/date range/pagination and entity click-through.
- Preserve Friends Locations segments, grouping, same-instance toggle, card scale/spacing, virtualization, and favorite/group semantics.
- Preserve Player List current-instance data, Photon current/previous events, blacklist dialog, platform/trust indicators, and refresh behavior.
- Preserve Search Users/Worlds/Avatars/Groups composables, independent pagination, keyboard history, provider dialog, and clear-all.

**Steps:**

- [ ] Write failing component tests for the page-frame/toolbar contracts and at least one action path per route family: feed filter event, location segment selection, player row entity activation, and search tab/pagination state.
- [ ] Run the focused tests and observe expected failures for the new presentation contracts.
- [ ] Apply the page-frame hierarchy, dense table treatment, image-led location cards, current-instance command-center header, and shared search result grammar. Add a clearly labeled Photon diagnostics subview and keep Chatbox blacklist separate where the existing component already exposes it.
- [ ] Keep all existing composables, store mutations, coordinator calls, and virtualizer bindings intact.
- [ ] Run focused tests, `npm run prod`, and a representative route smoke check through the desktop entry.
- [ ] Commit locally with `feat: redesign discovery and presence views` and write the report.

### Task 5: Game Log, social logs, moderation, and notifications

**Files:**
- Modify: `src/views/GameLog/GameLog.vue`
- Modify: `src/views/GameLog/sessions/GameLogSessions.vue`
- Modify: `src/views/FriendLog/FriendLog.vue`
- Modify: `src/views/FriendList/FriendList.vue`
- Modify: `src/views/Moderation/Moderation.vue`
- Modify: `src/views/Notifications/Notification.vue`
- Modify: `src/views/Sidebar/components/NotificationCenterSheet.vue`
- Modify: relevant columns/table styles and nearest existing tests
- Create: `docs/task-reports/task-05-activity-history.md`

**Interfaces:**
- Preserve raw/session view state, filters, date range, session grouping/aggregation/deduplication, infinite loading, database deletion confirmation, now-playing updates, and dashboard widget inputs.
- Preserve friend-log and moderation table persistence, relationship mutations, bulk-unfriend progress, source/target links, and confirmation flows.
- Preserve notification types, invite/response actions, expiration checks, hide/delete behavior, gallery links, and sidebar notification grouping/unseen state.

**Steps:**

- [ ] Write failing tests for the explicit Table/Sessions switch, independent filter state, destructive confirmation invocation, notification action routing, and bulk operation progress state.
- [ ] Run the focused tests to observe failure before modifying templates/styles.
- [ ] Implement high-density activity/audit frames, live-event emphasis, action clusters, pagination/loading/empty/error states, and responsive table overflow while preserving all transformation/store code.
- [ ] Keep notifications and invites distinct from ordinary history rows and keep the sidebar sheet’s grouping/mark-seen behavior.
- [ ] Run focused tests and `npm run prod`; verify game-log session builders and table columns remain unchanged in the diff.
- [ ] Commit locally with `feat: redesign activity history and notifications` and write the report.

### Task 6: Favorites, My Avatars, and Gallery workspaces

**Files:**
- Modify: `src/views/Favorites/components/FavoritesToolbar.vue`
- Modify: `src/views/Favorites/components/FavoritesContentHeader.vue`
- Modify: `src/views/Favorites/components/FavoritesMoveDropdown.vue`
- Modify: `src/views/Favorites/FavoritesFriend.vue`
- Modify: `src/views/Favorites/FavoritesWorld.vue`
- Modify: `src/views/Favorites/FavoritesAvatar.vue`
- Modify: `src/views/MyAvatars/MyAvatars.vue`
- Modify: `src/views/Tools/Gallery.vue`
- Modify: nearest existing tests and route-family styles
- Create: `docs/task-reports/task-06-library-surfaces.md`

**Interfaces:**
- Preserve remote/local group distinction, capacities, visibility, counts, group ordering, search/sort, splitter, card density, selection/edit mode, copy/move, bulk unfavorite, import/export, cache semantics, and virtualization.
- Preserve My Avatars grid/table, filters, current-avatar state, editor actions, upload/crop, tags, privacy, and context menu.
- Preserve Gallery tabs, uploads/crop/delete, fullscreen, VRC+ icons/emoji/stickers/prints/inventory, redeem/consume behavior, and destructive confirmations.

**Steps:**

- [ ] Write failing tests for remote/local group labeling, edit selection, bulk action state, invalid-avatar progress, grid/table switching, and Gallery tab/action routing.
- [ ] Run focused tests to observe expected failures.
- [ ] Implement the shared two-pane group rail/content pane, image-first cards, visible density controls, clear action hierarchy, selection state, and full-workspace media headers.
- [ ] Keep entity-specific commands and `favoriteCoordinator`/gallery store calls unchanged.
- [ ] Run focused tests and `npm run prod`; verify large-list virtualization remains present and no remote/local semantics are flattened.
- [ ] Commit locally with `feat: redesign favorites avatar and media workspaces` and write the report.

### Task 7: Dashboard and Charts analytics workspaces

**Files:**
- Modify: `src/views/Dashboard/Dashboard.vue`
- Modify: `src/views/Dashboard/components/DashboardToolbar.vue`
- Modify: `src/views/Dashboard/components/DashboardRow.vue`
- Modify: `src/views/Dashboard/components/panelRegistry.js`
- Modify: `src/views/Charts/components/InstanceActivity.vue`
- Modify: `src/views/Charts/components/MutualFriends.vue`
- Modify: `src/views/Charts/components/HotWorlds.vue`
- Modify: chart/workspace style files and nearest existing tests
- Create: `docs/task-reports/task-07-dashboard-charts.md`

**Interfaces:**
- Preserve dashboard config persistence, panel registry, one/two-panel rows, split direction, resize autosave, edit/save/cancel/delete, live updates, and embedded panels.
- Preserve Instance Activity date/time/filter calculations, chart interaction, lazy detail rendering; Mutual Friends privacy/cancel/progress/cache/worker/graph context; Hot Worlds windows/rankings/trends/entity dialogs.

**Steps:**

- [ ] Write failing tests for dashboard edit mode/save/cancel, panel selection, split direction, chart date/filter controls, mutual graph cancellation, and Hot Worlds detail activation.
- [ ] Run focused tests and observe failures before presentation code changes.
- [ ] Implement a common analytics frame and an obvious dashboard builder canvas with panel boundaries, row direction, empty state, and compact widget chrome.
- [ ] Keep ECharts/Sigma/worker/database processors untouched except for class hooks and layout-safe sizing.
- [ ] Run focused tests and `npm run prod`; verify the dashboard panel registry still imports every existing panel.
- [ ] Commit locally with `feat: redesign dashboards and analytics` and write the report.

### Task 8: Tools catalog, Screenshot Metadata, and Settings IA

**Files:**
- Modify: `src/views/Tools/Tools.vue`
- Modify: `src/views/Tools/components/ToolItem.vue`
- Modify: `src/views/Tools/ScreenshotMetadata.vue`
- Modify: `src/views/Settings/Settings.vue`
- Modify: `src/views/Settings/components/SettingsGroup.vue`
- Modify: `src/views/Settings/components/SettingsItem.vue`
- Modify: all eight settings tab components only where layout classes/wrappers are needed
- Modify: nearest existing tests and route-family styles
- Create: `docs/task-reports/task-08-tools-settings.md`

**Interfaces:**
- Preserve `useToolActions`, route/store/dialog/native action types, category collapse key, tool pinning, exports, folder operations, uploads, metadata parser, keyboard preview navigation, and toasts.
- Preserve all eight settings tab keys and immediate setters/stores, platform gates, restart requirements, API-key dialogs, VR/media/integration dialogs, diagnostics, cache/DB/security/destructive workflows.

**Steps:**

- [ ] Write failing tests for tool category collapse/pinning, route/dialog/native dispatch, Screenshot Metadata search/preview action, settings tab-key preservation, and destructive/restart warning markers.
- [ ] Run focused tests and observe expected failures.
- [ ] Implement a searchable/scannable tool catalog, full Screenshot Metadata inspector frame, and responsive settings index/sidebar with intent-based section grouping.
- [ ] Distinguish immediate, restart-required, platform-dependent, credential, and destructive settings visually without changing the underlying controls or setter calls.
- [ ] Run focused tests and `npm run prod`; verify all eight tab bodies remain mounted/preserved as the existing implementation requires.
- [ ] Commit locally with `feat: redesign tools and settings` and write the report.

### Task 9: Login, Electron/native UI, VR overlay, and branding

**Files:**
- Modify: `src/views/Login/Login.vue`
- Modify: `src/vr/Vr.vue`
- Modify: `src/vr/vr.css`
- Modify: `src/App.vue`, `src/components/MacOSTitleBar.vue` only for public copy/class hooks if needed
- Modify: public copy in `README.md`, `README/`, `package.json` description/homepage/product-facing fields only after compatibility review
- Create/modify: branding/native/VR focused tests and `docs/task-reports/task-09-native-branding.md`

**Interfaces:**
- Preserve saved-account login, redirect-after-login, updater/status messaging, native titlebar/tray/notification/IPC/API contracts, platform-specific behavior, separate VR entry, overlay state/update queues, and current asset paths.
- Keep package `name`, Electron `appId`, user-data paths, protocol names, updater keys, and native method names unchanged unless the reviewer proves a safe explicit exception.

**Steps:**

- [ ] Write failing tests for visible BetterVRCX branding without changing compatibility identifiers, login action routing, VR entry rendering, and native boundary class/attribute contracts.
- [ ] Run focused tests to observe failure.
- [ ] Apply the final login visual frame, constrained VR overlay layout, and public product copy migration. Keep logo assets temporarily and do not invent new native features.
- [ ] Run focused tests, `npm run prod`, and inspect `git diff` for accidental package/appId/protocol/IPC changes.
- [ ] Commit locally with `feat: finalize native surfaces and BetterVRCX branding` and write the report.

### Task 10: Whole-branch verification and coverage closure

**Files:**
- Modify: `docs/REDESIGN_COVERAGE.md`
- Modify: `docs/BASELINE_VERIFICATION.md` only with new evidence, never by rewriting baseline results
- Create: `docs/FINAL_VERIFICATION.md`
- Create: `docs/task-reports/task-10-final-verification.md`

**Interfaces:**
- Consume all task reports, local commit history, baseline evidence, and coverage rows.
- Produce a final coverage table with only `VERIFIED`, `NOT_APPLICABLE`, or explicitly justified `BLOCKED` statuses, plus exact command output and visual inspection evidence.

**Steps:**

- [ ] Write a failing verification script/test that parses `docs/REDESIGN_COVERAGE.md` and fails if any meaningful row contains `UNASSESSED`, `DESIGN_NEEDED`, `IN_PROGRESS`, or `BLOCKED`.
- [ ] Run the script before updating statuses and observe the expected failure.
- [ ] Run focused tests for every changed route family, `npm run prod`, format/lint/typecheck/test commands, and a representative desktop visual smoke pass. Record pre-existing failures separately from regressions.
- [ ] Run a protected-contract audit over routes, persistence keys, IPC names, worker files, and native/VR entrypoints; inspect the full branch diff for VRCNext source/architecture copying and public-branding consistency.
- [ ] Update every coverage row from task evidence only; leave no unsupported feature represented as working functionality.
- [ ] Run the verification gate again and require a passing result; write `docs/FINAL_VERIFICATION.md` with baseline-versus-redesign results, local commit list, coverage totals, gap summary, and remote-write confirmation.
- [ ] Commit locally with `docs: record BetterVRCX redesign verification` and write the report.

## Review gates

Each task reviewer receives the task brief, implementer report, and actual diff from the pre-task commit. The reviewer must provide both a specification verdict and a code-quality verdict. Critical/Important findings enter the task fix loop; minor findings are recorded in the SDD ledger and triaged by the final whole-branch reviewer. No task advances with an open load-bearing finding.

## Plan self-review

- Spec coverage: the ten tasks map to all 38 rows in `docs/REDESIGN_COVERAGE.md`, include the separate VR/native entry, preserve the VRCNext feature-gap boundary, and reserve final verification for status closure.
- Placeholder scan: no task depends on `TBD`, `TODO`, an unnamed file, or an unspecified test. Every task names its files, preserved interfaces, failing-test target, command gate, and local commit.
- Type/contract consistency: design tokens are consumed as CSS custom properties and an exported constant; shell work consumes existing nav/resize/router state; overlays consume existing store/coordinator/portal contracts; route tasks consume existing store/composable/worker contracts; final verification consumes the same coverage IDs.
