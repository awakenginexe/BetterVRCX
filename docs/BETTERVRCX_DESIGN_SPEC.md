# BetterVRCX Complete Redesign — Approved Design Specification

## Purpose

BetterVRCX keeps the VRCX Vue 3, Pinia, Vue Router, Vite, Electron, native bridge, database, coordinator, localization, and VR-overlay architecture while giving every visible surface a coherent desktop control-center design. VRCNext is a visual and interaction reference only. Its source architecture, host bridge, state model, storage keys, request logic, and markup are not copied.

This document records the approved specification from the redesign brief and the repository/reference audits. It is an implementation contract, not a request for another approval loop.

## Non-negotiable boundaries

- Preserve route names, hash paths, auth guards, navigation metadata, dashboard IDs, tool keys, and persisted configuration keys.
- Preserve API, database, coordinator, native IPC, Electron, tray, protocol, window, updater, and VR-overlay contracts.
- Preserve table columns, row actions, pagination, sorting, virtualization, lazy loading, `KeepAlive`, workers, chart data processors, and confirmation workflows.
- Preserve localization keys, accessible labels, status/platform/trust semantics, notification indicators, and platform gates.
- Use Vue components, Pinia state, existing composables, and existing UI primitives. Do not introduce a vanilla DOM/global-state architecture.
- Do not copy VRCNext source, DOM topology, CSS class names, storage keys, host bridge, or request logic.
- Keep the current VRCX logo image assets temporarily; change visible product naming to BetterVRCX.
- Make no network writes. Do not push, open a pull request, create a tag, or modify remote configuration.
- Do not add co-authors to commits.

## Product character

BetterVRCX should feel like a focused native desktop companion: dense enough for live VRChat operations, calm enough for long sessions, and navigable without losing context. The dominant visual hierarchy is:

1. Persistent shell and current context.
2. Page title, identity, or current-instance summary.
3. Primary action/filter row.
4. Main data or image surface.
5. Secondary details, history, diagnostics, and destructive actions.

The design is dark-first and desktop-oriented. Narrow windows should reflow and scroll safely, but the product is not a mobile UI and should not hide operational controls behind a mobile-only navigation rewrite.

## Visual system

### Color tokens

Implement semantic `--bv-*` tokens in the existing global stylesheet while retaining the existing variable names and legacy selectors during migration. Values are inspired by the frozen VRCNext reference and adapted to BetterVRCX semantics.

| Role | Token | Value | Use |
|---|---|---:|---|
| Base | `--bv-bg-base` | `#050505` | App canvas |
| Rail | `--bv-bg-rail` | `#0A0A0A` | Navigation and sidebar |
| Surface | `--bv-bg-surface` | `#0D0D0E` | Cards, panels, dialogs |
| Control | `--bv-bg-control` | `#101011` | Inputs and quiet controls |
| Hover | `--bv-bg-hover` | `#1C1C1F` | Row/card/control hover |
| Border | `--bv-border` | `#1C1C1F` | Separators and field borders |
| Accent | `--bv-accent` | `#5C76FF` | Primary action and active state |
| Accent soft | `--bv-accent-soft` | `#9797B1` | Secondary accent text |
| Info | `--bv-info` | `#8CA5FF` | Cool informational emphasis |
| Success | `--bv-success` | `#2DD48C` | Online/success/current |
| Warning | `--bv-warning` | `#FFBA37` | Caution/ask-me/limits |
| Danger | `--bv-danger` | `#FF4B55` | Destructive/error/busy |
| Text | `--bv-text-strong` | `#EBEBFF` | Headings and primary data |
| Text | `--bv-text-muted` | `#B7B7C3` | Secondary copy |
| Text | `--bv-text-quiet` | `rgba(235,235,255,.58)` | Metadata and tertiary copy |
| Offline | `--bv-offline` | `#747F8D` | Offline/unknown status |

Semantic status colors remain stable even when an account profile theme or future appearance option changes. Never use color alone to communicate trust, platform, moderation, or notification state.

### Geometry and density

- Taskbar/titlebar target: 42px on Windows/Linux; preserve the existing 28px macOS draggable title-bar contract where required by the native host.
- Expanded navigation: 220px; collapsed navigation: 60px.
- Expanded right rail: 260px; collapsed right rail: 60px.
- Main content edge offset: 24–28px on desktop.
- Primary controls: 32–36px high with 7–9px radius.
- Standard panels: 12px radius; hero/detail panels: 14–16px radius; badges: 5–7px radius.
- Compact spacing rhythm: 4px, 8px, 10px, 14px, 20px, 28px.
- Operational tables remain dense with sticky headers, ellipsis, horizontal overflow where necessary, and explicit density controls.
- Image-led discovery cards use 4:3 or existing media aspect ratios, dark bottom scrims, 12–16px radii, and restrained hover lift.

### Typography

Use the existing configurable font pipeline, with a compact sans-serif default and a mono face for IDs, timestamps, instance identifiers, and diagnostic values. Keep the product scale readable:

- 9–10px: metadata and compact labels.
- 11–13px: normal controls and row text.
- 15–20px: page/detail headings.
- 600–800 weight: active navigation, entity names, and section headings.

Do not hard-code a font that bypasses the existing font/locale settings.

## Shell and information architecture

The shell is a persistent three-zone desktop layout:

- Top: platform-safe taskbar/title region with product label, current context, global quick search, notification affordance, and window controls supplied by the existing Electron layer.
- Left: customizable navigation with the existing item/folder/dashboard/tool-pinning model. Keep useful icons and status markers in collapsed mode. Direct Access remains last.
- Center: routed content in the existing `RouterView`/`KeepAlive` structure, with a consistent page header and primary action row.
- Right: existing Friends/Groups sidebar, notification center, quick search entry, sorting/grouping controls, virtualized lists, and resizable behavior.
- Bottom: existing status bar and native/runtime indicators.

