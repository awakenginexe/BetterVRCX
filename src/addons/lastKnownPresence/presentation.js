import { parseLocation } from '../../shared/utils/locationParser';
import { isHiddenPresenceStatus } from './status';

/** Select historical hints without changing the live friends or player lists. */
export function getPresenceHints(
    enabled,
    observations,
    friendsById,
    locallyPresent
) {
    if (!enabled) return [];
    return [...observations.values()].filter((observation) => {
        const friend = friendsById.get(observation.userId);
        return (
            friend?.state === 'online' &&
            isHiddenPresenceStatus(friend.ref?.status) &&
            parseLocation(friend.ref?.location).isPrivate &&
            !locallyPresent.has(observation.userId)
        );
    });
}

/** Group metadata only: never derive live occupancy or friend counts here. */
export function groupPresenceHints(observations) {
    const groups = new Map();
    for (const observation of observations) {
        let group = groups.get(observation.locationTag);
        if (!group) {
            group = {
                locationTag: observation.locationTag,
                worldId: observation.worldId,
                worldName: observation.worldName,
                observations: []
            };
            groups.set(observation.locationTag, group);
        }
        group.observations.push(observation);
    }
    return [...groups.values()];
}

/**
 * Resolves artwork for a world from the cached worlds store,
 * querying the world in the background if missing.
 * Preferred order: thumbnailImageUrl -> imageUrl.
 *
 * @param {{ cachedWorlds?: Map<string, any> }} [worldStore]
 * @param {string} [worldId]
 * @param {string} [locationTag]
 * @param {{ fetch: (key: string, params: any) => Promise<any> }} [queryClient]
 * @returns {string | null}
 */
export function resolveWorldArtwork(
    worldStore,
    worldId,
    locationTag,
    queryClient
) {
    let targetWorldId = worldId;
    if (targetWorldId?.includes(':')) {
        const parsed = parseLocation(targetWorldId);
        targetWorldId = parsed.worldId || targetWorldId;
    }
    if (!targetWorldId && locationTag) {
        const parsed = parseLocation(locationTag);
        targetWorldId = parsed.worldId;
    }
    if (!targetWorldId) return null;

    const cached = worldStore?.cachedWorlds?.get?.(targetWorldId);
    if (!cached) {
        queryClient
            ?.fetch?.('world.dialog', { worldId: targetWorldId })
            ?.catch?.(() => {});
        return null;
    }
    return cached.thumbnailImageUrl || cached.imageUrl || null;
}
