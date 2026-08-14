# BetterVRCX Upstream Compatibility Register

## Repository and reference identity

| Item | Value |
|---|---|
| BetterVRCX checkout | `C:\Users\sigma\Desktop\BetterVRCX` |
| Redesign worktree | `C:\Users\sigma\Desktop\BetterVRCX-codex-vrcnext-redesign` |
| Redesign branch | `codex/vrcnext-redesign` |
| BetterVRCX origin | `https://github.com/awakenginexe/BetterVRCX.git` |
| VRCX upstream | `https://github.com/vrcx-team/VRCX.git` (read-only fetch intent) |
| Baseline SHA | `914ea4d3c4d253a3733d364dbaeff99449c6c202` |
| `origin/master` at baseline | `914ea4d3c4d253a3733d364dbaeff99449c6c202` |
| `upstream/master` at baseline | `914ea4d3c4d253a3733d364dbaeff99449c6c202` |
| Frozen VRCNext checkout | `C:\Users\sigma\Desktop\VRCNext-BetterVRCX-Reference` |
| Frozen VRCNext SHA | `a31da174c0e6130dcf428bdf0ffc6f47d22fabc2` |

The baseline is a clean clone before redesign edits. The redesign branch begins from that SHA. The VRCNext checkout is evidence-only and must remain untouched.

## Compatibility rules

### Preserve exactly

- Hash route paths, route names, auth guard behavior, redirect query behavior, `KeepAlive` exclusions, and dashboard panel route compatibility.
- Pinia store IDs, persisted configuration keys, dashboard IDs, nav keys, tool keys, table preference keys, and local cache semantics.
- VRChat API/request contracts, database schema/migrations/queries, coordinators, websocket/event listeners, and worker message protocols.
- `AppApi`, `AppApiVr`, preload exposure, Electron IPC event/method names, tray behavior, protocol launches, window persistence, native dialogs, notifications, and updater hooks.
- Separate `vr.html` entry and VR/wrist overlay transport/update queues.
- Existing logo asset paths until a verified asset migration exists.

### May change with evidence

- Visible product copy from VRCX to BetterVRCX.
- `src/styles/globals.css`, shared presentation primitives, component templates, layout composition, and page-level style files.
- Route labels and visual grouping, provided route keys, persisted layout values, and Direct Access ordering remain stable.
- Package `name`, Electron `appId`, product name, updater channels, and user-data locations only after an explicit compatibility audit proves the migration is safe. The default redesign plan leaves these identifiers stable and changes public branding copy first.

### Reference boundary

Use the VRCNext commit only for:

- three-rail shell proportions;
- dark layered surfaces;
- compact controls and badges;
- image-led discovery cards;
- shared split detail layouts;
- global/contextual search interaction patterns;
- restrained functional motion;
- semantic status and accessibility opportunities.

Do not copy its Photino host, global mutable state, DOM IDs, injected HTML, inline event handlers, numeric tab routing, local-storage schema, request logic, or CSS/DOM class names.

## Environment caveat

The package requires Node `>=24.15.0` and npm `>=11.5.0` with `engine-strict=true`. The bundled workspace runtime reported Node `v24.14.0`; the system runtime was Node `v22.19.0`/npm `10.9.3`. Baseline dependencies were installed with `npm ci --engine-strict=false` solely to enable local verification. This is an environment limitation, not a dependency change. Do not run an audit auto-fix or change dependency versions as part of the visual redesign.

## Remote safety

No fetch/merge/rebase from upstream is part of redesign implementation unless a later task explicitly records the exact commit and compatibility impact. No push, pull request, tag, release, or remote configuration write is allowed. All commits are local and must contain no co-author trailer.

## Change review checklist

Every implementation reviewer checks:

- no protected route/store/native contract changed accidentally;
- no VRCNext source or architecture copied;
- public BetterVRCX branding is consistent without breaking identifiers;
- existing actions remain reachable from the new hierarchy;
- changed files do not widen baseline lint/type/test failures unnecessarily;
- task documentation records exact verification commands and any pre-existing failures.

