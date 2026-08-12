# Task 3A: Entity dialog shells

## Changed files

- `src/components/dialogs/MainDialogContainer.vue`
- `src/components/dialogs/UserDialog/UserDialog.vue`
- `src/components/dialogs/WorldDialog/WorldDialog.vue`
- `src/components/dialogs/AvatarDialog/AvatarDialog.vue`
- `src/components/dialogs/GroupDialog/GroupDialog.vue`
- `src/components/dialogs/__tests__/MainDialogContainer.test.js`
- `src/styles/bettervrcx.css`
- `docs/task-reports/task-03a-entity-dialogs.md`

## TDD evidence

### RED

Command:

```text
npx vitest run src/components/dialogs/__tests__/MainDialogContainer.test.js
```

Result: 1 failed, 1 passed. The new shell contract failed with `Unable to get .bv-dialog-shell`, confirming the marker was absent before production edits. The existing breadcrumb-back behavior test passed.

### GREEN

Command:

```text
npx vitest run src/components/dialogs/__tests__/MainDialogContainer.test.js
```

Result: 2 passed, 0 failed.

## Verification

- `npx oxfmt --check` on all seven changed source/test/style files: passed.
- `git diff --check`: passed.
- `npm run prod`: passed; Vite transformed 4,389 modules and completed the production build plus license generation.

## Preserved behavior checks

- The focused integration test mounts the active User dialog selected through the existing store mock.
- The same test triggers the visible breadcrumb back button and verifies it still calls `handleBreadcrumbClick`.
- Dialog selection, entity coordinator calls, tab keys, inline profile-background style logic, and portal-backed dropdown content remain in their existing components; this change adds class hooks only.

## Concerns

- The pre-existing focused test fixture lacked `useAppearanceSettingsStore`, preventing it from mounting. The fixture now supplies its required false background-display setting so the RED/GREEN result tests the dialog shell rather than failing on an unrelated mock error.
- Pre-existing untracked redesign documents under `docs/` were left untouched and excluded from the commit.
