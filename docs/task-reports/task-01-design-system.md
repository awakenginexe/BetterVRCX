# Task 1: BetterVRCX design system primitives

## Files changed

- Created `src/styles/bettervrcx.css` with the approved `--bv-*` tokens, legacy theme aliases, surface/state primitives, focus-visible treatment, reduced-motion handling, and semantic status mappings.
- Modified `src/styles/globals.css` to import `bettervrcx.css` from the existing global style entrypoint.
- Created `src/shared/constants/bettervrcxDesign.js` exporting `BETTERVRCX_DESIGN_TOKENS` for runtime inspection.
- Created `src/shared/constants/__tests__/bettervrcxDesign.test.js` for the approved token names and values.
- Created `src/styles/__tests__/bettervrcxStyles.test.js` for token, primitive, accessibility, motion, alias, and import contracts.
- Created this report.

## RED verification

Command:

```text
npx vitest run src/shared/constants/__tests__/bettervrcxDesign.test.js
```

Result: exit code 1. Vitest failed to resolve `../bettervrcxDesign` because the production module did not exist yet.

Command:

```text
npx vitest run src/styles/__tests__/bettervrcxStyles.test.js
```

Result: exit code 1. All 3 tests failed with `ENOENT` because `src/styles/bettervrcx.css` did not exist yet.

## GREEN verification

Command:

```text
npx vitest run src/shared/constants/__tests__/bettervrcxDesign.test.js
```

Output summary: exit code 0; 1 test file passed; 1 test passed.

Command:

```text
npx vitest run src/styles/__tests__/bettervrcxStyles.test.js
```

Output summary: exit code 0; 1 test file passed; 4 tests passed.

Command:

```text
npx oxfmt --check src/shared/constants/bettervrcxDesign.js src/shared/constants/__tests__/bettervrcxDesign.test.js src/styles/__tests__/bettervrcxStyles.test.js src/styles/bettervrcx.css
```

Output summary: exit code 0; all matched files use the correct format. The pre-existing `src/styles/globals.css` was intentionally not bulk-formatted; it contains only the required one-line import change.

## Production build

Command:

```text
npm run prod
```

Result: exit code 0. Vite transformed 4,385 modules, completed the production build in 8.13s, and the license step generated a 105-entry manifest with 2 entries requiring review.

## Protected-contract checks

- `git diff --name-only -- src-electron src/coordinators src/stores src/ipc-electron src/vr src/plugins/router.js src/shared/constants/ui.js` returned `No protected contract files changed.`
- Legacy global markers were all present after the change: `:root`, `.dark`, `@theme inline`, `.x-container`, `.x-highlight-ring`, `.x-hover-card`, `.x-hover-list`, and `.x-hover-icon`.
- `git diff --check` completed with exit code 0; Git emitted only the existing LF/CRLF normalization warning for `src/styles/globals.css`.
- The frozen reference checkout remained at commit `a31da174c0e6130dcf428bdf0ffc6f47d22fabc2` with a clean status. No remote writes were performed.

## Concerns

- `npm test -- --reporter=dot` remains red outside this task scope: 35 failed suites, 159 passed suites; 143 failed tests, 1,966 passed tests, and 3 unhandled errors. Reported failures include an existing missing `groupOrderUtils` module, incomplete test mocks, and unrelated component assertions. The focused design-system suites and production build pass.
- The formatter check for the complete repository would also inspect the existing `globals.css`; only the newly created files were formatted to avoid unrelated churn.

## Accessibility fix: non-color status primitives

### Files changed

- Modified `src/styles/bettervrcx.css` so offline is an outlined circle, online is a filled circle, join-me/info is a diamond, ask-me/warning is striped, and busy/danger is a rounded diamond. The stylesheet also documents the requirement for visible status text or an `aria-label`.
- Modified `src/styles/__tests__/bettervrcxStyles.test.js` with regression coverage for the status label/shape contract and for stylesheet values synchronized with `BETTERVRCX_DESIGN_TOKENS`. The value check canonicalizes equivalent CSS decimal notation emitted by the formatter.
- Modified this report.

### RED verification

Command:

```text
npx vitest run src/styles/__tests__/bettervrcxStyles.test.js
```

Result: exit code 1. The new contract test failed because `bettervrcx.css` contained no `aria-label` usage guidance and status variants changed only `--bv-status-color`. The new token-value contract also surfaced the formatter-normalized equivalent `rgba(..., 0.58)` value, which prompted canonical CSS-value comparison rather than a whitespace/serialization-sensitive assertion.

### GREEN verification

Command:

```text
npx oxfmt --check src/styles/bettervrcx.css src/styles/__tests__/bettervrcxStyles.test.js
```

Output summary: exit code 0; all matched files use the correct format.

Command:

```text
npx vitest run src/styles/__tests__/bettervrcxStyles.test.js src/shared/constants/__tests__/bettervrcxDesign.test.js
```

Output summary: exit code 0; 2 test files passed; 7 tests passed.

### Production build

Command:

```text
npm run prod
```

Result: exit code 0. Vite transformed 4,385 modules, completed the production build in 7.75s, and the license step generated a 105-entry manifest with 2 entries requiring review.

### Commit

`ac01aa0ef62ced81f57d974b973ef3e6bbf278a0` — `fix: make status primitives non-color accessible`

## Review finding fix: online status variant cue

### Files changed

- Modified `src/styles/__tests__/bettervrcxStyles.test.js` to extract the combined online/success rule body and assert its variant-specific `background-color` and `box-shadow` declarations. The existing join-me rotation, ask-me pattern, busy shape, and label guidance checks remain unchanged.
- Modified this report.
- Production CSS was not changed.

### RED verification

Command:

```text
npx vitest run src/styles/__tests__/bettervrcxStyles.test.js
```

Result: exit code 1. The focused stylesheet suite reported 1 failed test and 5 passed tests. The deliberately narrow online selector assertion failed because the current stylesheet combines the online and success selectors in one rule.

### GREEN verification

Command:

```text
npx vitest run src/styles/__tests__/bettervrcxStyles.test.js src/shared/constants/__tests__/bettervrcxDesign.test.js
```

Result: exit code 0; 2 test files passed; 7 tests passed.

### Production build

Command:

```text
npm run prod
```

Result: exit code 0. Vite transformed 4,385 modules, completed the production build in 12.65s, and the license step generated a 105-entry manifest with 2 entries requiring review.
