# Task 5B: Notifications and Invite Responses

## Baseline and scope

- Base commit: `620ac3b4` (`feat: redesign player list and search`).
- Coverage: BVX-019.
- Surfaces: Notifications route and invite request/response/edit/confirm dialogs.
- No routes, stores, APIs, coordinators, localization, dependencies, global CSS, native/IPC, VR, or remote changes were made.

## Changed files

- `src/views/Notifications/Notification.vue`
- `src/views/Notifications/dialogs/SendInviteRequestResponseDialog.vue`
- `src/views/Notifications/dialogs/EditAndSendInviteResponseDialog.vue`
- `src/views/Notifications/dialogs/SendInviteResponseDialog.vue`
- `src/views/Notifications/dialogs/SendInviteResponseConfirmDialog.vue`
- `src/views/Notifications/__tests__/Notifications.test.js`
- `docs/task-reports/task-05b-notifications.md`

## TDD evidence

### RED

Command:

```text
npx vitest run src/views/Notifications/__tests__/Notifications.test.js
```

After correcting the focused test harness mocks, the pre-production RED run failed 6 presentation-hook assertions while the existing filter/action test passed. The failures identified the missing notification page frame and the missing dialog shell, focus, and danger hooks.

### GREEN

The same focused command passed after the scoped implementation: 1 test file passed, 10 tests passed.

## Final verification

- Focused suite: 1 test file passed, 10 tests passed.
- `npx oxfmt --check` on every changed source/test file: passed.
- `git diff --check`: passed.
- `npm run prod`: passed; Vite transformed 4,400 modules and generated the 105-entry license manifest (2 requiring review).

## Preserved behavior and contracts

- Notification type/search filtering, persisted `VRCX_notificationTableFilters`, refresh/loading state, filtered row counts, pagination/table configuration, and row ID behavior remain unchanged.
- Existing expiration handling, hide/delete actions and prompts, fullscreen/gallery preview, thumbnail conversion, response routing, and notification table columns remain wired through the existing columns/store contracts.
- Invite request/response dialogs retain message-table refresh calls, row edit/confirm flows, send/cancel behavior, platform/VRC+ image upload paths, API request shapes, hide-after-send behavior, and existing model/emit names.
- The route now uses existing `bv-surface`, `bv-surface-raised`, `bv-eyebrow`, `bv-empty-state`, and `bv-focus-ring` hooks; the confirm dialog adds the existing `bv-danger-zone` and dialog danger-action hook. Styles remain scoped to the notification route.

## Baseline concerns

- The repository had unrelated staged Task 5A changes and pre-existing untracked redesign/spec/planning documents before this task. They were left untouched and excluded from the Task 5B commit.
- The first RED attempt exposed only a test-harness issue because the Pinia mock omitted `defineStore`; the focused mock was corrected to preserve real Pinia exports before recording the intended RED result. No production behavior was changed for that repair.

## Fix round 1

### Review findings disposition

- Empty state during loading: fixed. The Notifications route supplies an explicit `DataTableLayout` empty slot, so it bypassed the layout's default `!loading` guard. The custom `DataTableEmpty` now uses the same `!isNotificationsLoading` condition, preserving the loading overlay without a concurrent no-data/no-matches state.
- Visible and unread counts: fixed. Both badges now render visible localized labels and retain their counts. The route uses `view.notification.visible` and `view.notification.unread`, with values added to every shipped locale file (`cs`, `en`, `es`, `fr`, `hu`, `ja`, `ko`, `pl`, `pt`, `ru`, `th`, `vi`, `zh-CN`, and `zh-TW`); the existing locale loader continues to fall back to `en.json` for unavailable locale files.

### TDD evidence

#### RED

```text
npx vitest run src/views/Notifications/__tests__/Notifications.test.js

Test Files  1 failed (1)
Tests  2 failed | 9 passed (11)
```

The new label test failed because the header had only numeric badges and no visible label elements. The new loading test failed because the explicit empty slot still rendered `DataTableEmpty` while `isNotificationsLoading` was true.

#### GREEN

```text
npx vitest run src/views/Notifications/__tests__/Notifications.test.js

Test Files  1 passed (1)
Tests  11 passed (11)
```

The focused suite was rerun after formatting with the same 11/11 result.

### Focused verification

```text
npx vitest run src/views/GameLog/__tests__/GameLog.test.js src/views/GameLog/__tests__/GameLogSessions.test.js src/views/GameLog/__tests__/buildGameLogSessions.test.js src/views/FriendLog/__tests__/FriendLog.test.js src/views/FriendList/__tests__/FriendList.test.js src/views/Moderation/__tests__/Moderation.test.js src/views/Moderation/__tests__/columns.test.js

Test Files  7 passed (7)
Tests  36 passed (36)
```

- A JSON coverage check confirmed both new keys exist under `view.notification` in all 14 shipped locale files and are absent from the adjacent `view.moderation` sections.
- `npx oxfmt --check` passed on all 16 changed source, test, and localization files after formatting.
- `git diff --check` passed.
- `npm run prod` passed: Vite transformed 4,400 modules and the license manifest contained 105 entries, 1 requiring review.

### Baseline concerns

- The pre-existing untracked files under `docs/` and `docs/implementation-plans/` remain untouched and are excluded from this fix commit.
- The production build reports 1 third-party license entry requiring review; this is build output, not a notification-route regression.
