# Task Report: BetterVRCX Session 2 Defect-Fix Pass 01

**Date:** 2026-08-14  
**Scope:** Session 2 Navigation & Submenu Defect Fix Pass  
**Status:** Completed & Verified  

---

## 1. Defect 1 — Nested Hover Submenus Root Cause & Regression Chain

### Latent Structural Issue
In the underlying component primitives (`DropdownMenuSubContent.vue` and `ContextMenuSubContent.vue`), the sub-content elements were rendered directly in place without `<DropdownMenuPortal>` / `<ContextMenuPortal>`. Consequently, submenu DOM nodes were mounted as direct descendants within the parent content's DOM tree.

### Session 2 Regression Trigger
In commit `c1c4b041` (and earlier layout polish), top-level `DropdownMenuContent` and `ContextMenuContent` containers had standard container clipping classes (`overflow-x-hidden overflow-y-auto`) enforced to handle bounded scrollable menus cleanly. Because child submenus opening to the right (`side="right"`) were positioned at offset coordinates outside the bounding box of `DropdownMenuContent`, the browser's CSS clipping engine on `DropdownMenuContent` (`overflow-x: hidden`) clipped and hid the entire nested submenu panel.

Additionally, `DropdownMenuSubContent.vue` was left on legacy tokens (`rounded-md`, missing `border-[var(--bv-border-strong)]`, `shadow-[var(--bv-shadow-lg)]`, `backdrop-blur-[var(--bv-blur-md)]`).

---

## 2. Defect 1 Implementation

