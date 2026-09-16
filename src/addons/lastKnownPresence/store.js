import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import configRepository from '../../services/config';
import { parseLocation } from '../../shared/utils/locationParser';
import { isHiddenPresenceStatus } from './status';
export { isHiddenPresenceStatus } from './status';

const ENABLED_KEY = 'BetterVRCX_lastKnownPresenceEnabled';

/**
 * @typedef {object} Observation
 * @property {string} userId
 * @property {string} worldId
 * @property {string} worldName
 * @property {string} instanceId
 * @property {string} locationTag
 * @property {number} observedAt
 * @property {string} status
 * @property {'local_presence' | 'last_visible_api'} source
 */

/** Only actual world/instance tags qualify; never a traveling destination. */
function realLocation(tag) {
    const location = parseLocation(tag);
    return location.isRealInstance &&
        location.worldId.startsWith('wrld_') &&
        location.instanceId
        ? location
        : null;
}

export const useLastKnownPresenceStore = defineStore(
    'LastKnownPresence',
    () => {
        const enabled = ref(false);
        const observations = reactive(
            /** @type {Map<string, Observation>} */ (new Map())
        );
        // Private RAM candidates are current evidence, not a history. API candidates
        // bridge separately delivered status/location patches. Local candidates only
        // come from fresh joins, never the reconstructed game-log player list.
        const lastVerifiedAtByInstance = new Map();
        const lastAttemptAtByInstance = new Map();
        let verificationGeneration = 0;
        let verifying = false;
        const visibleCandidates = new Map();
        const localPresence = new Map();
        let enabledAt = Infinity;
        let preferenceChanged = false;
        let initialization;

        function clear() {
            observations.clear();
            lastVerifiedAtByInstance.clear();
            lastAttemptAtByInstance.clear();
            verificationGeneration++;
            verifying = false;
            visibleCandidates.clear();
            localPresence.clear();
        }

        function init() {
            initialization ??= (async () => {
                const saved = await configRepository.getBool(
                    ENABLED_KEY,
                    false
                );
                if (!preferenceChanged) {
                    clear();
                    enabled.value = saved === true;
                    enabledAt = enabled.value ? Date.now() : Infinity;
                }
            })();
            return initialization;
        }

        function setEnabled(value) {
            preferenceChanged = true;
            clear();
            enabled.value = value === true;
            enabledAt = enabled.value ? Date.now() : Infinity;
            return configRepository.setBool(ENABLED_KEY, enabled.value);
        }

        function invalidate(userId) {
            if (!enabled.value) return;
            observations.delete(userId);
            visibleCandidates.delete(userId);
            localPresence.delete(userId);
        }

        /** Called only with a successful, fresh raw Instance API response. */
        function onInstanceResponse(
            locationTag,
            json,
            verifiedAt = Date.now()
        ) {
            if (
                !enabled.value ||
                ![...observations.values()].some(
                    (o) => o.locationTag === locationTag
                )
            )
                return;
            if (
                typeof json?.userCount !== 'number' ||
                !Number.isFinite(json.userCount) ||
                json.userCount < 0
            )
                return;
            lastVerifiedAtByInstance.set(locationTag, verifiedAt);
            if (json.userCount === 0) {
                for (const [id, observation] of observations) {
                    if (observation.locationTag === locationTag) invalidate(id);
                }
                lastVerifiedAtByInstance.delete(locationTag);
                lastAttemptAtByInstance.delete(locationTag);
            }
        }

        /** Reuses the shared GET layer; attempts are bounded even when requests fail. */
        async function verifyInstances(getInstance, now = Date.now()) {
            if (!enabled.value || !observations.size || verifying) return;
            const instances = new Map(
                [...observations.values()].map((o) => [o.locationTag, o])
            );
            for (const map of [
                lastVerifiedAtByInstance,
                lastAttemptAtByInstance
            ]) {
                for (const tag of map.keys())
                    if (!instances.has(tag)) map.delete(tag);
            }
            const age = (tag) =>
                Math.max(
                    lastVerifiedAtByInstance.get(tag) ?? -Infinity,
                    lastAttemptAtByInstance.get(tag) ?? -Infinity
                );
            const stale = [...instances.values()]
                .filter((o) => now - age(o.locationTag) >= 300000)
                .sort((a, b) => age(a.locationTag) - age(b.locationTag))
                .slice(0, 10);
            const generation = verificationGeneration;
            verifying = true;
            try {
                for (const observation of stale) {
                    if (!enabled.value || generation !== verificationGeneration)
                        break;
                    if (
                        ![...observations.values()].some(
                            (o) => o.locationTag === observation.locationTag
                        )
                    )
                        continue;
                    lastAttemptAtByInstance.set(observation.locationTag, now);
                    try {
                        await getInstance({
                            worldId: observation.worldId,
                            instanceId: observation.instanceId
                        });
                    } catch {
                        /* Unavailable occupancy is not evidence of an empty instance. */
                    }
                }
            } finally {
                if (generation === verificationGeneration) verifying = false;
            }
        }

        function record(userId, tag, worldName, status, source, observedAt) {
            const location = realLocation(tag);
            if (
                !location ||
                !Number.isFinite(observedAt) ||
                observedAt < enabledAt
            )
                return;
            const previous = observations.get(userId);
            if (previous && previous.observedAt > observedAt) return;
            observations.set(userId, {
                userId,
                worldId: location.worldId,
                worldName: worldName || location.worldId,
                instanceId: location.instanceId,
                locationTag: tag,
                observedAt,
                status,
                source
            });
        }

        function playerJoined(
            user,
            location,
            { isFriend, observedAt = Date.now() }
        ) {
            if (
                !enabled.value ||
                !isFriend ||
                !user?.id ||
                observedAt < enabledAt ||
                !realLocation(location.location)
            )
                return;
            const latest = Math.max(
                observations.get(user.id)?.observedAt ?? 0,
                localPresence.get(user.id)?.observedAt ?? 0
            );
            if (observedAt < latest) return;
            localPresence.set(user.id, {
                locationTag: location.location,
                worldName: location.name,
                observedAt
            });
            // Meeting elsewhere supersedes any old remembered instance immediately.
            observations.delete(user.id);
            if (
                isHiddenPresenceStatus(user.status) &&
                !realLocation(user.location)
            ) {
                record(
                    user.id,
                    location.location,
                    location.name,
                    user.status,
                    'local_presence',
                    observedAt
                );
            }
        }

        function playerLeft(userId, locationTag) {
            if (!enabled.value) return;
            if (localPresence.get(userId)?.locationTag === locationTag)
                localPresence.delete(userId);
            if (observations.get(userId)?.locationTag === locationTag)
                observations.delete(userId);
            if (visibleCandidates.get(userId)?.locationTag === locationTag)
                visibleCandidates.delete(userId);
        }

        function leaveLocation(location, users, observedAt = Date.now()) {
            if (!enabled.value) return;
            for (const [userId, presence] of localPresence) {
                if (presence.locationTag !== location.location) continue;
                const user = users.get(userId);
                if (
                    user &&
                    isHiddenPresenceStatus(user.status) &&
                    !realLocation(user.location)
                ) {
                    record(
                        userId,
                        presence.locationTag,
                        presence.worldName,
                        user.status,
                        'local_presence',
                        observedAt
                    );
                }
                localPresence.delete(userId);
            }
        }

        /** Must run BEFORE applyUser mutates previous. No input object is retained. */
        function onUserUpdate(
            previous,
            patch,
            { isFriend, worldName = '', observedAt = Date.now() }
        ) {
            if (!enabled.value) return;
            const userId = patch.id;
            if (!userId) return;
            if (
                !isFriend ||
                patch.isFriend === false ||
                patch.state === 'active' ||
                patch.state === 'offline' ||
                parseLocation(patch.location).isOffline
            ) {
                invalidate(userId);
                return;
            }
            const status = patch.status ?? previous?.status;
            const locationTag = patch.location ?? previous?.location;
            const location = realLocation(locationTag);
            if (location) {
                observations.delete(userId);
                // A status-only patch is not a new location observation.
                if (realLocation(patch.location)) {
                    const candidate = visibleCandidates.get(userId);
                    visibleCandidates.set(userId, {
                        locationTag,
                        worldName:
                            worldName ||
                            (candidate?.locationTag === locationTag
                                ? candidate.worldName
                                : '') ||
                            location.worldId,
                        observedAt
                    });
                }
                return;
            }
            if (parseLocation(locationTag).isTraveling) {
                invalidate(userId);
                return;
            }
            if (!isHiddenPresenceStatus(status)) {
                observations.delete(userId);
                return;
            }
            if (!parseLocation(locationTag).isPrivate) return;
            const candidate = visibleCandidates.get(userId);
            if (candidate) {
                record(
                    userId,
                    candidate.locationTag,
                    candidate.worldName,
                    status,
                    'last_visible_api',
                    candidate.observedAt
                );
                visibleCandidates.delete(userId);
            }
            const local = localPresence.get(userId);
            if (local) {
                record(
                    userId,
                    local.locationTag,
                    local.worldName,
                    status,
                    'local_presence',
                    local.observedAt
                );
            }
            const observation = observations.get(userId);
            if (observation && observation.status !== status) {
                observations.set(userId, { ...observation, status });
            }
        }

        // Config initialization follows existing settings stores. Until it resolves,
        // the gate stays OFF. Only this Boolean crosses the persistence boundary.
        init().catch(() => {});
        return {
            lastVerifiedAtByInstance,
            onInstanceResponse,
            verifyInstances,
            enabled,
            observations,
            init,
            setEnabled,
            clear,
            invalidate,
            playerJoined,
            playerLeft,
            leaveLocation,
            onUserUpdate
        };
    }
);
