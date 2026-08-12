# Task 6: Favorites, My Avatars, and Gallery workspaces

## Exact scope

- Redesigned only the Favorites toolbar, group/content headers, move destination state, Friends/Worlds/Avatars workspace shells, My Avatars workspace header, and Gallery media workspace header/tabs.
- Added focused coverage for edit selection state, local-origin/full-destination state, invalid-avatar progress announcements, persisted avatar view state, and Gallery tab/upload routing.
- Kept all remote/local group data, capacities, visibility, counts, ordering, search, sort, splitter, density, selection, copy/move, bulk unfavorite, import/export, cache, virtualization, avatar editor/upload/crop/tags/privacy/context-menu, and Gallery store/API flows intact.
- Left the pre-existing untracked redesign/planning files under `docs/` untouched and excluded from the commit.

## RED

Command:

```powershell
npx vitest run src/views/Favorites/components/__tests__/FavoritesContentHeader.test.js src/views/Favorites/components/__tests__/FavoritesMoveDropdown.test.js src/views/Favorites/components/__tests__/InvalidAvatarsProgressToast.test.js src/views/MyAvatars/__tests__/MyAvatars.test.js src/views/Tools/__tests__/Gallery.test.js
```

Output: exit 1; the new selection, local/remote capacity, invalid-progress, avatar-workspace, and Gallery aria-label expectations all failed as expected. The pre-existing My Avatars test double also lacked `database.getAllAvatarTimeSpent`; its test harness was corrected before GREEN.

## GREEN and verification

```powershell
npx vitest run src/views/Favorites/components/__tests__/FavoritesContentHeader.test.js src/views/Favorites/components/__tests__/FavoritesMoveDropdown.test.js src/views/Favorites/components/__tests__/InvalidAvatarsProgressToast.test.js src/views/MyAvatars/__tests__/MyAvatars.test.js src/views/Tools/__tests__/Gallery.test.js
```

Output: exit 0; 5 files passed, 7 tests passed.

```powershell
npm run prod
```

Output: exit 0; Vite production build succeeded and generated a third-party license manifest with 105 entries (1 requiring review).

```powershell
npx oxfmt --check <every changed source/test file>
git diff --check
```

Output: oxfmt reported formatting drift in all 14 checked changed source/test files. `git diff --check` is run in final review.

## Preserved contracts

- Favorites remains a remote/local two-pane surface: labels, counts, capacities, visibility, menus, ordering, coordinator calls, import/export, and list virtualization are unchanged.
- My Avatars retains its configuration-backed grid/table switch, filters, virtual grid, current-avatar affordance, editor/context actions, tags, privacy, uploads, and crop dialog.
- Gallery retains its six tabs, store actions, upload/crop flows, fullscreen behavior, VRC+ media, inventory/redeem/consume operations, and existing destructive-operation paths.

## Baseline concerns

- The broader existing Favorites component/composable/My Avatars focused run ended with 67 passing and 21 failing tests. The two failing item suites fail during test setup because their stale mocks omit `lucide-vue-next` `ExternalLink` and stores `useLocationStore`; no Task 6 code path is reached.
- Formatting check is non-clean for the pre-existing large route files. Mass reformatting was intentionally avoided to keep the implementation reviewable and scoped.
