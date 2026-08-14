# BetterVRCX Implementation Plan: VRChat+ Profile Presentation

**Date:** 2026-08-14  
**Design Spec:** [`docs/superpowers/specs/2026-08-14-vrcplus-profile-presentation-design.md`](file:///C:/Users/ANXE/Desktop/Coding/BetterVRCX/BetterVRCX/docs/superpowers/specs/2026-08-14-vrcplus-profile-presentation-design.md)  
**Status:** Planned / Awaiting Execution Approval  

---

## Proposed Changes Summary

| Component / Layer | Files to Modify / Create | Purpose |
| :--- | :--- | :--- |
| **Common Component** | `[NEW]` `src/components/common/VrcPlusBadge.vue`<br>`[NEW]` `src/components/common/__tests__/VrcPlusBadge.test.js` | Reusable semantic VRC+ supporter badge chip (`sm` and `md` sizes). |
| **Sidebar Friends List** | `[MODIFY]` `src/views/Sidebar/components/FriendItem.vue`<br>`[MODIFY]` `src/views/Sidebar/components/__tests__/FriendItem.test.js` | Render VRC+ badge immediately after display name with `min-w-0` truncation protection. |
| **User Profile Header** | `[MODIFY]` `src/components/dialogs/UserDialog/UserSummaryHeader.vue`<br>`[NEW]` `src/components/dialogs/UserDialog/__tests__/UserSummaryHeader.test.js` | Render VRC+ badge immediately after display name in profile rail. |
| **Backdrop & Styling** | `[MODIFY]` `src/components/dialogs/__tests__/MainDialogContainer.test.js`<br>`[MODIFY]` `src/styles/bettervrcx.css` | Verify profile background resolution, texture fallback, and semantic styling tokens. |

---

## Detailed Task Breakdown

### Task 1: Reusable VRC+ Badge Component (`VrcPlusBadge.vue`)

- **Files:**
  - `src/components/common/VrcPlusBadge.vue` (New)
  - `src/components/common/__tests__/VrcPlusBadge.test.js` (New)
  - `src/styles/bettervrcx.css` (Add `.bv-vrcplus-badge` semantic styling)
- **Failing Test First:**
  - Create `src/components/common/__tests__/VrcPlusBadge.test.js`:
    - Test 1: Renders `VRC+` text and tooltip.
    - Test 2: Renders `size="sm"` variant class (`h-4 text-[10px] px-1`).
    - Test 3: Renders `size="md"` variant class (`h-5 text-xs px-1.5`).
    - Test 4: Renders with accessible semantic attributes.
- **Verification Command (Expect Fail):**
  ```bash
  npx vitest run src/components/common/__tests__/VrcPlusBadge.test.js
  ```
- **Minimal Implementation:**
  - In `src/styles/bettervrcx.css`, define `.bv-vrcplus-badge` with BetterVRCX supporter theme tokens.
  - Implement `VrcPlusBadge.vue` accepting `size` prop (`'sm'` | `'md'`), using `TooltipWrapper` or native title.
- **Verification Command (Expect Pass):**
  ```bash
  npx vitest run src/components/common/__tests__/VrcPlusBadge.test.js
  ```
- **Regression Concerns:**
  - None (new self-contained component).

---

### Task 2: Right Sidebar Integration (`FriendItem.vue`)

- **Files:**
  - `src/views/Sidebar/components/FriendItem.vue` (Modify)
  - `src/views/Sidebar/components/__tests__/FriendItem.test.js` (Modify)
- **Failing Test First:**
  - In `src/views/Sidebar/components/__tests__/FriendItem.test.js`, add tests:
    - Test 1: Renders `VrcPlusBadge` when `friend.ref.$isVRCPlus` is `true`.
    - Test 2: Does NOT render `VrcPlusBadge` when `friend.ref.$isVRCPlus` is `false`.
    - Test 3: Display name container maintains flex `min-w-0` and `truncate` structure so long names truncate properly before the badge.
    - Test 4: Renders badge correctly with nicknames (`DisplayName (Nickname)`).
    - Test 5: Renders badge correctly with favorite stars (`DisplayName ⭐`).
- **Verification Command (Expect Fail):**
  ```bash
  npx vitest run src/views/Sidebar/components/__tests__/FriendItem.test.js
  ```
- **Minimal Implementation:**
  - Import `VrcPlusBadge` in `FriendItem.vue`.
  - Update display name row to `<div class="flex items-center min-w-0 font-medium leading-[18px]">`.
  - Add `<VrcPlusBadge v-if="friend.ref?.$isVRCPlus" size="sm" class="ml-1 flex-none shrink-0" />`.
  - Ensure display name text spans retain `truncate flex-1 min-w-0`.
- **Verification Command (Expect Pass):**
  ```bash
  npx vitest run src/views/Sidebar/components/__tests__/FriendItem.test.js
  ```
- **Regression Concerns:**
  - Verify that sidebar row height is unaffected (remains 36px/h-9).
  - Verify that no API calls are triggered.

---

### Task 3: User Profile Header Integration (`UserSummaryHeader.vue`)

- **Files:**
  - `src/components/dialogs/UserDialog/UserSummaryHeader.vue` (Modify)
  - `src/components/dialogs/UserDialog/__tests__/UserSummaryHeader.test.js` (New)
- **Failing Test First:**
  - Create `src/components/dialogs/UserDialog/__tests__/UserSummaryHeader.test.js`:
    - Test 1: Displays `VrcPlusBadge` size="md" when `userDialog.ref.$isVRCPlus` is `true`.
    - Test 2: Displays `VrcPlusBadge` when `userDialog.publicProfileRef.hasVrcPlus` is `true`.
    - Test 3: Displays `VrcPlusBadge` for current user when `isLocalUserVrcPlusSupporter` is `true`.
    - Test 4: Does NOT render `VrcPlusBadge` when user is not VRC+.
    - Test 5: Coexists cleanly with `EconomyCreator` badge (`BadgeCheck`) and previous display names dropdown.
- **Verification Command (Expect Fail):**
  ```bash
  npx vitest run src/components/dialogs/UserDialog/__tests__/UserSummaryHeader.test.js
  ```
- **Minimal Implementation:**
  - Import `VrcPlusBadge` in `UserSummaryHeader.vue`.
  - Add computed `isVrcPlusUser = computed(() => Boolean(userDialog.value.ref?.$isVRCPlus || userDialog.value.publicProfileRef?.hasVrcPlus || (userDialog.value.id === currentUser.value.id && isLocalUserVrcPlusSupporter.value)))`.
  - Insert `<VrcPlusBadge v-if="isVrcPlusUser" size="md" class="ml-1" />` immediately following the display name span in the name row.
- **Verification Command (Expect Pass):**
  ```bash
  npx vitest run src/components/dialogs/UserDialog/__tests__/UserSummaryHeader.test.js
  ```
- **Regression Concerns:**
  - Ensure copy display name click behavior and previous display names popup still function normally.

---

### Task 4: Existing Profile-Background Integration & Fallback Verification

- **Files:**
  - `src/components/dialogs/__tests__/MainDialogContainer.test.js` (Modify/Expand)
- **Failing Test First:**
  - In `src/components/dialogs/__tests__/MainDialogContainer.test.js`, add tests for `dialogStyle` calculations:
    - Test 1: When `displayVRCProfileBackgrounds: true` and `backgroundType === 'texture'`, resolves valid texture ID to official CDN asset URL from `profileBackgrounds`.
    - Test 2: When `displayVRCProfileBackgrounds: true` and `backgroundType === 'gradient'`, generates valid linear gradient style with luminance contrast.
    - Test 3: When `displayVRCProfileBackgrounds: true` and `backgroundTextureId` is unknown, falls back cleanly to base style without crashing.
    - Test 4: When `displayVRCProfileBackgrounds: false`, returns empty style `{}`.
    - Test 5: When active dialog is not `'user'` (e.g. `'world'`), returns `{}`.
- **Verification Command:**
  ```bash
  npx vitest run src/components/dialogs/__tests__/MainDialogContainer.test.js
  ```
- **Minimal Implementation (if needed):**
  - Verify that `MainDialogContainer.vue` passes all tests cleanly with existing implementation.
  - If any edge case is found during tests (e.g., handling null/undefined `publicProfileRef`), apply minimal guard in `MainDialogContainer.vue`.
- **Verification Command (Expect Pass):**
  ```bash
  npx vitest run src/components/dialogs/__tests__/MainDialogContainer.test.js
  ```
- **Regression Concerns:**
  - None.

---

### Task 5: Focused Regression Verification & Documentation

- **Files:**
  - `docs/task-reports/vrcplus-profile-presentation-report.md` (New walkthrough report)
- **Verification Steps:**
  1. Run all targeted tests for the feature:
     ```bash
     npx vitest run src/components/common/__tests__/VrcPlusBadge.test.js src/views/Sidebar/components/__tests__/FriendItem.test.js src/components/dialogs/UserDialog/__tests__/UserSummaryHeader.test.js src/components/dialogs/__tests__/MainDialogContainer.test.js src/styles/__tests__/bettervrcxStyles.test.js
     ```
  2. Run production build check:
     ```bash
     npm run build
     ```
  3. Verify zero network requests added in sidebar and zero regressions.
