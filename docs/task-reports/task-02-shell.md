# Task 02: Desktop shell, navigation, sidebar, and status frame

## Changed files

- `src/App.vue`
- `src/views/Layout/MainLayout.vue`
- `src/components/MacOSTitleBar.vue`
- `src/components/nav-menu/NavMenu.vue`
- `src/components/nav-menu/NavMenuFolderItem.vue`
- `src/components/nav-menu/NavMenuFooter.vue`
- `src/views/Sidebar/Sidebar.vue`
- `src/components/StatusBar.vue` (the brief names `src/views/Layout/StatusBar.vue`, which does not exist; `MainLayout` imports this component.)
- `src/components/nav-menu/__tests__/NavMenu.test.js`
- `src/views/Layout/__tests__/MainLayout.test.js`

## TDD evidence

### RED

Command:

```powershell
npx vitest run src/components/nav-menu/__tests__/NavMenu.test.js src/views/Layout/__tests__/MainLayout.test.js
```

Observed output after adding the tests: 2 passed and 2 failed. The collapsed-navigation test failed because `[data-nav-key="feed"]` did not exist, proving the compact item/active-state contract was absent. The initial dialog-mount expectation used 12 while the established shell mounts 13; the fixture was corrected to its observed existing contract before production changes.

### GREEN

Command:

```powershell
npx vitest run src/components/nav-menu/__tests__/NavMenu.test.js src/views/Layout/__tests__/MainLayout.test.js
```

Output: 2 test files passed, 5 tests passed, exit code 0.

## Verification

- `npx oxfmt --check` on the 10 changed source/test files: passed after formatting.
- `git diff --check`: passed.
- `npm run prod`: passed. Vite built 4,389 modules and `build:licenses` generated a manifest with 105 entries.
- Route check: the collapsed active feed item still invokes `router.push({ name: 'feed' })`; the focused test covers this behavior.
- Persistence check: `useNavLayout`, `VRCX_customNavMenuLayoutList`, nav keys, dashboard/tool insertion, and `setNavCollapsed`/`setNavWidth` were not changed. `MainLayout` retains the existing pointer resize handler, right rail layout callback, and `RouterView`/`KeepAlive` contract.
- Dialog check: focused render test confirms all 13 established global dialog mounts remain outside the resizable shell.
- Drag-boundary check: macOS retains the 28px `.macos-title-bar.draggable` with `-webkit-app-region: drag` and its traffic-light spacer. The non-mac 42px taskbar contains only static product text and is draggable; no existing interactive Electron control was moved into a drag region.

## Scope and concerns

- The left collapsed rail is now 60px. The right rail keeps its existing persisted resizable layout rather than resetting a user's saved width; it has a 60px collapsed minimum and the 260px desktop size remains a layout target.
- The project `format:check` script only accepts repository-wide paths, so it cannot be scoped to changed files. I used its underlying `oxfmt` binary only on the changed files.
- An additional adjacent test run found two pre-existing test-harness failures not caused by this task: `NavMenuFooter.test.js` expects a `toggle-theme` event from a button with no such production handler, and `Sidebar.test.js` omits `useNotificationsSettingsStore` from its mock. They were not changed.
- Pre-existing untracked redesign documentation and `docs/implementation-plans/` were left untouched.

## Review fix: shell geometry and accessibility contracts

Reviewed Task 2 commit: `3515a3a82735a2da0d147564288dfa5247dd7476`

Fix commit: this report ships in `fix: align shell geometry and accessibility contracts`; its SHA is reported in the final task handoff because a Git commit cannot embed its own object ID in tracked content.

### RED evidence

Command:

```powershell
npx vitest run src/views/Layout/__tests__/MainLayout.test.js src/composables/__tests__/useMainLayoutResizable.test.js src/stores/settings/__tests__/appearance.test.js src/views/Sidebar/__tests__/Sidebar.test.js src/components/nav-menu/__tests__/NavMenuFolderItem.test.js src/components/nav-menu/__tests__/NavMenuFooter.test.js
```

Result: exit code 1; 3 test files failed and 3 passed, with 10 passing and 3 failing tests. The new geometry assertions failed because the attempted patch exposed a 160px expanded minimum instead of 260px and kept a conflicting center-panel default (`70` in the render fixture; `75%` in production) instead of allowing the center to consume the remainder. The run also reproduced the previously documented stale `toggle-theme` footer assertion, which is outside this fix's production contract.

