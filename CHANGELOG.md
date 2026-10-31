# Changelog

## 4.4.0

### Added

- Sign in with a QR code or device code, keep a saved passwordless session, and request a password reset in the app.
- View your purchases and your latest 100 VRChat Credits transactions.
- Receive reminders for unclaimed free store items and claim them together.
- Favorite prints to protect them from automatic cleanup. Favorites are saved separately for each account.
- Create and edit groups, transfer ownership, manage calendar events and recurrence, and announce eligible group instances.
- Select or remove owned profile effects, nameplate effects, and icon frames in the profile editor.
- Optionally filter new friend requests with no shared-instance encounters recorded in your local GameLog. This starts off.
- Clear your personal player moderation records by type after confirmation.
- Windows ARM64 Electron source and build support. An ARM64 release package has not been tested on hardware.

### Improved

- Credit balances and owned purchases refresh when economy events arrive and during background synchronization.
- TechAnon and ProTV now-playing information supports playback state changes while retaining legacy media and PyPyDance support.
- User, world, and group searches show 60 results per page.
- Export only public avatars, open higher-resolution image previews, and see mutual-group counts and available instance hype-train information.
- Hover over truncated breadcrumbs and group names to read the full text.
- Playback errors can offer a direct link to VRCVideoCacher, with an option to hide future prompts.

### Fixed

- Group member searches keep the latest query, include known local members, and search additional pages when server results are missing.
- Friends and notifications refresh more reliably after a connection drops.
- Historical GameLog names migrate safely when duplicate entries exist.
- New GameLog entries keep stable row identities, and ignored duplicate inserts no longer appear as new entries.
- Browser data survives genuine CEF upgrades, and the Electron bridge includes the shutdown deadlock fix.
- Removed the deprecated moderation-report Delete action.
- Startup messages use BetterVRCX branding without donation promotions.
- Expected notification-seen rate limits no longer produce error popups, and your own offline duration displays correctly.

## 4.3.0

Found Avatars gives you a place to revisit avatars you have encountered, without digging through the Feed.

- **Your avatars in one menu.** Open **Avatars** in the sidebar to find **My Avatars** and the new **Found Avatars** collection.
- **Keep a local avatar history.** Browse saved pictures, creator details, recorded sightings, and known wearers. Each account keeps its own collection after restarting BetterVRCX.
- **Bring in older sightings.** **Import history** reads the VRChat logs and worn-avatar records still on your computer. An entry needs an avatar ID. If a log does not identify the wearer, it shows **Unknown**.
- **Choose what gets searched.** Friends' identified avatars can be looked up automatically. This is on by default and can be turned off. Other avatars need a manual **Search by ID**, using your existing AvtrDB, Avtr.icu, VRCNDb, or custom search settings.
- **Change into available public avatars.** **Change into avatar** appears after VRChat recently verified the avatar as public, and checks again before switching. An old picture or database entry alone cannot enable it.
- **Clearer details and buttons.** Avatar details use the profile glass design. Search, Change, and failed results have softer theme colors. **Not found** means no matching result; **Retry search** means a search service was unavailable.

Older history depends on the files and records still available locally. First-found dates and wearers are shown as **Unknown** when they were not recorded.

## 4.2.2

This update fixes inventory bundle reminders that kept coming back after restarting BetterVRCX.

- The same bundle popup no longer appears every time you restart the app. BetterVRCX now remembers which bundles it has already shown you, separately for each account.
- Bundles that VRChat reports as having nothing available to claim stay marked **Bundle unavailable**, even after reopening the gallery or restarting the app.
- Your bundles stay in your inventory. To try opening an unavailable bundle again, use **Refresh** in the **Inventory** tab.
- Newly received bundles still trigger notifications.

**After updating:** You may see an existing bundle popup one more time because 4.2.1 did not save reminder history. Version 4.2.2 remembers it after that.

## 4.2.1

This update makes inventory bundles clearer to use, especially older bundles that no longer have anything available to claim.

- If VRChat reports that a bundle has no claimable contents, BetterVRCX now explains this instead of showing a confusing **400 Bad Request** error.
- That bundle stays in your inventory, with **Consume** disabled until you refresh the inventory. Nothing is deleted or marked as successfully claimed.
- Archived items are excluded from the inventory gallery and unopened-bundle notifications.
- **Consume** is disabled while a request is running to prevent repeated clicks from sending the same request twice. Other errors still allow you to retry.

This improves how BetterVRCX handles unavailable bundles; it cannot restore rewards that VRChat no longer makes available.

## 4.2.0

BetterVRCX 4.2.0 brings a cleaner sidebar, smoother navigation, and a Mutual Friend Network that is easier to explore. This update also adds official VRChat Marketplace browsing and more ways to manage your avatars, groups, and instances.

### A more polished interface

- Enjoy smoother page changes, dialog openings, and content reveals when viewing profiles, worlds, avatars, and instances.
- The refreshed sidebar has clearer navigation states and a hover effect that lifts the whole item.
- Explore the Mutual Friend Network with fewer competing labels, subtler connections, and cleaner avatar rings. Select a friend or choose **Focus connections** from their context menu to highlight their network and frame it on screen.
- Use the network's zoom and reset controls, people and connection counts, and focused friend card to move between the overview and individual connections.
- Motion respects reduced-motion preferences, and profile decorations can pause while the app is unfocused without stopping live updates.

### Official Marketplace and avatar tools

- Search the official Avatar Marketplace from **Search**, with minimum and maximum price filters, sorting, and paginated results. Avatar Search v2 and its existing providers remain available.
- Browse VRChat Store shelves and available avatar, group, and world listings. See prices, ownership status, and your VRChat Credits balance where supported.
- Purchase eligible listings with an explicit confirmation showing the item and price. Ownership and balance refresh after a purchase.
- Find your licensed avatars in your own profile's avatar tab, with search, sorting, and manual refresh.
- Reorder or remove your avatar gallery images, and copy an avatar's name or ID from its sharing menu.

### Groups, worlds, and instances

- Create, edit, reorder, and delete group roles, manage permissions, and assign or remove eligible roles. Controls respect your permissions, role hierarchy, and purchase restrictions.
- Create, rename, and delete group galleries, and upload or remove gallery images where permitted.
- Manage pending group invitations and blocked groups, submit moderation reports, and view available report history.
- View instance languages and percentages when VRChat supplies them, alongside active instance counts and associated calendar event details.
- Rename eligible instances and link or unlink group calendar events when authorised.
- Hide closed instances from world instance lists, with support for VRChat's newer instance response format.

### Profiles and presence

- Last Known Presence now uses additional game-log and location events to keep locally observed presence information current.
- Profile history records bio and profile-link changes while avoiding duplicate entries for unchanged information.
- See saved player memos in the Player List and your own Account Standing when provided by VRChat.
- Manage **Reduced Profile Animations** under **Settings â†’ Profile Backdrop**, alongside BetterVRCX's existing appearance controls.

### Notifications and reliability

- Check for unopened inventory bundles and browse supported VRChat information announcements from Tools.
- Choose which statuses allow automatic acceptance of invite requests, with another status check before an invite is sent.
- Get clearer login feedback when email verification is required.
- Sticker-saving failures now show an error and allow retrying. URL validation and Electron system-theme updates have also been improved.

Marketplace availability, prices, and administrative actions depend on VRChat and your account permissions. Existing Avatar Search v2 providers, multi-invite, local photo library, Google Drive backups, and BetterVRCX profile customisation remain part of the app.

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
