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
| BVX-001 | Global dark tokens, typography, radii, spacing, focus, reduced motion | `src/styles/globals.css`, shared UI primitives | `VERIFIED` | Task 10: token/style contracts passed in the 43-file aggregate focused suite; production build and branch audit passed |
| BVX-002 | App root, title-bar safety, global portals, toast/alert layers | `src/App.vue`, `src/components/MacOSTitleBar.vue`, `src/styles` | `VERIFIED` | Task 10: shell/dialog focused tests and protected-contract audit passed; browser visual connection was environment-blocked |
| BVX-003 | Left navigation, folders, dashboards, pinned tools, Direct Access ordering | `src/components/nav-menu`, `src/shared/constants/ui.js` | `VERIFIED` | Task 10: navigation primitive suite passed 18 tests; route/persistence contracts preserved in branch audit |
| BVX-004 | Center route frame, KeepAlive, resizable center/right rails | `src/views/Layout/MainLayout.vue` | `VERIFIED` | Task 10: MainLayout aggregate focused tests and ResizablePanel primitive test passed; no router changes |
| BVX-005 | Friends/Groups sidebar, live grouping, notification sheet, quick search entry | `src/views/Sidebar` | `VERIFIED` | Task 10: Sidebar aggregate focused tests and notification-sheet primitive tests passed |
| BVX-006 | Login, saved accounts, redirect, status/updater messaging | `src/views/Login` | `VERIFIED` | Task 9 commit `3cbaa625`; 11 focused login/native-branding tests, source contract audit, formatter/diff checks, production build, final review PASS |
| BVX-007 | Feed filters, date range, search, pagination, click-through | `src/views/Feed`, feed stores | `VERIFIED` | Task 10: aggregate focused route-family suite passed; production build and protected-contract audit passed |
| BVX-008 | Friends Locations segments, grouping, same-instance mode, virtualized cards | `src/views/FriendsLocations` | `VERIFIED` | Task 10: aggregate focused route-family suite passed; production build and protected-contract audit passed |
| BVX-009 | Game Log table mode, sessions mode, filters, delete confirmation | `src/views/GameLog`, `src/stores/gameLog` | `VERIFIED` | Task 10: aggregate focused route-family suite passed; production build and protected-contract audit passed |
| BVX-010 | Player List instance summary, players, Photon events, Chatbox blacklist | `src/views/PlayerList`, `src/stores/photon` | `VERIFIED` | Task 10: aggregate focused route-family suite passed; production build and protected-contract audit passed |
| BVX-011 | Multi-entity Search tabs, pagination, keyboard history, avatar providers | `src/views/Search`, search composables | `VERIFIED` | Task 10: aggregate focused route-family suite passed; production build and protected-contract audit passed |
| BVX-012 | Dashboard create/edit/save/cancel/delete, rows, panel selector, widgets | `src/views/Dashboard`, `src/stores/dashboard.js` | `VERIFIED` | Task 10: aggregate focused route-family suite passed; production build and protected-contract audit passed |
| BVX-013 | Favorite Friends two-pane groups, local/remote state, bulk actions | `src/views/Favorites/FavoritesFriend.vue` | `VERIFIED` | Task 10: aggregate focused suite passed for the Task 6 files; two pre-existing item fixture mock failures are separately recorded |
| BVX-014 | Favorite Worlds virtualization, search/sort, instance/favorite actions | `src/views/Favorites/FavoritesWorld.vue` | `VERIFIED` | Task 10: aggregate focused suite passed for the Task 6 files; two pre-existing item fixture mock failures are separately recorded |
| BVX-015 | Favorite Avatars, history, apply, invalid-avatar progress | `src/views/Favorites/FavoritesAvatar.vue` | `VERIFIED` | Task 10: aggregate focused suite passed for the Task 6 files; invalid-progress unit test passed |
| BVX-016 | Friend Log persisted filters and destructive history actions | `src/views/FriendLog` | `VERIFIED` | Task 10: aggregate focused route-family suite passed; production build and protected-contract audit passed |
| BVX-017 | Friend List filters, VIP/mutual, bulk-unfriend workflow | `src/views/FriendList` | `VERIFIED` | Task 10: aggregate focused route-family suite passed; production build and protected-contract audit passed |
| BVX-018 | Moderation ledger, filters, refresh, delete/undo actions | `src/views/Moderation` | `VERIFIED` | Task 10: aggregate focused route-family suite passed; production build and protected-contract audit passed |
| BVX-019 | Notifications table, invite requests/responses, gallery, hide/delete | `src/views/Notifications`, notification stores | `VERIFIED` | Task 10: aggregate focused route-family suite and notification-sheet primitives passed |
| BVX-020 | My Avatars grid/table, filters, editing, tags, upload/crop | `src/views/MyAvatars` | `VERIFIED` | Task 10: aggregate focused route-family suite passed; production build and protected-contract audit passed |
| BVX-021 | Instance Activity dates, filters, details, clickable axes/users | `src/views/Charts/components/InstanceActivity.vue` | `VERIFIED` | Task 10: aggregate focused analytics suite passed; production build and protected-contract audit passed |
| BVX-022 | Mutual Friends worker graph, privacy, cancel/progress, context menu | `src/views/Charts/components/MutualFriends.vue` | `VERIFIED` | Task 10: aggregate focused analytics suite passed; production build and protected-contract audit passed |
| BVX-023 | Hot Worlds rankings, windows, trends, detail sheet | `src/views/Charts/components/HotWorlds.vue` | `VERIFIED` | Task 10: aggregate focused analytics suite passed; production build and protected-contract audit passed |
| BVX-024 | Tools catalog, categories, pinning, route/dialog/native actions | `src/views/Tools`, `src/composables/useToolActions.js` | `VERIFIED` | Task 8 commits `0d6d147a` + `5d243776`; fresh catalog/collapse/pin/action focused tests, protected-action audit, formatter/diff checks, production build, final review PASS |
| BVX-025 | Gallery tabs, upload/crop/delete, inventory/redeem/consume | `src/views/Tools/Gallery.vue` | `VERIFIED` | Task 10: Gallery workflow test passed in the 15-test dialog/tools verification suite |
| BVX-026 | Screenshot Metadata search, table/list, preview, file/clipboard/upload | `src/views/Tools/ScreenshotMetadata.vue` | `VERIFIED` | Task 8 commits `0d6d147a` + `5d243776`; fresh metadata search/preview focused test, byte-identical script audit, formatter/diff checks, production build, final review PASS |
| BVX-027 | Settings IA and System/Interface/Social tabs | `src/views/Settings/components/Tabs` | `VERIFIED` | Task 8 commits `0d6d147a` + `5d243776`; fresh mounted-tab/key/intent focused tests, all-eight script audit, formatter/diff checks, production build, final review PASS |
| BVX-028 | Settings Notifications/VR/Media/Integrations tabs | `src/views/Settings/components/Tabs` | `VERIFIED` | Task 8 commits `0d6d147a` + `5d243776`; fresh mounted-tab/key/intent focused tests, all-eight script audit, formatter/diff checks, production build, final review PASS |
| BVX-029 | Settings Advanced diagnostics, cache, DB, security, destructive actions | `src/views/Settings/components/Tabs/AdvancedTab.vue` | `VERIFIED` | Task 8 commits `0d6d147a` + `5d243776`; fresh destructive/restart marker focused tests, byte-identical tab script audit, formatter/diff checks, production build, final review PASS |
| BVX-030 | Entity detail shell, breadcrumbs, User/World/Avatar/Group actions | `src/components/dialogs`, `MainDialogContainer.vue` | `VERIFIED` | Task 10: MainDialogContainer and dialog workflow suites passed; accessibility shell contracts retained |
| BVX-031 | Launch/invite/group/new-instance/import/export workflows | `src/views/Layout`, `src/views/Tools`, `src/components/dialogs` | `VERIFIED` | Task 10: Launch, Invite Group, Image Crop, Choose Favorite Group, Send Boop, dialog-container, Tools, and Gallery suite passed: 15 tests |
| BVX-032 | Quick Search worker/index/keyboard/remote targets | `src/components/QuickSearchDialog.vue`, `src/stores/quickSearch*` | `VERIFIED` | Task 10: Quick Search primitive test passed; branch audit confirms no worker-file changes |
| BVX-033 | Fullscreen image preview, crop, zoom/pan/rotate/copy/download | `src/components/FullscreenImagePreview.vue`, crop dialogs | `VERIFIED` | Task 10: fullscreen preview primitive test passed, including the established focus/accessibility contract |
| BVX-034 | Context menus, popovers, sheets, tooltips, command/select primitives | `src/components/ui`, shared menus | `VERIFIED` | Task 10: Resizable, navigation, quick-search, fullscreen, notification-sheet, and notification-item primitive tests passed: 18 tests |
| BVX-035 | Electron titlebar, tray, native dialogs, notifications, IPC | `src-electron`, `src/plugins/interopApi.js` | `VERIFIED` | Task 9 commit `3cbaa625`; protected protocol/IPC/preload/native source audit, no native diff, production build, final review PASS |
| BVX-036 | Separate VR/wrist overlay layout and update queue | `src/vr`, `src-electron/main.js` | `VERIFIED` | Task 9 commit `3cbaa625`; focused VR entry/queue/frame test, `vr.html` production output, no main-process diff, final review PASS |
| BVX-037 | Localization, accessible labels, status/platform/trust semantics | `src/localization`, shared UI | `VERIFIED` | Task 9 commit `3cbaa625`; semantic landmark/heading/decorative-image audit, existing localized controls retained, focused tests, production build, final review PASS |
| BVX-038 | Production branding copy and metadata without compatibility break | `package.json`, `src`, README/release metadata | `VERIFIED` | Task 9 commit `3cbaa625`; public copy audit, compatibility identifier assertions, formatter/diff checks, production build, final review PASS |

## Verification protocol

For each row:

1. Record the task ID and baseline commit in the task report.
2. Set status to `IN_PROGRESS` before editing.
3. Use a fresh implementer and a fresh reviewer. The reviewer checks the actual diff and the protected behavior list.
4. Set status to `REDESIGNED` only after the implementer’s targeted tests/build pass and review findings are addressed.
5. Set status to `VERIFIED` only after a final independent command/visual check confirms the row.

At final gate, run a script or manual audit over this table. Any meaningful row with `UNASSESSED`, `DESIGN_NEEDED`, `IN_PROGRESS`, or `BLOCKED` prevents a completion claim.
