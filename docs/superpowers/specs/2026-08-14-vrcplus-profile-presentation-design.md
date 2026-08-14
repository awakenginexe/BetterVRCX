# BetterVRCX Feature Design Spec: VRChat+ Profile Presentation

**Date:** 2026-08-14  
**Author:** Pair Programming Agent  
**Status:** Approved Architecture (Approach 1)  
**Target Branch:** `master`

---

## 1. Executive Summary & Goals

The goal of this feature is to add authentic, premium VRChat+ (VRC+) profile presentation to BetterVRCX without introducing new network requests, altering core domain services, or adding unnecessary dependencies.

Key capabilities:
1. **VRC+ Supporter Badge**: A compact, recognizable, semantic badge displayed immediately after the user's display name:
   - In the **Right Sidebar Friends list** (`FriendItem.vue`)
   - In the **User Profile header** (`UserSummaryHeader.vue`)
2. **VRChat Profile Backdrop Presentation**: Seamless presentation of the inspected user's selected VRChat profile background (texture or gradient), reusing existing VRChat profile data and rendering infrastructure while respecting the user's `displayVRCProfileBackgrounds` preference.

---

## 2. VRC+ Membership Data Architecture

### A. Right Sidebar Zero-Request Architecture
- **Data Source**: Every friend in the friends store has a reactive `ref` (`VrcxUser`) in `userStore.cachedUsers`.
- **Derivation**: In `src/coordinators/userCoordinator.js` (`applyUser()`), `ref.$isVRCPlus` is evaluated synchronously as:
  ```javascript
  ref.$isVRCPlus = ref.tags.includes('system_supporter');
  ```
- **Rule**: `FriendItem.vue` consumes `props.friend.ref?.$isVRCPlus` directly from existing in-memory reactive state.
- **Strict Constraint**: Under no circumstances will `GET /profile/{userId}` or any other API endpoint be called when rendering the friends sidebar. **0 additional network requests are added for the sidebar.**

### B. User Profile Header Data Sources
- **Data Sources**:
  - `userDialog.ref.$isVRCPlus` (immediate from cached user record / `/user/{userId}`)
  - `userDialog.publicProfileRef?.hasVrcPlus` (corroborating flag from `GET /profile/{userId}`)
  - `isLocalUserVrcPlusSupporter` (for current user, checks `currentUser.$isVRCPlus || AppDebug.debugVrcPlus`)
- **Evaluation**: The profile header renders the badge if any of these authoritative flags is true.

---

## 3. Reusable VRC+ Badge Component Design

### Component Location & API
- **File**: `src/components/common/VrcPlusBadge.vue`
- **Props**:
  - `size`: `'sm'` (default for sidebar, compact ~15px height) | `'md'` (for profile header, ~18px height)
- **Visual Target**:
  - Semantic chip with text `VRC+`
  - Supporter identity using BetterVRCX design tokens:
    - Background: `var(--bv-accent-soft)` / amber-gold supporter tone (`rgba(245, 158, 11, 0.12)`)
    - Border: subtle supporter border (`rgba(245, 158, 11, 0.28)`)
    - Foreground: high-contrast text (`#fbbf24` in dark mode / readable amber in light mode)
  - Typography: `font-bold font-mono tracking-tight leading-none`
  - Restrained, premium styling (no pulsating dots, no gradient text animation, no layout jumping, no scale transforms).
- **Accessibility**:
  - Uses visible text `VRC+`.
  - Tooltip: `t('dialog.user.info.vrcplus_supporter')` or `VRChat+ Supporter`.
  - ARIA label for screen readers.

---

## 4. Right Sidebar Layout & Typography Protection

### Layout Structure in `FriendItem.vue`
```vue
<div class="flex items-center min-w-0 font-medium leading-[18px]">
    <span
        v-if="!hideNicknames && friend.$nickName"
        class="truncate flex-1 min-w-0"
        :style="{ color: friend.ref.$userColour }">
        {{ friend.ref.displayName }} ({{ friend.$nickName }})
    </span>
    <span
        v-else
        class="truncate flex-1 min-w-0"
        :style="{ color: friend.ref.$userColour }">
        {{ friend.ref.displayName }}{{ isGroupByInstance && allFavoriteFriendIds.has(friend.id) ? ' ⭐' : '' }}
    </span>
    <VrcPlusBadge
        v-if="friend.ref?.$isVRCPlus"
        size="sm"
        class="ml-1 flex-none shrink-0" />
</div>
```