- **Portal Integration:** Wrapped `<DropdownMenuSubContent>` inside `<DropdownMenuPortal>` in [`DropdownMenuSubContent.vue`](file:///C:/Users/ANXE/Desktop/Coding/BetterVRCX/BetterVRCX-codex-vrcnext-redesign/src/components/ui/dropdown-menu/DropdownMenuSubContent.vue), teleporting submenus directly to `document.body` and escaping parent container clipping.
- **Context Menu Audit & Parity:** Audited and applied identical `<ContextMenuPortal>` encapsulation to [`ContextMenuSubContent.vue`](file:///C:/Users/ANXE/Desktop/Coding/BetterVRCX/BetterVRCX-codex-vrcnext-redesign/src/components/ui/context-menu/ContextMenuSubContent.vue).
- **Tier 3 Surface Tokens:** Styled submenus with Tier 3 floating tokens (`border-[var(--bv-border-strong)]`, `shadow-[var(--bv-shadow-lg)]`, `backdrop-blur-[var(--bv-blur-md)]`, `rounded-lg`).
- **Side-Aware Motion:** Retained side-aware translation and fade transitions (`data-[side=right]:slide-in-from-left-2`, `data-[side=left]:slide-in-from-right-2`, `data-[side=top]:slide-in-from-bottom-2`, `data-[side=bottom]:slide-in-from-top-2`).
- **Semantic Floating Z-Index:** Maintained standard dropdown floating z-index (`z-12000` for dropdowns, `z-50` for context menus) matching top-level content without introducing arbitrary large numbers.

---

## 3. Defect 2 — Expanded Sidebar Groups Visual Root Cause

1. **Disconnected Parent Geometry:** When expanded, the parent button `.bv-nav-folder-trigger` retained a closed 4-corner rounded pill shape and separate background, visually closing the drawer before the child items started.
2. **Detached Child Floating Rows:** The submenu container `.bv-nav-sub-list` relied on an isolated `border-inline-start` line and offset margins without a shared grouping container, causing `.bv-nav-sub-item` rows to appear as detached pills floating in the empty sidebar rail canvas.

---

## 4. Defect 2 Implementation

- **Unified Folder Group Container:** Enclosed folder trigger and collapsible content within a `.bv-nav-folder-group` wrapper in [`NavMenuFolderItem.vue`](file:///C:/Users/ANXE/Desktop/Coding/BetterVRCX/BetterVRCX-codex-vrcnext-redesign/src/components/nav-menu/NavMenuFolderItem.vue).
- **Subtle Shared Surface:** In [`bettervrcx.css`](file:///C:/Users/ANXE/Desktop/Coding/BetterVRCX/BetterVRCX-codex-vrcnext-redesign/src/styles/bettervrcx.css), `.bv-nav-folder-group.is-expanded` provides a subtle group surface (`background-color: var(--bv-bg-surface-base); border: 1px solid var(--bv-border-subtle); border-radius: var(--bv-radius-md);`) that visually unites parent and children into a single opened group rather than a heavy card.
- **Seamless Trigger Geometry:** `.bv-nav-folder-trigger.is-expanded` has `border-bottom-left-radius: 0; border-bottom-right-radius: 0; background-color: transparent;`, integrating directly into the top of the open group.
- **Integrated Sub-List & Compact Density:** `.bv-nav-sub-list` removes detached border lines in favor of an integrated drawer (`padding: 0 4px 4px 4px; margin: 0;`). `.bv-nav-sub-item` height is set to a scannable, compact `28px` with clear hierarchy indentation (`padding-inline-start: 24px`).
- **Contained Hovers & Zero Layout Shift:** Hover states (`var(--bv-bg-control-hover)`) stay cleanly inside the group surface. Selected children retain `var(--bv-accent-soft)` with a 3px accent indicator (`::before`) at `inset-inline-start: 4px;`.

---

## 5. Files Changed

1. `src/components/ui/dropdown-menu/DropdownMenuSubContent.vue`
2. `src/components/ui/dropdown-menu/__tests__/DropdownMenuSubContent.test.js`
3. `src/components/ui/context-menu/ContextMenuSubContent.vue`
4. `src/components/nav-menu/NavMenuFolderItem.vue`
5. `src/components/nav-menu/__tests__/navItemStates.test.js`
6. `src/styles/bettervrcx.css`
7. `docs/task-reports/ui-polish-session-02-fix-01.md`

---

## 6. Tests & Results

- `npx vitest run src/components/ui/dropdown-menu/__tests__/DropdownMenuSubContent.test.js src/components/nav-menu/__tests__/navItemStates.test.js` (4/4 tests passed)
- `npx vitest run src/components/nav-menu/__tests__/NavMenuFolderItem.test.js src/components/nav-menu/__tests__/NavMenu.test.js` (7/7 tests passed)
- `npx vitest run src/styles/__tests__/bettervrcxStyles.test.js` (10/10 tests passed)

---

## 7. Production Build Result

- `npm run prod` exited with code `0`.
- Vite/Rolldown production bundle completed with zero build or asset errors.

---

## 8. Performance & Static Audit

- `git grep "transition-all"` across touched files returned 0 occurrences.
- `npx oxfmt --check` passed across all modified and newly created files.
- `git diff --check` passed cleanly with no whitespace or merge issues.
- No live-data continuous animations or heavy backdrop-filter animations introduced.

---

## 9. Preserved Session 2 State Semantics

- **Expanded != Selected:** Expanding a folder parent keeps the parent trigger neutral and unselected.
- **Child Selection Independence:** Selecting a child activates that child only (with `is-selected` and 3px zero-layout-shift `::before` indicator), without falsely selecting the parent folder trigger.
- **Collapsed Highlighting:** Collapsed folders continue to show active highlight when any child within them is the active route.

---

## 10. Human Visual QA Checklist

The human tester should verify the following interactions in the real Windows CEF application:

1. **Manage Menu Nested Submenus (Defect 1):**
   - Click `⚙ Manage` in the bottom-left sidebar.
   - Hover over `Theme >` — verify the nested submenu panel appears to the right with smooth, fast entrance and Tier 3 surface styling.
   - Hover over `Table Density >` — verify the nested submenu panel appears to the right.
   - Switch themes or table density options — verify options apply immediately and submenus dismiss cleanly.
   - Press `Escape` or click outside — verify dropdowns dismiss cleanly.

2. **Expandable Navigation Groups (Defect 2):**
   - In the sidebar, expand `Favorites`, `Social`, and `Charts`.
   - Verify each group opens as a single unified drawer with a subtle surface background, rather than children looking like detached floating rows.
   - Verify child items are cleanly indented (`Favorite Friends`, `Favorite Worlds`, `Favorite Avatars`) inside the group container.
   - Click on a child item — verify the 3px accent indicator appears on the child, and the parent folder trigger remains neutral.
   - Verify sidebar height and density remain compact and scannable.

---

## 11. Protected Core & Remote Action Confirmation

- **Zero Protected-Core Changes:** No modifications to authentication, WebSocket handling, API polling, or core database layers.
- **Zero Remote Actions:** No git push, branch publishing, or PR creation performed. All changes committed locally to the active worktree.