### GREEN evidence

Commands:

```powershell
npx vitest run src/views/Layout/__tests__/MainLayout.test.js src/composables/__tests__/useMainLayoutResizable.test.js src/stores/settings/__tests__/appearance.test.js src/views/Sidebar/__tests__/Sidebar.test.js src/components/nav-menu/__tests__/NavMenu.test.js src/components/nav-menu/__tests__/NavMenuFolderItem.test.js
npx vitest run src/components/nav-menu/__tests__/NavMenuFooter.test.js -t "labels the pending update marker"
```

Results: the shell suite passed 6 files and 14 tests; the focused footer accessibility run passed 1 test with the unrelated stale test skipped.

### Geometry and persistence evidence

- New left-navigation state and the `VRCX_navPanelWidth` load fallback are 220px. The persisted key is unchanged, and the store test injects an existing 312px value and confirms it survives initialization.
- The right rail now uses native pixel constraints: 260px default/minimum, 700px maximum, and 60px collapsed size. The center panel has no competing percentage default, so the splitter does not normalize away the 260px target.
- `sizeUnit="px"` is forwarded by the local `ResizablePanel` wrapper. The existing `vrcx-main-layout-right-sidebar` auto-save ID, resize handle, layout callback, panel ref, and route-driven `expand()`/`collapse()` watcher remain in place.
- Compact mode is derived from the route/store visibility state and splitter layout. It keeps a coherent 60px action rail while unmounting the Friends/Groups tab content; expanded mode retains the existing resizable sidebar.

### Dialog and accessibility evidence

- The `MainLayout` render test names all 16 production-mounted global dialog IDs, including GlobalToolsDialogs, WhatsNewDialog, and SpotlightDialog, and checks every mount is outside `[data-shell-region="content"]`.
- Folder, child-entry, and updater notification markers use `.bv-status-dot[data-status="danger"]` instead of `bg-red-500`. Rendered markers expose `role="img"` plus localized `aria-label` text while preserving the existing notification conditions and unread actions.

### Final verification

- `npx oxfmt --check` on the 13 changed source/test files: passed.
- `git diff --check`: passed.
- `npm run prod`: passed; Vite transformed 4,389 modules and the license task generated 105 entries (2 marked for review by the existing generator).
- No packages were installed, no remote state was changed, no co-author was added, and unrelated untracked redesign documentation was left untouched.

### Remaining concern

- The pre-existing `NavMenuFooter.test.js` assertion expecting `toggle-theme` from the settings button still fails when the entire file is run. The production component has no such click handler; this review fix validates the requested updater status marker with a focused test and does not alter unrelated footer behavior.

## Review fix: top-level navigation notification status

### RED evidence

Command:

```powershell
npx vitest run src/components/nav-menu/__tests__/NavMenu.test.js -t "notified direct item"
```

Result: exit code 1. The new notified-direct-item assertion could not find `.bv-status-dot[data-status="danger"]`; the rendered item still used the legacy color-only marker.

### GREEN evidence

Command:

```powershell
npx vitest run src/components/nav-menu/__tests__/NavMenu.test.js src/components/nav-menu/__tests__/NavMenuFolderItem.test.js src/components/nav-menu/__tests__/NavMenuFooter.test.js -t "danger|notified direct item|active route icon" src/views/Layout/__tests__/MainLayout.test.js src/composables/__tests__/useMainLayoutResizable.test.js src/stores/settings/__tests__/appearance.test.js src/views/Sidebar/__tests__/Sidebar.test.js
```

Result: exit code 0; 3 test files passed and 4 tests passed. The direct item now uses `.bv-status-dot[data-status="danger"]` with `role="img"`, an accessible label, and the collapsed `-right-1!` position while retaining its existing notification predicate and click behavior.

### Verification

- `npx oxfmt --check src/components/nav-menu/NavMenu.vue src/components/nav-menu/__tests__/NavMenu.test.js`: passed.
- `git diff --check`: passed.
- The complete adjacent shell/nav run passed 6 files and 16 tests; the documented unrelated `NavMenuFooter.test.js` `toggle-theme` assertion remains the only failure.
- Commit SHA: reported in the final handoff because a Git commit cannot embed its own object ID in tracked content.
