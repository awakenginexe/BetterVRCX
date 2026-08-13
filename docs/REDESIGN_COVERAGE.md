# BetterVRCX Redesign Coverage Matrix

This matrix is the completion gate for the redesign. It tracks user-visible coverage rather than file count. A row may move only through the allowed statuses:

`UNASSESSED` → `DESIGN_NEEDED` → `IN_PROGRESS` → `REDESIGNED` → `VERIFIED`

Allowed terminal exceptions are `NOT_APPLICABLE` and `BLOCKED`. `BLOCKED` requires a documented external or architectural blocker; it is not a substitute for unfinished work.

## Baseline

- Worktree: `C:\Users\sigma\Desktop\BetterVRCX-codex-vrcnext-redesign`
- Branch: `codex/vrcnext-redesign`
- BetterVRCX baseline: `914ea4d3c4d253a3733d364dbaeff99449c6c202`
- Frozen VRCNext reference: `C:\Users\sigma\Desktop\VRCNext-BetterVRCX-Reference` at `a31da174c0e6130dcf428bdf0ffc6f47d22fabc2`
- Matrix owner: redesign task/reviewer pair for each row; final verification is independent.

## Coverage rows

| ID | Surface / behavior | Authoritative paths | Initial status | Verification evidence required |
|---|---|---|---|---|
| BVX-001 | Global dark tokens, typography, radii, spacing, focus, reduced motion | `src/styles/globals.css`, shared UI primitives | `REDESIGNED` | Token review, format/lint on changed files, production build, visual shell check |
| BVX-002 | App root, title-bar safety, global portals, toast/alert layers | `src/App.vue`, `src/components/MacOSTitleBar.vue`, `src/styles` | `REDESIGNED` | Portal/z-order review, macOS drag-region inspection, build |
| BVX-003 | Left navigation, folders, dashboards, pinned tools, Direct Access ordering | `src/components/nav-menu`, `src/shared/constants/ui.js` | `REDESIGNED` | Persistence/route checks, keyboard/focus review, navigation visual check |
| BVX-004 | Center route frame, KeepAlive, resizable center/right rails | `src/views/Layout/MainLayout.vue` | `REDESIGNED` | Route smoke test, resize/collapse check, no dialog regression |
| BVX-005 | Friends/Groups sidebar, live grouping, notification sheet, quick search entry | `src/views/Sidebar` | `REDESIGNED` | Virtualization and action checks, collapsed rail visual check |
| BVX-006 | Login, saved accounts, redirect, status/updater messaging | `src/views/Login` | `DESIGN_NEEDED` | Auth form behavior, redirect guard, visual check |
| BVX-007 | Feed filters, date range, search, pagination, click-through | `src/views/Feed`, feed stores | `REDESIGNED` | Task 4A commits `cbb66195` + `7820d4a5`; 44 focused tests, row-ID fix review PASS, production build |
| BVX-008 | Friends Locations segments, grouping, same-instance mode, virtualized cards | `src/views/FriendsLocations` | `REDESIGNED` | Task 4A commits `cbb66195` + `7820d4a5`; focused segment/virtualizer/card tests, review PASS, production build |
| BVX-009 | Game Log table mode, sessions mode, filters, delete confirmation | `src/views/GameLog`, `src/stores/gameLog` | `REDESIGNED` | Task 5A commits `06e7613f` + `2091f5ea`; 36 focused tests, active-session count regression, review clean, production build |
| BVX-010 | Player List instance summary, players, Photon events, Chatbox blacklist | `src/views/PlayerList`, `src/stores/photon` | `REDESIGNED` | Task 4B commit `620ac3b4`; 30 focused tests, reviewer PASS, production build |
| BVX-011 | Multi-entity Search tabs, pagination, keyboard history, avatar providers | `src/views/Search`, search composables | `REDESIGNED` | Task 4B commit `620ac3b4`; 30 focused tests, reviewer PASS, production build |
| BVX-012 | Dashboard create/edit/save/cancel/delete, rows, panel selector, widgets | `src/views/Dashboard`, `src/stores/dashboard.js` | `REDESIGNED` | Task 7 commits `a6b7c87b` + `61eb0bcb`; 62 relevant tests, registry audit, review clean, production build |
| BVX-013 | Favorite Friends two-pane groups, local/remote state, bulk actions | `src/views/Favorites/FavoritesFriend.vue` | `REDESIGNED` | Task 6 commits `0846db75` + `8fe8a582` + `6518c5d9`; local/remote/action tests, review clean, production build |
| BVX-014 | Favorite Worlds virtualization, search/sort, instance/favorite actions | `src/views/Favorites/FavoritesWorld.vue` | `REDESIGNED` | Task 6 commits `0846db75` + `8fe8a582` + `6518c5d9`; workspace styling/move tests, review clean, production build |
| BVX-015 | Favorite Avatars, history, apply, invalid-avatar progress | `src/views/Favorites/FavoritesAvatar.vue` | `REDESIGNED` | Task 6 commits `0846db75` + `8fe8a582` + `6518c5d9`; progress/view/move tests, review clean, production build |
| BVX-016 | Friend Log persisted filters and destructive history actions | `src/views/FriendLog` | `REDESIGNED` | Task 5A commits `06e7613f` + `2091f5ea`; focused filter/delete-confirmation tests, review clean, production build |
| BVX-017 | Friend List filters, VIP/mutual, bulk-unfriend workflow | `src/views/FriendList` | `REDESIGNED` | Task 5A commits `06e7613f` + `2091f5ea`; focused selection/progress/relationship tests, review clean, production build |
| BVX-018 | Moderation ledger, filters, refresh, delete/undo actions | `src/views/Moderation` | `REDESIGNED` | Task 5A commits `06e7613f` + `2091f5ea`; focused filter/refresh/delete tests, review clean, production build |
| BVX-019 | Notifications table, invite requests/responses, gallery, hide/delete | `src/views/Notifications`, notification stores | `REDESIGNED` | Task 5B commits `c891a027` + `1c759daf`; 11 focused tests, loading/label regressions, review clean, production build |
| BVX-020 | My Avatars grid/table, filters, editing, tags, upload/crop | `src/views/MyAvatars` | `REDESIGNED` | Task 6 commits `0846db75` + `8fe8a582`; grid/table persistence tests, review clean, production build |
| BVX-021 | Instance Activity dates, filters, details, clickable axes/users | `src/views/Charts/components/InstanceActivity.vue` | `REDESIGNED` | Task 7 commits `a6b7c87b` + `61eb0bcb` + `da7367ab`; 62 relevant tests, container sizing/accessibility, review clean, production build |
| BVX-022 | Mutual Friends worker graph, privacy, cancel/progress, context menu | `src/views/Charts/components/MutualFriends.vue` | `REDESIGNED` | Task 7 commits `a6b7c87b` + `61eb0bcb`; 62 relevant tests, cancellation/resize regression, review clean, production build |
| BVX-023 | Hot Worlds rankings, windows, trends, detail sheet | `src/views/Charts/components/HotWorlds.vue` | `REDESIGNED` | Task 7 commits `a6b7c87b` + `61eb0bcb` + `12fe1073`; 62 relevant tests, ranking/detail/container regression, review clean, production build |
| BVX-024 | Tools catalog, categories, pinning, route/dialog/native actions | `src/views/Tools`, `src/composables/useToolActions.js` | `VERIFIED` | Task 8 commits `0d6d147a` + `5d243776`; fresh catalog/collapse/pin/action focused tests, protected-action audit, formatter/diff checks, production build, final review PASS |
| BVX-025 | Gallery tabs, upload/crop/delete, inventory/redeem/consume | `src/views/Tools/Gallery.vue` | `REDESIGNED` | Task 6 commits `0846db75` + `8fe8a582`; tab/upload/refresh tests, review clean, production build |
| BVX-026 | Screenshot Metadata search, table/list, preview, file/clipboard/upload | `src/views/Tools/ScreenshotMetadata.vue` | `VERIFIED` | Task 8 commits `0d6d147a` + `5d243776`; fresh metadata search/preview focused test, byte-identical script audit, formatter/diff checks, production build, final review PASS |
| BVX-027 | Settings IA and System/Interface/Social tabs | `src/views/Settings/components/Tabs` | `VERIFIED` | Task 8 commits `0d6d147a` + `5d243776`; fresh mounted-tab/key/intent focused tests, all-eight script audit, formatter/diff checks, production build, final review PASS |
| BVX-028 | Settings Notifications/VR/Media/Integrations tabs | `src/views/Settings/components/Tabs` | `VERIFIED` | Task 8 commits `0d6d147a` + `5d243776`; fresh mounted-tab/key/intent focused tests, all-eight script audit, formatter/diff checks, production build, final review PASS |
| BVX-029 | Settings Advanced diagnostics, cache, DB, security, destructive actions | `src/views/Settings/components/Tabs/AdvancedTab.vue` | `VERIFIED` | Task 8 commits `0d6d147a` + `5d243776`; fresh destructive/restart marker focused tests, byte-identical tab script audit, formatter/diff checks, production build, final review PASS |
| BVX-030 | Entity detail shell, breadcrumbs, User/World/Avatar/Group actions | `src/components/dialogs`, `MainDialogContainer.vue` | `REDESIGNED` | Task 3A commits `a73dbb7f` + `c81e6564`; focused shell/action tests, reviewer PASS, production build |
| BVX-031 | Launch/invite/group/new-instance/import/export workflows | `src/views/Layout`, `src/views/Tools`, `src/components/dialogs` | `DESIGN_NEEDED` | Dialog caller/result behavior and destructive confirmation check |
| BVX-032 | Quick Search worker/index/keyboard/remote targets | `src/components/QuickSearchDialog.vue`, `src/stores/quickSearch*` | `REDESIGNED` | Task 3B commits `5f63cd69` + `5e771146`; focused search/preview tests, review PASS, production build |
| BVX-033 | Fullscreen image preview, crop, zoom/pan/rotate/copy/download | `src/components/FullscreenImagePreview.vue`, crop dialogs | `REDESIGNED` | Task 3B commits `5f63cd69` + `5e771146`; focused close/action tests, accessibility review PASS, production build |
| BVX-034 | Context menus, popovers, sheets, tooltips, command/select primitives | `src/components/ui`, shared menus | `DESIGN_NEEDED` | Focus/escape/layer behavior and representative caller review |
| BVX-035 | Electron titlebar, tray, native dialogs, notifications, IPC | `src-electron`, `src/plugins/interopApi.js` | `DESIGN_NEEDED` | Desktop build/native contract review; no IPC name changes |
| BVX-036 | Separate VR/wrist overlay layout and update queue | `src/vr`, `src-electron/main.js` | `DESIGN_NEEDED` | `vr.html` build and constrained layout/IPC review |
| BVX-037 | Localization, accessible labels, status/platform/trust semantics | `src/localization`, shared UI | `DESIGN_NEEDED` | Locale build/check, keyboard/focus and semantic color review |
| BVX-038 | Production branding copy and metadata without compatibility break | `package.json`, `src`, README/release metadata | `DESIGN_NEEDED` | Search for public VRCX copy, package/app ID compatibility review |

## Verification protocol

For each row:

1. Record the task ID and baseline commit in the task report.
2. Set status to `IN_PROGRESS` before editing.
3. Use a fresh implementer and a fresh reviewer. The reviewer checks the actual diff and the protected behavior list.
4. Set status to `REDESIGNED` only after the implementer’s targeted tests/build pass and review findings are addressed.
5. Set status to `VERIFIED` only after a final independent command/visual check confirms the row.

At final gate, run a script or manual audit over this table. Any meaningful row with `UNASSESSED`, `DESIGN_NEEDED`, `IN_PROGRESS`, or `BLOCKED` prevents a completion claim.
