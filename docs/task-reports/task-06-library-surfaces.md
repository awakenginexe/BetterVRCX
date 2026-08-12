# Task 6: Favorites, My Avatars, and Gallery workspaces

## Exact scope

- Initial Task 6 commit: `0846db75`; fix-round base: `435b0cd8`; visual/test fix: `8fe8a582`.
- Reworked only the existing Favorites rails, content panes, toolbar, selection controls, move destination menu, My Avatars workspace, and Gallery media surfaces. The implementation uses the existing components, stores, coordinators, localization, and virtualization paths.
- Replaced marker assertions with behavior-level coverage for Favorites destination filtering/capacity/action flow, My Avatars persisted grid/table controls, and Gallery tab selection/upload-refresh routing.
- Kept the pre-existing untracked redesign/planning files under `docs/` untouched and excluded from commits.

## RED

```powershell
npx vitest run src/views/Favorites/components/__tests__/FavoritesContentHeader.test.js src/views/Favorites/components/__tests__/FavoritesMoveDropdown.test.js src/views/Favorites/components/__tests__/InvalidAvatarsProgressToast.test.js src/views/MyAvatars/__tests__/MyAvatars.test.js src/views/Tools/__tests__/Gallery.test.js
```

Output: exit 1; 4 files failed, with 5 failed and 3 passed tests. The failures covered the missing semantic workspace controls, unfiltered remote move target, unavailable destination state, persisted avatar view control, and Gallery action routing. The remote move failure exposed and fixed the invalid `v-for`/`v-if` component usage that let the current remote group through.

## GREEN and fix-round verification

```powershell
npx vitest run src/views/Favorites/components/__tests__/FavoritesContentHeader.test.js src/views/Favorites/components/__tests__/FavoritesMoveDropdown.test.js src/views/Favorites/components/__tests__/InvalidAvatarsProgressToast.test.js src/views/MyAvatars/__tests__/MyAvatars.test.js src/views/Tools/__tests__/Gallery.test.js
```

Output: exit 0; 5 files and 8 tests passed.

```powershell
npx vitest run src/views/Favorites/components/__tests__ src/views/Favorites/composables/__tests__ src/views/MyAvatars/__tests__ src/views/MyAvatars/composables/__tests__ src/views/Tools/__tests__/Gallery.test.js
```

Output: exit 1; 13 files / 68 tests passed, while the untouched Friend and World item suites contributed 21 baseline setup failures. Their stale test mocks omit `lucide-vue-next` `ExternalLink` and stores `useLocationStore`; the failures occur before a Task 6 behavior assertion.

```powershell
npm run prod
```

Output: exit 0; Vite production build succeeded and generated a third-party license manifest with 105 entries (1 requiring review).

```powershell
npx oxfmt <13 changed source/test files>
npx oxfmt --check <13 changed source/test files>
git diff --check
```

Output: formatter applied successfully to all 13 changed source/test files; the subsequent check passed. `git diff --check` passed before the scoped code/test commit and is rerun after this report update.

## Preserved contracts

- Favorites remains a remote/local two-pane surface: labels, visibility, counts, capacities, ordering, search, sort, splitter, density, selection/edit mode, copy/move, bulk unfavorite, import/export, cache semantics, coordinator calls, and virtualization remain in their existing paths.
- My Avatars retains configuration-backed grid/table state, filters, current-avatar state, editor/context actions, uploads, crop dialog, tags, and privacy behavior.
- Gallery retains its six tabs, upload/crop/delete/fullscreen flows, VRC+ media, inventory/redeem/consume actions, and destructive confirmations.

## Remaining baseline concern

- The broader relevant suite is not clean because the pre-existing Friend and World item test doubles no longer match their child/store dependencies. This fix round did not alter those tests or application behaviors; the targeted Task 6 suite and production build pass.

## Fix round 2: route-specific toolbar labels

- Base commit: `aaa7f79d`; scoped accessibility fix: `6518c5d9` (`fix: localize favorites toolbar labels`).
- `FavoritesToolbar` now declares an explicit `ariaLabel` prop, uses it for the toolbar role, and falls back to the existing localized world-search label for existing callers. Friends, Worlds, and Avatars each pass their existing route-appropriate localized search label; search placeholders and behavior remain unchanged.

```powershell
npx vitest run src/views/Favorites/components/__tests__/FavoritesToolbar.test.js
```

RED output: exit 1; the new explicit-prop assertion received `undefined`, proving that the label previously reached the DOM only through undeclared-attribute fallthrough. GREEN output: exit 0; 1 file / 2 tests passed, covering explicit route-label propagation and localized fallback.

```powershell
npx vitest run src/views/Favorites/components/__tests__/FavoritesToolbar.test.js src/views/Favorites/components/__tests__/FavoritesContentHeader.test.js src/views/Favorites/components/__tests__/FavoritesMoveDropdown.test.js src/views/Favorites/components/__tests__/InvalidAvatarsProgressToast.test.js src/views/MyAvatars/__tests__/MyAvatars.test.js src/views/Tools/__tests__/Gallery.test.js
npx oxfmt --check <5 changed source/test files>
git diff --check
npm run prod
```

Output: Task 6 focused suite exit 0 (6 files / 10 tests); oxfmt check passed for all 5 changed source/test files; `git diff --check` passed; production build exit 0 and regenerated the 105-entry third-party license manifest (1 requiring review).
