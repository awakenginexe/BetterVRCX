# Task 4A: Feed and Friends Locations

## Baseline and scope

- Base commit: `5e771146` (`fix: name fullscreen preview dialog`)
- Surfaces: Feed, Friends Locations, and the Friends Locations card.
- No routes, store IDs, remote APIs, table/virtualizer contracts, IPC/native/VR contracts, dependencies, or app identity changed.

## Changed files

- `src/views/Feed/Feed.vue`
- `src/views/Feed/__tests__/Feed.test.js`
- `src/views/FriendsLocations/FriendsLocations.vue`
- `src/views/FriendsLocations/__tests__/FriendsLocations.test.js`
- `src/views/FriendsLocations/components/FriendsLocationsCard.vue`
- `src/views/FriendsLocations/components/__tests__/FriendsLocationsCard.test.js`

## TDD evidence

The focused additions cover the new semantic page/header/filter/table surfaces, live record/filter context, empty-state hook, keyboard-activatable location cards, and visible status labels paired with non-color status markers. These contracts were absent from the baseline markup; the implementation then added the route hierarchy and scoped styles while retaining the existing data/state handlers.

Focused command after implementation:

```text
npx vitest run src/views/Feed/__tests__/Feed.test.js src/views/FriendsLocations/__tests__/FriendsLocations.test.js src/views/FriendsLocations/components/__tests__/FriendsLocationsCard.test.js
```

Result: 3 test files passed, 42 tests passed.

## Verification

- `npx oxfmt --check` on all six changed source/test files: passed.
- `git diff --check`: passed.
- `npm run prod`: passed; Vite transformed 4,389 modules and generated the 105-entry license manifest.

## Preserved behavior

- Feed date range confirmation/clearing, type and favorite filters, search, pagination, table sorting/filtering, row identifiers, and lookup/click-through remain in the existing store/table flow.
- Friends Locations segment tabs, search, settings popover, scale/spacing controls, same-instance mode, grouping/collapse, virtualizer measurement, status handling, context menu, and user-dialog activation remain intact.
- Friend cards retain the existing location/context menu surface while gaining keyboard activation and a readable status badge; status markers are paired with text rather than color alone.
- The record/header/filter surfaces are presentation changes only, with responsive wrapping and reduced-motion treatment scoped to the existing route components.

## Baseline concerns

Repository-wide lint, typecheck, format-check, and full test failures remain the pre-existing baseline recorded in `docs/BASELINE_VERIFICATION.md`; this task was verified with focused tests, changed-file formatting, diff checks, and the production build.
