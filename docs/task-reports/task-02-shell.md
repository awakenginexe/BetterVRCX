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
