# BetterVRCX ↔ VRCNext Feature Gaps

This register prevents the redesign from implying that BetterVRCX gained VRCNext-only capabilities. It is based on BetterVRCX baseline `914ea4d3c4d253a3733d364dbaeff99449c6c202` and the frozen VRCNext reference `a31da174c0e6130dcf428bdf0ffc6f47d22fabc2`.

Allowed classifications are `OMITTED`, `PARTIAL`, `POSSIBLE_FUTURE`, and `NOT_APPLICABLE`.

## VRCX behavior VRCNext does not fully cover

| Status | Capability | Gap and redesign treatment |
|---|---|---|
| `OMITTED` | Photon lobby diagnostics and Chatbox controls | VRCNext has player/instance views but no BetterVRCX current/previous Photon event buffers, lobby master/timeout state, portal/avatar/prop/chatbox events, or user/keyword blacklist. Keep an opt-in Instance Diagnostics subview and a separate Chatbox Blacklist sheet in the BetterVRCX Player List. |
| `OMITTED` | Hot Worlds friend-visit trends | VRCNext’s public/world insights do not replace BetterVRCX’s local friend-visit aggregation, 7/30/90-day windows, rising/cooling trends, unique-friend counts, and friend drill-down. Keep this as a distinct Friend Trends analytics mode. |
| `OMITTED` | Discord-name and note exports | VRCNext export menus do not cover BetterVRCX’s Discord-name extraction or local memo/note export. Keep both in Tools with preview, explicit heuristic labeling for Discord extraction, and existing save/copy behavior. |
| `PARTIAL` | Feed event policy matrix | VRCNext category filters do not expose BetterVRCX Off/VIP/Friends/Everyone policies per joins, GPS, status, invites, group events, moderation joins, Photon events, or Chatbox messages. Preserve the matrix behind an advanced policy drawer. |
| `PARTIAL` | Friends Locations directory | VRCNext dashboard aggregation lacks BetterVRCX Online/Favorite/Same Instance/Active/Offline segmentation, search, grouping, and persisted card density. Preserve the dedicated directory and its virtualized grid. |
| `PARTIAL` | Screenshot metadata inspection | VRCNext media browsing does not replace BetterVRCX folder intake, XMP/legacy parsing, player/world ID search, sortable results, full author/player/file inspection, and file actions. Keep Screenshot Metadata as a specialized inspector. |
| `PARTIAL` | Complete moderation ledger | VRCNext first-class lists do not replace BetterVRCX’s searchable multi-type moderation ledger, timestamps, source/target links, and direct undo/delete actions. Keep the ledger and improve segmentation. |
| `PARTIAL` | Instance Activity controls | VRCNext timeline charting does not replace BetterVRCX total online time, solo/no-friend filters, detail visibility, and bar-width setting. Keep those controls in a common analytics shell. |
| `PARTIAL` | Bulk avatar tag editing | VRCNext supports individual avatar tagging; BetterVRCX has multi-selection and bulk content/custom-tag workflows. Preserve mixed-value handling, progress, and partial failure reporting. |

## VRCNext capabilities requiring new BetterVRCX logic

These are not visual redesign work. They remain future capability candidates and must not be exposed as functional controls without the required backend/native services.

| Status | Capability | Required new capability before implementation |
|---|---|---|
| `POSSIBLE_FUTURE` | Messenger conversations | Chat send/history protocol, local thread storage, cooldown slots, inbound/outbound state, and shared-content parsing. |
| `POSSIBLE_FUTURE` | Persistent Media Library | Native folder watchers, video metadata/thumbnails, SQLite records, ratings/favorites/blur state, and lifecycle management. |
| `POSSIBLE_FUTURE` | Media Relay | Watch folders, webhook destinations, queue/retry state, upload lifecycle, and error history. |
| `POSSIBLE_FUTURE` | Custom Chatbox | Outbound OSC/chatbox connection, queue, duration/timing, media integration, and send state. This is distinct from the existing blacklist. |
| `POSSIBLE_FUTURE` | General OSC tool | UDP lifecycle, typed parameter state, raw sends, receive cache, and error handling. |
| `POSSIBLE_FUTURE` | Space Flight | OpenVR/Steam discovery, controller input, movement configuration, and running state. |
| `POSSIBLE_FUTURE` | FrameShot | FFmpeg discovery/install, capture/audio sources, encoding, and process lifecycle. |
| `POSSIBLE_FUTURE` | Avatar Scaling | OSC/OpenVR connection, live scale, presets, restore/reset, and safety/error state. |
| `POSSIBLE_FUTURE` | Voice Fight | Device enumeration, speech recognition, sound playback/mixing, and session lifecycle. |
| `POSSIBLE_FUTURE` | Kikitan XD | Audio capture, transcription, translation credentials/providers, filtering, and OSC output. |
| `POSSIBLE_FUTURE` | Action Flow automation | Persisted trigger/condition/action graph, executor, runtime history, and integration actions. |
| `POSSIBLE_FUTURE` | Status Schedule | Ordered time/day rules, status/presence conditions, evaluator lifecycle, and restore behavior. |
| `POSSIBLE_FUTURE` | Scheduled auto-invites | Per-user rules, schedules/status predicates, automatic handling, persistence, and audit log. |
| `POSSIBLE_FUTURE` | Event Snipe | Group/world polling, capacity/access filters, lifecycle state, found-instance log, and safe auto-join. |
| `POSSIBLE_FUTURE` | Managed YouTube Fix lifecycle | Helper discovery/download/install, child-process monitoring, version/status, restart, and output. |
| `POSSIBLE_FUTURE` | Public World Insights sampling | Scheduled sampling, retention, `world_stats` persistence, range queries, and chart aggregation. |

## Confirmed equivalent or non-gap differences

| Status | Capability | Reason |
|---|---|---|
| `NOT_APPLICABLE` | Multi-account/saved-account behavior | Both applications have saved-account/auth flows; redesign BetterVRCX’s existing auth behavior. |
| `NOT_APPLICABLE` | Avatar search providers | BetterVRCX has provider selection/configuration; this is not a missing visual capability. |
| `NOT_APPLICABLE` | Inventory and gallery | BetterVRCX already has inventory/gallery APIs and tabs; preserve the richer existing action set. |
| `NOT_APPLICABLE` | Recent avatar history and individual avatar tags | Existing BetterVRCX flows cover these; only bulk tagging is partial. |
| `NOT_APPLICABLE` | Mutual Network, Time Spent, groups, Discord Presence, VR Overlay | VRCNext has comparable concepts, and BetterVRCX already owns compatible surfaces. |
| `NOT_APPLICABLE` | VRChat config, launch options, shortcuts, registry backup, friend/avatar exports | Existing BetterVRCX tools and native actions provide the relevant category. |

## Rule for new design work

The redesign may improve presentation for every row above. It may not create a nonfunctional imitation of a `POSSIBLE_FUTURE` capability, claim that an `OMITTED` feature is covered, or replace a `PARTIAL` BetterVRCX workflow with the smaller VRCNext equivalent.