Route and persistence behavior stay authoritative in `src/plugins/router.js`, `src/shared/constants/ui.js`, `src/components/nav-menu`, and the related stores. Visual changes must not change `navKey`, dashboard IDs, pinned tool keys, or `VRCX_customNavMenuLayoutList`.

## Shared interaction grammar

### Page frame

Every route-level surface should use a consistent frame:

- eyebrow or category label when useful;
- title and concise purpose statement;
- summary/status chips for live or filtered data;
- primary actions at the start of the toolbar;
- filters and view/density settings grouped separately;
- main content in a surface/card with explicit loading, empty, error, and refresh states.

### Cards and rows

- Discovery entities (users, worlds, groups, avatars, gallery media) get image-first cards with a clear name, status/platform badges, and one visible primary action.
- Operational entities (feed, logs, moderation, notifications, tables) get dense rows with stable columns and inline action affordances.
- A selected item uses an accent outline/ring plus a non-color cue such as a checkmark, active label, or row marker.
- Hover motion is limited to transform/opacity/shadow and never changes layout dimensions.

### Details and dialogs

Entity dialogs remain store-driven through `MainDialogContainer` and the existing coordinator APIs. Use one shared detail shell for User, World, Avatar, and Group:

- identity rail or banner/header;
- sticky tab/section navigation;
- scrollable content body;
- action cluster with safe/destructive grouping;
- breadcrumb/back behavior through the existing dialog crumb store;
- consistent loading/error/permission states.

Do not flatten these into routes if the current workflow expects a dialog or dashboard panel. Preserve portal and z-order behavior from the existing primitives.

### Search

Keep contextual page search and the existing Ctrl/Cmd+K quick search as separate but visually related patterns. Quick search must retain worker lifecycle, local index/confusable behavior, keyboard navigation, remote target selection, and entity click-through. Page search must retain per-type composables, pagination, provider choices, and filters.

### Settings and tools

Settings should become a responsive index/sidebar with the same eight tab keys and immediate store side effects. Group sections by user intent and clearly distinguish:

- immediate setting;
- restart-required setting;
- native/platform-dependent setting;
- destructive maintenance action;
- credential/API-key action.

Tools should become a searchable, categorized launcher. Route tools, global dialogs, stores, native folder actions, exports, and destructive operations must have distinct affordances. Gallery and Screenshot Metadata are full workspaces, not ordinary cards.

## Surface-specific design direction

- Feed, Friend Log, Friend List, Moderation, and Notifications: table-first activity/audit surfaces with persistent filters and strong row actions.
- Friends Locations, Favorites, My Avatars, Gallery: image/card grids with virtualized rendering, visible density controls, and clear group ownership.
- Player List: current-instance command center with world/instance summary, player table, Photon diagnostics subview, and Chatbox blacklist sheet.
- Game Log: intentional Table/Sessions switch, independent filter state, live now-playing emphasis, and retained destructive confirmations.
- Search: entity tabs with shared result structure and type-specific filters/provider controls.
- Dashboard: edit-mode canvas with obvious row direction, panel boundaries, empty state, save/cancel/delete controls, and compact widget treatment.
- Charts: shared analytics frame for dates, refresh, settings, summary metrics, loading/empty states, and preserved interactive canvases/workers.
- Favorites: shared two-pane group rail/content pane; remote/local ownership, counts/capacity, edit selection, copy/move, import/export, and invalid-avatar progress remain visible.
- Settings/Tools: task-oriented navigation, scan-friendly sections, status/warning treatment, and preserved dialog/native actions.
- VR overlay: separate constrained visual system, not a scaled desktop shell; preserve IPC update queues and platform-specific visibility.

## Motion, accessibility, and states

- Use 80–250ms transitions for shell, menus, tabs, dialogs, and sidebars; use longer image hover transitions only for media cards.
- Respect `prefers-reduced-motion` and the existing no-animation setting by reducing transform/transition durations without disabling required state changes.
- Use `:focus-visible` rings on buttons, links, menu items, tabs, custom cards, and controls.
- Preserve native semantics where possible. Any clickable card/menu row must have an accessible role, keyboard path, and visible focus treatment.
- Keep modal labels, `aria-modal`, focus containment/restoration, Escape behavior, and portal layering intact or improve them without changing caller APIs.
- Loading states use skeletons aligned to the final content geometry; empty states explain what is missing and expose a safe next action where one exists; errors include retry or recovery when the existing store/API supports it.
- Never encode a status only with hue; retain text, icon, outline, or shape cues.

## Branding and compatibility

Visible copy uses BetterVRCX. Package/application identifiers, user-data paths, protocol names, updater configuration, native method names, and existing asset paths remain unchanged unless a compatibility task proves a safe migration. The temporary VRCX logo assets stay in place until a separately verified asset migration.

The frozen VRCNext reference lives at `C:\Users\sigma\Desktop\VRCNext-BetterVRCX-Reference` and is read-only at commit `a31da174c0e6130dcf428bdf0ffc6f47d22fabc2`. The redesign branch starts from BetterVRCX baseline `914ea4d3c4d253a3733d364dbaeff99449c6c202`.

## Acceptance bar

A surface is `VERIFIED` only when its coverage row has a concrete implementation, a fresh review has inspected the actual diff, the relevant tests/build have been run, and the reviewer confirms that preserved behavior was not removed. The redesign is not considered complete while any meaningful coverage row remains `UNASSESSED`, `DESIGN_NEEDED`, `IN_PROGRESS`, or `BLOCKED`.

