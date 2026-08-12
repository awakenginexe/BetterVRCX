# Task 4B: Player List and Multi-Entity Search

## Baseline and scope

- Base commit: `52fb87cf` (`feat: redesign feed and friend locations`).
- Surfaces: Player List, Photon events, Chatbox blacklist semantics, Search, and Search pagination.
- No Feed, Friends Locations, store, route, API, worker, native/IPC, VR, dependency, global CSS, or remote changes were made.

## Changed files

- `src/views/PlayerList/PlayerList.vue`
- `src/views/PlayerList/components/PhotonEventTable.vue`
- `src/views/PlayerList/dialogs/ChatboxBlacklistDialog.vue`
- `src/views/PlayerList/__tests__/PlayerList.test.js`
- `src/views/PlayerList/dialogs/__tests__/ChatboxBlacklistDialog.test.js`
- `src/views/Search/Search.vue`
- `src/views/Search/components/SearchPagination.vue`
- `src/views/Search/__tests__/Search.test.js`
- `src/views/Search/components/__tests__/SearchPagination.test.js`
- `docs/task-reports/task-04b-player-search.md`

## TDD evidence

### RED

Command:

```text
npx vitest run src/views/PlayerList/__tests__/PlayerList.test.js src/views/PlayerList/dialogs/__tests__/ChatboxBlacklistDialog.test.js src/views/Search/__tests__/Search.test.js src/views/Search/components/__tests__/SearchPagination.test.js
```

Result before production edits: 4 test files failed; 7 new expectations failed and 10 existing tests passed. Failures identified the absent Player List/Search route hierarchy, semantic surfaces, explicit empty-state hooks, keyboard result activation, blacklist destructive-action hooks, and labeled pagination landmark.

### GREEN

The same command passed after the scoped implementation: 4 test files passed, 17 tests passed.

## Final focused verification

Command:

```text
npx vitest run src/views/PlayerList/__tests__/PlayerList.test.js src/views/PlayerList/__tests__/columns.test.js src/views/PlayerList/dialogs/__tests__/ChatboxBlacklistDialog.test.js src/views/Search/__tests__/Search.test.js src/views/Search/components/__tests__/SearchPagination.test.js src/views/Search/composables/__tests__/useSearchUser.test.js src/views/Search/composables/__tests__/useSearchWorld.test.js src/views/Search/composables/__tests__/useSearchAvatar.test.js src/views/Search/composables/__tests__/useSearchGroup.test.js
```

Result: 9 test files passed, 30 tests passed.

- `npx oxfmt --check` on all nine changed source/test files: passed.
- `git diff --check`: passed.
- `npm run prod`: passed; Vite transformed 4,394 modules and generated the 105-entry license manifest (2 existing review flags).

## Preserved behavior and contracts

- Player List retains current-instance world identity, author and entity click-through, image-error fallback, fullscreen preview, platform/release/cache badges, location and player/friend summaries, capacity and date metadata, table row activation, mount/activation refresh, and Photon-column visibility gating.
- Photon diagnostics retain current and previous event datasets, tab persistence, type/text filters, independent pagination sizes, user/avatar/group/world/image activation, current Photon lookup behavior, prior-user lookup behavior, and the IPC status gate. The status is now represented by text plus a semantic marker rather than color alone.
- Chatbox blacklist retains keyword add/edit/delete persistence and user blacklist delete, save, and instance-list refresh. Destructive controls now have `bv-danger-zone`, focus, and accessible delete hooks.
- Search retains user/world/avatar/group tabs, all four remote composables and request shapes, avatar provider selection/dialog, user and world filters, loading and empty branches, pagination boundaries, Alt+Left/Alt+Right paging, shared search text/history state, clear behavior, avatar minimum-length warning, and entity dialog activation.
- Existing mouse activation remains intact; result rows/cards add keyboard activation and focus treatment. Search pagination keeps the existing emitted `prev`/`next` contract while adding a labeled navigation landmark.
- All layout, responsive, hover, focus, and reduced-motion changes are scoped to the Player List/Search components and use existing `bv-*` tokens/primitives.

## Baseline concerns

- The initial focused baseline had 18 passing tests and 5 Search view fixture failures because its store mock omitted `useUserStore` and `displayVRCPlusIconsAsAvatar`, which the existing `useUserDisplay` composable requires. The focused fixture was completed before the Task 4B RED cycle; no production behavior was changed for that repair.
- Pre-existing untracked redesign/planning documents under `docs/` were left untouched and excluded from this task's commit.
