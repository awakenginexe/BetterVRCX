# Task 9: Native Surfaces and Branding

## Scope

- Baseline: `684371ee` (`docs: complete Task 8 verification`)
- Implementation commit: `3cbaa625` (`feat: finalize native surfaces and BetterVRCX branding`)
- Coverage rows: `BVX-006`, `BVX-035`, `BVX-036`, `BVX-037`, `BVX-038`
- Worktree: `C:\Users\ANXE\Desktop\Coding\BetterVRCX\BetterVRCX-codex-vrcnext-redesign`

## Delivered

- Added a responsive BetterVRCX login frame that retains the existing form, saved-account actions, redirect guard, server-status alert, updater action, language controls, and legal links.
- Imported the existing logo through Vite's asset pipeline; Electron package asset paths remain unchanged.
- Added structural VR frame hooks and containment while preserving the separate `vr.html` entry, exact wrist/HMD dimensions, and all `AppApiVr` update queue logic.
- Updated only public package description/homepage and README identity copy. Package name, Electron `appId`, product name, protocol, user-data locations, updater behavior, and IPC/preload methods were not changed.

## Tests And Checks

- Expected pre-implementation failure: `npx vitest run src/views/Login/__tests__/nativeBrandingContracts.test.js` failed because the BetterVRCX login frame and VR frame hook did not exist.
- Passing focused verification: `npx vitest run src/views/Login/__tests__/nativeBrandingContracts.test.js src/views/Login/__tests__/Login.test.js` (`2` files, `11` tests).
- Formatter: `npx oxfmt --check src/views/Login/Login.vue src/views/Login/__tests__/nativeBrandingContracts.test.js src/vr/Vr.vue src/vr/vr.css`.
- Whitespace validation: `git diff --check`.
- Production build: `npm run prod` passed. It emitted `build/html/vr.html` and generated the third-party license manifest with `105` entries (`1` requiring review).

## Protected Contract Audit

- `package.json`: `name` remains `VRCX`; `build.appId` remains `app.vrcx`; `productName` remains `VRCX`.
- `src-electron/main.js`, `src-electron/preload.js`, `src/plugins/interopApi.js`, `src/vr.html`, and `src/vr/vr.js` have no Task 9 diff.
- The focused source test asserts protocol `vrcx`, `app:updateVr`, `app:getOverlayWindow`, the separate VR entry, and the `AppApiVr.GetExecuteVrOverlayFunctionQueue()` polling contract.

## Manual Review

- Requirement coverage: PASS. All Task 9 surfaces were implemented or contract-audited; no Task 10 work was started.
- Feature preservation: PASS. Login handlers and redirect logic are unchanged; native and queue code are unchanged.
- Vue/component quality: PASS. Presentation remains local to the existing components with no duplicated auth/native business logic.
- Accessibility: PASS. The login page now has a labelled `section` and `h1`; the logo is decorative; existing localized form labels and status semantics remain.
- Design-system consistency: PASS. The login frame consumes BetterVRCX tokens and uses the existing logo asset.
- Upstream compatibility: PASS. No VRCNext source, DOM topology, CSS classes, storage keys, host bridge, or request logic was copied.

## Remote Policy

No remote writes were performed. This task uses local commits only.