### Protection Invariants:
1. **Truncation Priority**: Display name / nickname truncates with ellipsis before the badge is pushed off-screen.
2. **Width & Height Stability**: `FriendItem` height remains locked to `h-9` (`36px`). The sidebar width is not affected by long names.
3. **Nickname Integrity**: The badge appears after the full name unit: `DisplayName (Nickname) [VRC+]`.
4. **Favorite Star**: Preserved alongside the name unit: `DisplayName ⭐ [VRC+]`.

---

## 5. User Profile Header Integration

### Location in `UserSummaryHeader.vue`
The badge is rendered directly following the user's `displayName` within the name row, coexisting with previous display names, economy creator badge, and pronouns:
```vue
<span
    class="font-bold cursor-pointer wrap-anywhere"
    v-text="userDialog.ref.displayName"
    @click="copyUserDisplayName(userDialog.ref.displayName)"></span>
<VrcPlusBadge
    v-if="isVrcPlusUser"
    size="md"
    class="ml-1" />
<TooltipWrapper
    v-if="userDialog.publicProfileRef?.isEconomyCreator"
    side="top"
    :content="t('dialog.user.info.economy_creator')">
    <BadgeCheck class="h-3.5 w-3.5 text-[#3b82f6]" />
</TooltipWrapper>
```

---

## 6. VRChat Profile Backdrop Pipeline & Settings

### Critical Distinction: Banner vs. Backdrop
- **`bannerUrl`**: The horizontal hero image at the top of the profile card in `UserSummaryHeader.vue`.
- **`backgroundTextureId` / `backgroundType`**: The overall dialog backdrop/wallpaper behind the entity dialog.
- **Rule**: `bannerUrl` must NEVER be stretched or substituted for the profile backdrop.

### Backdrop Pipeline:
1. When a profile opens, `updateUserDialogProfile()` in `userCoordinator.js` calls `GET /profile/{userId}`.
2. `publicProfileRef` receives `backgroundType` (`'texture'`, `'gradient'`, or `'default'`), `backgroundTextureId`, `backgroundGradientTop`, and `backgroundGradientBottom`.
3. `MainDialogContainer.vue` resolves the style in `dialogStyle`:
   - For `texture`: Resolves `backgroundTextureId` against `profileBackgrounds` from `src/shared/constants/backgrounds.js` (`BG_Cascade.png`, `Koi_Layer.png`, etc.).
   - For `gradient`: Computes linear gradient with readable contrast adjustments via `getReadableProfileThemeColor()`.
   - For `default` or unknown texture: Falls back cleanly to base dialog styling.
4. **Setting Respect**: If `appearanceSettingsStore.displayVRCProfileBackgrounds` is `false`, `dialogStyle` returns empty object `{}` and standard BetterVRCX Premium Dark dialog background is rendered.

### Readability & Card Hierarchy:
- BetterVRCX cards (`.bv-entity-card`, `.bv-entity-dialog-rail`, `.bv-entity-dialog-body`) use `--bv-bg-surface-raised` (`#14171f`) and `--bv-bg-surface-base` (`#0d0f14`), maintaining opaque surfaces with high-contrast text.
- Profile content remains 100% readable regardless of user backdrop choice.

---

## 7. Performance & Upstream Compatibility

- **Performance**:
  - No new polling loops or timers.
  - No additional per-friend network requests in sidebar.
  - Profile backdrop uses static CSS backgrounds with GPU layer promotion.
  - Respects `prefers-reduced-motion`.
- **Upstream Compatibility**:
  - Does not modify any native CEF/.NET code in `Dotnet/` or Electron IPC.
  - Reuses all existing VRChat API models and constants.
  - Presentation-only changes isolated to Vue components and BetterVRCX CSS tokens.

---

## 8. Explicit Non-Goals

1. **No new VRC+ API**: No new API endpoints or polling mechanisms.
2. **No N+1 sidebar requests**: Zero extra network calls in sidebar.
3. **No custom/random backgrounds**: Only the inspected user's actual selected backdrop is rendered.
4. **No screenshot background feature**: Not part of VRC+ profile presentation.
5. **No parallax or animated backdrops**: No decorative animations or motion filters.
6. **No new settings**: Reuses the existing `displayVRCProfileBackgrounds` preference.
7. **No native/.NET/C# changes**: Pure frontend presentation.
8. **No auth changes**: Auth flow remains unchanged.
