# Task 3B: Quick Search and Fullscreen Preview

## Baseline and scope

- Base commit: `c81e656400a01f77ff97269ab75e4d78052b1637` (`fix: group entity dialog danger actions`)
- Scoped surfaces: quick search command dialog and fullscreen image preview.
- No routes, store IDs, worker protocol, remote APIs, IPC/native/VR contracts, dependencies, or app identity changed.

## Changed files

- `src/components/QuickSearchDialog.vue`
- `src/components/FullscreenImagePreview.vue`
- `src/components/__tests__/QuickSearchDialog.test.js`
- `src/components/__tests__/FullscreenImagePreview.test.js`

## TDD evidence

The focused test additions assert contracts that were absent from the baseline markup: semantic surface markers, the quick-search header/input/empty-state structure, grouped result delegation, fullscreen toolbar/stage semantics, accessible image labeling, and click-away close. The baseline components did not expose those selectors/attributes; the implementation then added the smallest presentation-only hooks and styles needed to satisfy them.

Focused command after implementation:

```text
npx vitest run src/components/__tests__/QuickSearchDialog.test.js src/components/__tests__/FullscreenImagePreview.test.js
```

Result: 2 test files passed, 6 tests passed.

## Verification

- `npx oxfmt --check src/components/QuickSearchDialog.vue src/components/FullscreenImagePreview.vue src/components/__tests__/QuickSearchDialog.test.js src/components/__tests__/FullscreenImagePreview.test.js`: passed.
- `git diff --check`: passed.
- `npm run prod`: passed; Vite transformed 4,389 modules and generated the 105-entry license manifest.

## Preserved behavior

- Quick search remains opened by the existing Ctrl/Cmd+K Sidebar shortcut and continues using the existing worker/store, locale/confusable matching, grouped result data, and entity coordinator activation.
- Existing Command primitives still own arrow-key navigation and Enter activation.
- Fullscreen preview retains its existing portal layer, click-away close, copy/download actions, zoom/pan/rotate/reset operations, keyboard shortcuts, reset-on-open/image-change logic, and remote image download paths.
- The update adds BetterVRCX semantic styling hooks, an intentional command-surface hierarchy, responsive preview controls, accessible labels, and reduced-motion handling without introducing future VRCNext-only controls.

## Baseline concerns

The repository-wide lint, typecheck, format-check, and full test failures remain the pre-existing baseline recorded in `docs/BASELINE_VERIFICATION.md`; this task was verified with focused tests and the production build.

## Review-fix evidence

- Review-fix base commit: `5f63cd69`.
- Root cause fixed: fullscreen preview now renders the shared `DialogTitle` as a visually hidden real title inside `RekaDialogContent`, using the existing computed `imageAlt`; the toolbar now has the localized `dialog.gallery_select.header` accessible name.
- TDD red: after adding focused assertions for the title text/visibility and toolbar accessible name, `npx vitest run src/components/__tests__/FullscreenImagePreview.test.js` failed with 1 failed and 2 passed because the title was absent.
- TDD green: `npx vitest run src/components/__tests__/QuickSearchDialog.test.js src/components/__tests__/FullscreenImagePreview.test.js` passed with 2 test files and 6 tests.
- `npx oxfmt src/components/FullscreenImagePreview.vue src/components/__tests__/FullscreenImagePreview.test.js`: passed.
- `git diff --check`: passed.
- `npm run prod`: passed; Vite transformed 4,389 modules and generated the 105-entry license manifest.
- Click-away close and all existing image, transform, keyboard, copy, and download behavior remain unchanged.
