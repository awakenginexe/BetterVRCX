# Task 04A — Feed and Friends Locations

## Scope delivered

- Reframed Feed as a table-first BetterVRCX activity surface with a semantic page header, live record/filter context, a subordinate filter cluster, and a bordered table panel.
- Reframed Friends Locations with a semantic page header, live segment/count context, a raised segment/search/settings toolbar, a contained virtualized card surface, intentional instance/group headers, and a BetterVRCX empty state.
- Refined Friends Locations cards into token-backed raised panels with location-first hierarchy, visible localized status text paired with semantic status markers, reduced-motion styling, focus treatment, and keyboard entity activation.
- Made Feed fallback row keys deterministic so table pagination/expansion state is not invalidated by a timestamp when a row has no primary ID.

## Changed files

- `src/views/Feed/Feed.vue`
- `src/views/Feed/__tests__/Feed.test.js`
- `src/views/FriendsLocations/FriendsLocations.vue`
- `src/views/FriendsLocations/__tests__/FriendsLocations.test.js`
- `src/views/FriendsLocations/components/FriendsLocationsCard.vue`
- `src/views/FriendsLocations/components/__tests__/FriendsLocationsCard.test.js`
- `docs/task-reports/task-04a-feed-locations.md`

No routes, stores, APIs, IPC/native code, dependencies, localization files, shared global CSS, or feed column behavior were changed.

## TDD evidence

### RED

Command:

```text
npx vitest run src/views/Feed/__tests__/Feed.test.js src/views/FriendsLocations/__tests__/FriendsLocations.test.js src/views/FriendsLocations/components/__tests__/FriendsLocationsCard.test.js
```

The new tests failed against the baseline because the Feed page header/filter/table surfaces, Friends Locations page header/count/segment/surface markers, BetterVRCX empty state, keyboard card activation, and visible semantic card status were absent. The first run also exposed baseline test drift described below. After repairing only the stale card test harness, the card RED run retained the expected redesign failures while 23 existing card tests passed.

### GREEN

Command:

```text
npx vitest run src/views/Feed/__tests__/Feed.test.js src/views/FriendsLocations/__tests__/FriendsLocations.test.js src/views/FriendsLocations/components/__tests__/FriendsLocationsCard.test.js
```

Result: 3 test files passed; 42 tests passed; 0 failed.

## Preserved contracts

- Feed keeps the same `feedTable` state, date range conversion, clear/confirm lookup calls, VIP and type-filter lookup calls, search events, `useVrcxVueTable` configuration, pagination update, total-item cap, columns, expansion behavior, sorting/filtering state, and row click-through/lookup behavior.
- Friends Locations keeps the same segment values, search filtering, configuration keys, scale/spacing persistence, same-instance merge/separate behavior, favorite grouping/collapse state, virtual row construction, resize measurement coalescing, and virtualizer configuration.
- Friends Locations cards keep the same `UserContextMenu`, location link/context menu, invite/request/boop/self-invite actions, and `showUserDialog(friend.id)` activation target. Enter and Space now invoke that same existing activation path.
- Existing BetterVRCX `bv-*` tokens and primitives are reused. All new layout styling is scoped to Feed or Friends Locations.

## Verification

- Focused GREEN tests: passed, 42/42.
- `npm run prod`: passed; Vite transformed 4,389 modules and the license manifest generated 105 entries.
- `npx oxfmt --check` on all seven changed files: passed.
- `git diff --check`: passed.

## Baseline concerns

- Feed's pre-existing fallback row-ID test failed because production appended `Date.now()` despite the test and table-state contract requiring a stable key. The scoped implementation removed the timestamp and the existing test now passes.
- The Friends Locations card suite had stale test infrastructure: its complete `lucide-vue-next` mock omitted icons now used by `UserContextMenu`, the separator assertion did not account for the persistent View Details separator, and two status fixtures no longer matched the production status-class shape. The focused test file was synchronized without changing context-menu behavior.
- `npm run prod` reports 2 of 105 generated third-party license entries as requiring review. This is a non-failing repository baseline concern outside Task 4A.
- The worktree already contained untracked redesign/specification documents and `docs/implementation-plans/`. They were read where requested but otherwise left untouched and are excluded from the Task 4A commit.

## Final checks

- Formatter, focused tests, production build, and whitespace verification passed before the scoped local commit.
