# BetterVRCX Premium UI Specification & Design System

> **Status**: APPROVED SOURCE OF TRUTH (Session 0)  
> **Target Application**: BetterVRCX (Local Desktop Companion for VRChat)  
> **Philosophy**: "VRCX, but better."

---

## Table of Contents
1. [Product Visual Identity](#1-product-visual-identity)
2. [Design Principles](#2-design-principles)
3. [Surface Hierarchy](#3-surface-hierarchy)
4. [Color & Semantic Accent Token Architecture](#4-color--semantic-accent-token-architecture)
5. [Neutral & Background Token Architecture](#5-neutral--background-token-architecture)
6. [Border Strategy](#6-border-strategy)
7. [Radius Scale](#7-radius-scale)
8. [Elevation & Shadow Strategy](#8-elevation--shadow-strategy)
9. [Glass & Transparency Strategy](#9-glass--transparency-strategy)
10. [Spacing Scale & Density Rules](#10-spacing-scale--density-rules)
11. [Typography Hierarchy](#11-typography-hierarchy)
12. [Iconography Rules](#12-iconography-rules)
13. [Interactive State Model](#13-interactive-state-model)
14. [Hover Rules](#14-hover-rules)
15. [Selected / Current Rules](#15-selected--current-rules)
16. [Expanded-State Rules](#16-expanded-state-rules)
17. [Focus-Visible Rules](#17-focus-visible-rules)
18. [Disabled State Rules](#18-disabled-state-rules)
19. [Shared Primitive Inventory](#19-shared-primitive-inventory)
20. [Primitive Responsibilities & Boundaries](#20-primitive-responsibilities--boundaries)
21. [Motion Principles](#21-motion-principles)
22. [Motion Categories](#22-motion-categories)
23. [Duration, Easing & Physics Language](#23-duration-easing--physics-language)
24. [Live-Data Performance Blacklist](#24-live-data-performance-blacklist)
25. [Reduced-Motion Behavior](#25-reduced-motion-behavior)
26. [Responsive & Window-Resize Behavior](#26-responsive--window-resize-behavior)
27. [Accessibility Requirements](#27-accessibility-requirements)
28. [Future Photographic-Background Compatibility](#28-future-photographic-background-compatibility)
29. [Migration Strategy Across Existing Surfaces](#29-migration-strategy-across-existing-surfaces)
30. [Explicit Anti-Patterns](#30-explicit-anti-patterns)
31. [Definition of Done for Visual Polish](#31-definition-of-done-for-visual-polish)
32. [Recommended Motion Technology Decision](#32-recommended-motion-technology-decision)

---

## 1. Product Visual Identity

BetterVRCX is **"VRCX, but better."**

Conceptually aligned with premier enhancement platforms (such as BetterDiscord), BetterVRCX retains the recognizable, robust desktop companion workflow and upstream VRChat capability of VRCX while delivering a modern, cohesive, dark-first, and premium experience.

- **Visual Character**: Hybrid Premium Dark UI.
- **Tone**: Focused, atmospheric, engineered, responsive, and calm for long VR sessions.
- **Identity Accent**: Electric Blue (`#5c76ff`) as default, fully decoupled through CSS custom property tokens.
- **Distinctions**:
  - *Not pure glassmorphism*: Core data views remain opaque and sharp.
  - *Not sterile SaaS*: Layered depths, restrained glass, and ambient glows add desktop warmth.
  - *Not RGB gaming*: No garish multi-colored outlines or pulsating neon gradients.
  - *Not oversized padding*: Preserves dense, high-throughput VRChat operational tooling.

---

## 2. Design Principles

1. **Function-Driven Desktop Tooling**: Every pixel must serve the user's workflow. Aesthetic choices must never hide operational data or slow down event processing.
2. **Predictable Visual Hierarchy**: Shell & Context $\rightarrow$ Workspace Header & Identity $\rightarrow$ Filters & Actions $\rightarrow$ Primary Data Surfaces $\rightarrow$ Metadata & Secondary Details.
3. **Adaptive Density**: Ultra-dense for high-velocity tables and feeds; comfortable for detail cards, dialogs, and settings.
4. **Orthogonal State Encoding**: Hover, active, selected, expanded, and focus-visible states use distinct, non-colliding visual channels.
5. **Zero Live-Data Animation Jitter**: Transitions exist exclusively for user-initiated actions, never for incoming data events.

---

## 3. Surface Hierarchy

The application canvas is built on a 5-tier elevation stack:

```
+-------------------------------------------------------------------------+
| Tier 4: Overlays & Modals (Dialogs, Fullscreen Preview, Sheets)         |
|   z-index: 1000+ | blur: 16px | bg: surface-overlay (94% alpha)        |
+-------------------------------------------------------------------------+
| Tier 3: Floating Menus (Dropdowns, Context Menus, Tooltips, Popovers)    |
|   z-index: 500+  | blur: 12px | bg: surface-floating (92% alpha)       |
+-------------------------------------------------------------------------+
| Tier 2: Interactive Controls & Rails (Sidebar, Tabs, Filter Toolbars)  |
|   z-index: 100+  | blur: 8px  | bg: surface-raised / rail (94% alpha)  |
+-------------------------------------------------------------------------+
| Tier 1: Primary Content Surfaces (Tables, Data Cards, Feed Containers) |
|   z-index: 10    | blur: 0px  | bg: surface-base (100% / 96% alpha)    |
+-------------------------------------------------------------------------+
| Tier 0: App Canvas (Window Background / Base Canvas)                    |
|   z-index: 0     | blur: 0px  | bg: bg-base (#07080a)                   |
+-------------------------------------------------------------------------+
```

---

## 4. Color & Semantic Accent Token Architecture

Components must **never** hardcode blue hex codes or blue utility classes. All components must reference semantic accent tokens:

```css
:root {
    /* Primary Accent HSL Core (Default: VRCX Blue) */
    --bv-accent-h: 228;
    --bv-accent-s: 100%;
    --bv-accent-l: 68%; /* #5c76ff */

    /* Semantic Accent Tokens */
    --bv-accent-primary: hsl(var(--bv-accent-h), var(--bv-accent-s), var(--bv-accent-l));
    --bv-accent-hover: hsl(var(--bv-accent-h), var(--bv-accent-s), calc(var(--bv-accent-l) + 6%));
    --bv-accent-active: hsl(var(--bv-accent-h), var(--bv-accent-s), calc(var(--bv-accent-l) - 6%));
    --bv-accent-muted: hsl(var(--bv-accent-h), 40%, 65%);
    --bv-accent-soft: hsla(var(--bv-accent-h), var(--bv-accent-s), var(--bv-accent-l), 0.14);
    --bv-accent-subtle: hsla(var(--bv-accent-h), var(--bv-accent-s), var(--bv-accent-l), 0.08);
    --bv-accent-glow: 0 0 16px hsla(var(--bv-accent-h), var(--bv-accent-s), var(--bv-accent-l), 0.28);
}
```

### Semantic Status Colors (Fixed & Independent of Theme)
- `--bv-status-online`: `#2dd48c` (Green - User online, success)
- `--bv-status-joinme`: `#38bdf8` (Light Blue - Join Me status, info)
- `--bv-status-askme`: `#fbbf24` (Amber - Ask Me status, caution)
- `--bv-status-busy`: `#f43f5e` (Rose Red - Do Not Disturb, danger/error)
- `--bv-status-offline`: `#64748b` (Slate Grey - Offline / disconnected)

---

## 5. Neutral & Background Token Architecture

```css
:root {
    --bv-bg-base: #07080a;
    --bv-bg-rail: #0c0e12;
    --bv-bg-surface-base: #0d0f14;
    --bv-bg-surface-raised: #14171f;
    --bv-bg-surface-floating: #181c26;
    --bv-bg-control: #12151c;
    --bv-bg-control-hover: #1b202a;
    --bv-bg-control-active: #232a38;

    --bv-text-strong: #f1f5f9;
    --bv-text-regular: #cbd5e1;
    --bv-text-muted: #94a3b8;
    --bv-text-quiet: #64748b;

    --bv-border-subtle: rgba(255, 255, 255, 0.05);
    --bv-border-default: rgba(255, 255, 255, 0.09);
    --bv-border-strong: rgba(255, 255, 255, 0.16);
}
```

---

## 6. Border Strategy

- **Contrast & Fill First**: Rely on background contrast and elevation instead of heavy borders.
- **Structural 1px Lines**: Divider lines and surface borders must strictly be 1px.
- **Never Stack Outlines**: Nested items must not inherit or duplicate container outline borders.

---

## 7. Radius Scale

| Token | Size | Target Components |
|---|---|---|
| `--bv-radius-xs` | `4px` | Tags, inner badges, scrollbar thumbs |
| `--bv-radius-sm` | `6px` | Compact table buttons, dropdown items, compact inputs |
| `--bv-radius-md` | `8px` | Standard buttons, nav items, filter chips, tabs |
| `--bv-radius-lg` | `12px` | Content cards, table containers, toolbars, popovers |
| `--bv-radius-xl` | `16px` | Modal dialogs, entity hero cards, lightbox preview |
| `--bv-radius-full`| `9999px`| User avatars, status dots, toggle switches, pills |

---

## 8. Elevation & Shadow Strategy

- **Level 0 (Flat)**: `box-shadow: none` (Data tables, grid cards in base view).
- **Level 1 (Subtle)**: `box-shadow: 0 2px 8px rgba(0,0,0,0.25)` (Raised cards, action bars).
- **Level 2 (Floating)**: `box-shadow: 0 8px 24px rgba(0,0,0,0.40)` (Context menus, dropdowns).
- **Level 3 (Overlay)**: `box-shadow: 0 24px 64px rgba(0,0,0,0.65)` (Main modal dialogs).

---

## 9. Glass & Transparency Strategy

- Used selectively on navigation rails, dialog backdrops, floating tooltips, and context menus.
- Uses `backdrop-filter: blur(12px)` to `blur(20px)` with high-alpha fills (88%–94%) to ensure text legibility over any background.

---

## 10. Spacing Scale & Density Rules

- Scale: `2px` (micro), `4px` (tight), `6px` (compact), `8px` (standard), `12px` (moderate), `16px` (section), `24px` (page), `32px` (hero).
- **Density Tiers**:
  - *High-Velocity*: 26–30px row height for Feed, Game Log, Friend Log, Player List.
  - *Compact Operational*: 32–36px height for Sidebar, Favorites, Group member lists.
  - *Comfortable Detail*: 40–48px height for Profiles, World details, Settings.

---

## 11. Typography Hierarchy

- **Display (22px / 700 / -0.02em)**: Entity Profile Name, Modal Header.
- **H1 (18px / 650 / -0.015em)**: Main page titles (Feed, Friends, Logs).
- **H2 (15px / 600 / -0.01em)**: Section headings, dialog subheadings.
- **H3 (13px / 600 / 0em)**: Widget titles, form labels.
- **Body Regular (13px / 400 / 1.45)**: Primary descriptions, text blocks.
- **Body Compact (12px / 400 / 1.4)**: Table rows, nav items, menu items.
- **Caption / Eyebrow (10px / 700 / +0.06em)**: Uppercase categories, badges.
- **Mono (11px / 500 / 1.4)**: IDs, hashes, timestamps, JSON.

---

## 12. Iconography Rules

- Standard: Lucide Vue icons at `1.75px` stroke weight.
- Sizes: `14px` (badges), `16px` (buttons/inputs), `18px` (sidebar/tabs), `20px` (headers).

---

## 13. Interactive State Model

To eliminate the conflict where parent and child items stack blue selection outlines, visual cues are separated into distinct properties:

```
+-------------------+--------------------+--------------------+---------------------+
| State             | Background Fill    | Border / Ring      | Text / Icon Color   |
+-------------------+--------------------+--------------------+---------------------+
| Default           | Transparent / Base | Transparent / None | text-muted          |
| Hover             | control-hover      | border-subtle      | text-strong         |
| Pressed (Active)  | control-active     | border-default     | text-strong         |
| Selected / Current| accent-soft (14%)  | Left accent bar    | accent-primary      |
| Expanded (Folder) | surface-raised     | None (Chevron rot) | text-regular        |
| Focus-Visible     | Existing Fill      | 2px solid ring     | Existing Color      |
| Disabled          | Existing (40% op)  | None               | text-quiet          |
+-------------------+--------------------+--------------------+---------------------+
```

---

## 14. Hover Rules

- Must only adjust `background-color`, `border-color`, and `color`.
- Must never alter layout dimensions, margins, or padding.

---

## 15. Selected / Current Rules

- Active routes or selections receive a subtle accent background tint (`--bv-accent-soft`) and a 3px accent bar indicator on the leading edge.

---

## 16. Expanded-State Rules

- Open folders (e.g. Favorites in NavMenu) strictly rotate the chevron 90 degrees and apply a subtle neutral tint.
- **Expanded folders must never apply an accent outline or active selection ring.**

---

## 17. Focus-Visible Rules

- Applied strictly via `:focus-visible` (never mouse `:focus`).
- Ring: `box-shadow: 0 0 0 2px var(--bv-bg-base), 0 0 0 4px var(--bv-accent-primary)`.

---

## 18. Disabled State Rules

- Opacity reduced to `0.40`.
- Pointer events disabled (`pointer-events: none`).
- Form controls visually distinct from read-only controls.

---

## 19. Shared Primitive Inventory

- `BvButton` / `BvIconButton`
- `BvSurface`
- `BvNavItem` & `BvNavFolder`
- `BvDialogShell` & `BvDialog`
- `BvTable` & `BvDataRow`
- `BvBadge` / `BvStatusChip`
- `BvInput` / `BvSelect` / `BvToggle`
- `BvEmptyState`
- `BvSkeleton`
- `BvTooltip`

---

## 20. Primitive Responsibilities & Boundaries

- Primitives handle all geometry, state styling, and accessibility bindings.
- Views compose primitives without injecting ad-hoc inline styles or custom border-radius overrides.

---

## 21. Motion Principles

- Purposeful, mechanical, crisp, non-distracting.
- Interrupted transitions must resolve gracefully without jumping.

---

## 22. Motion Categories

- **Micro-interactions (75–150ms)**: Button press, toggle switch, hover color.
- **Component transitions (150–220ms)**: Dropdown open, tab change, sidebar expand.
- **Layout / Modal transitions (220–300ms)**: Dialog modal enter/exit, sheet drawer.

---

## 23. Duration, Easing & Physics Language

```css
:root {
    --bv-ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
    --bv-ease-out:    cubic-bezier(0.2, 0.8, 0.2, 1);
    --bv-ease-in:     cubic-bezier(0.4, 0, 1, 1);

    --bv-duration-instant: 75ms;
    --bv-duration-fast:    150ms;
    --bv-duration-normal:  220ms;
    --bv-duration-slow:    300ms;
}
```

---

## 24. Live-Data Performance Blacklist

```
+-----------------------------------------------------------------------------+
| LIVE-DATA MOTION BLACKLIST (STRICT PROHIBITIONS)                            |
+-----------------------------------------------------------------------------+
| 1. NO automatic entry/exit animations on incoming real-time rows in:       |
|    - Feed                                                                   |
|    - Game Log & Friend Log                                                  |
|    - Live Player List / Photon Diagnostics                                  |
|    - Online/Offline Friends Rail updates                                    |
| 2. NO timer-driven or heartbeat pulsating animations.                      |
| 3. NO continuous layout shifts or height animations on incoming events.     |
| 4. NO global `transition: all` on table rows, cells, or status indicators.  |
| 5. ONLY user-initiated interactions may animate (e.g. user changes filters, |
|    user sorts table, user clicks expand row, user switches tabs).           |
+-----------------------------------------------------------------------------+
```

---

## 25. Reduced-Motion Behavior

When `prefers-reduced-motion: reduce` is active:
- Durations collapse to `0.01ms`.
- Spatial translates and zoom scales are disabled.
- Essential opacity toggles are preserved for state visibility.

---

## 26. Responsive & Window-Resize Behavior

- Desktop companion viewport optimized from `1024x640` up to `4K`.
- Container queries (`@container`) used for internal widget flexibility instead of viewport breakpoints.

---

## 27. Accessibility Requirements

- WCAG AA contrast ratio ($\ge 4.5:1$ for normal text, $\ge 3:1$ for large text/icons).
- Semantic ARIA roles, live regions for notifications, full keyboard navigation with visible focus rings.

---

## 28. Future Photographic-Background Compatibility

- Layered alpha backgrounds (88%–94%) with backdrop blur ensure high contrast over any user screenshot.
- Primary table surfaces maintain $\ge 96\%$ opacity to ensure continuous reading clarity.

---

## 29. Migration Strategy Across Existing Surfaces

Phased session rollout:
1. Session 1: Foundation & Shared Primitives
2. Session 2: App Shell & Navigation
3. Session 3: Social & Entity Dialogs
4. Session 4: Worlds, Groups, Avatars & Search
5. Session 5: Feed, Logs & Data Surfaces
6. Session 6: Tools & Settings
7. Session 7: Whole-app Polish & Final QA

---

## 30. Explicit Anti-Patterns

- ❌ Stacked selection / outline rings on parent folders + child items.
- ❌ Global `transition: all`.
- ❌ Layout-shifting hover states.
- ❌ Status encoded solely by color without text/icon.
- ❌ Unbounded animated list insertions on live WebSocket events.

---

## 31. Definition of Done for Visual Polish

- Complete adherence to semantic tokens.
- No hardcoded accent colors.
- Distinct and verified interactive states.
- Passing accessibility and reduced-motion checks.
- Zero performance degradation on live event ingestion.

---

## 32. Recommended Motion Technology Decision

- **Verdict**: Native Vue 3 Transitions + GPU-accelerated CSS properties.
- **Decision**: No external animation library is needed or approved. Native transitions provide sub-millisecond execution overhead, zero bundle bloat, and perfect lifecycle synchronization with Vue Router and Pinia state.
