# Changelog

## 4.1.0

- Avatar Search v2: AvtrDB, Avtr.icu and VRCNDb, smart fallback, combined results and source badges.
- Richer avatar details with database information and official VRChat performance statistics.
- Separate PC/Android performance views, colored ratings, automatic caching and manual refresh.
- Improved observed public-avatar lookup and friendship history.

## 4.0.0

### Profile and API compatibility

- Gallery icon set and clear now use the supported profile update contract. Current user and public profile views refresh after a successful change; failures remain visible.
- Avatar Feed handles verified avatar icons and banners while keeping custom profile icons distinct, ignoring stale lookups, and avoiding duplicate events.
- Player List bio links and User Dialog share account-aware public profile data with request deduplication and invalidation on account or profile changes.

### Behavior and search

- GameLog session search loads smaller initial batches and applies the latest search, dates, and filters when requests overlap.
- Screenshot Metadata limits automatic short-query scans, supports explicit short searches and IME input, and discards stale results. Home Wallpaper's empty-query photo discovery remains available.

### Multi-Invite

- Existing invite flows show per-recipient progress and separate success, failure, cancellation, and uncertain timeout outcomes. Safe retries exclude completed recipients and respect rate-limit delays. Batches remain visible when the dialog is reopened during the same app session.

### Local Photo Library

- Adds a read-only, local-only screenshot browser with paginated results, lazy thumbnails, world/player metadata search, date filters, and detail links to existing dialogs. It does not upload or alter images.
- Reuses ScreenshotHelper, `metadataCache.db`, and the existing PNG parser. An additive index and file-freshness columns are migrated in the same cache database; no original screenshot migration or rewrite occurs. Existing metadata cache rows are refreshed on first use when their file identity is unknown.
- Missing or damaged metadata is shown explicitly. File modification time is a labeled fallback, not a confirmed capture time. Recorded players and carefully matched GameLog participants are associations with an instance; neither proves who is visible in the image. Historical matching requires a reliable metadata timestamp, an exact instance, a matching account, and a recorded session/stay spanning that time.
- A manual refresh finds newly added, moved, or removed files. The library starts with PNG files in the configured VRChat photo directory and does not add upload, sync, video, or editing features.
