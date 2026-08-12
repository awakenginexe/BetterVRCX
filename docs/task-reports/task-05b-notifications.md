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
