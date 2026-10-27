import { ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { database } from '../services/database';
import configRepository from '../services/config';
import { watchState } from '../services/watchState';
import { observedAvatarRequester } from '../services/observedAvatarRequest';
import {
    lookupAvatars,
    selectAvatarWithoutConfirmation
} from '../coordinators/avatarCoordinator';
import { avatarRequest } from '../api';
import { useUserStore } from './user';
import { useFriendStore } from './friend';
import { useAdvancedSettingsStore } from './settings/advanced';

const avatarIdPattern = /^avtr_[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const userIdPattern = /^usr_[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const time = (value) =>
    value && Number.isFinite(Date.parse(value))
        ? new Date(value).toISOString()
        : null;
const earliest = (a, b) => (!a ? b : !b ? a : a < b ? a : b);
const latest = (a, b) => (!a ? b : !b ? a : a > b ? a : b);

function displayMetadata(input) {
    const metadata = {};
    for (const key of [
        'name',
        'authorId',
        'authorName',
        'description',
        'imageUrl',
        'thumbnailImageUrl',
        'releaseStatus'
    ]) {
        if (typeof input?.[key] !== 'string' || !input[key]) continue;
        if (key.endsWith('Url')) {
            try {
                if (!['https:', 'http:'].includes(new URL(input[key]).protocol))
                    continue;
            } catch {
                continue;
            }
        }
        metadata[key] = input[key];
    }
    return metadata;
}

export const useFoundAvatarsStore = defineStore('FoundAvatars', () => {
    const userStore = useUserStore();
    const friendStore = useFriendStore();
    const settings = useAdvancedSettingsStore();
    const entries = ref([]);
    const loading = ref(false);
    const error = ref(false);
    const importState = ref({ status: 'idle' });
    const autoLookupFriends = ref(true);
    let generation = 0;
    let ready = Promise.resolve(false);
    let writes = Promise.resolve();
    let pending = new Map();
    let policyGeneration = 0;

    const account = () =>
        watchState.isLoggedIn ? userStore.currentUser.id : '';
    const isCurrent = (id, epoch) => account() === id && epoch === generation;
    const settingKey = (id) => `VRCX_foundAvatarsAutoLookupFriends_${id}`;
    const find = (id) => entries.value.find((entry) => entry.id === id);

    function save(id, entry, epoch) {
        const snapshot = JSON.parse(JSON.stringify(entry));
        writes = writes
            .catch(() => {})
            .then(async () => {
                if (isCurrent(id, epoch))
                    await database.saveFoundAvatar(id, snapshot);
            });
        return writes.catch((reason) => {
            if (isCurrent(id, epoch)) error.value = true;
            console.error('Could not save Found Avatars history', reason);
        });
    }

    async function load() {
        const epoch = ++generation;
        const id = account();
        entries.value = [];
        error.value = false;
        importState.value = { status: 'idle' };
        autoLookupFriends.value = true;
        pending = new Map();
        policyGeneration++;
        loading.value = Boolean(id);
        if (!id) return false;
        try {
            const [rows, enabled] = await Promise.all([
                database.getFoundAvatars(id),
                configRepository.getBool(settingKey(id), true)
            ]);
            if (!isCurrent(id, epoch)) return false;
            entries.value = rows.map((row) => ({
                ...row,
                lookupState:
                    row.lookupState === 'searching'
                        ? 'not_searched'
                        : row.lookupState
            }));
            autoLookupFriends.value = enabled;
            return true;
        } catch (reason) {
            if (isCurrent(id, epoch)) error.value = true;
            console.error('Could not load Found Avatars history', reason);
            return false;
        } finally {
            if (isCurrent(id, epoch)) loading.value = false;
        }
    }

    watch(
        [account],
        () => {
            ready = load();
            const id = account();
            const epoch = generation;
            void ready.then((loaded) => {
                if (loaded && isCurrent(id, epoch))
                    void recordObservation(
                        {
                            avatarId: userStore.currentUser.currentAvatar,
                            observedAt: new Date().toISOString(),
                            wearerId: id,
                            displayName: userStore.currentUser.displayName,
                            source: 'self'
                        },
                        { allowLookup: false }
                    );
            });
        },
        { immediate: true, flush: 'sync' }
    );

    async function recordObservation(observation, { allowLookup = true } = {}) {
        const id = account();
        const epoch = generation;
        if (
            !id ||
            !avatarIdPattern.test(observation?.avatarId) ||
            !(await ready) ||
            !isCurrent(id, epoch)
        )
            return;
        const avatarId = observation.avatarId.toLowerCase();
        const cached =
            observation.metadata ||
            (await database.getCachedAvatarById(avatarId));
        if (!isCurrent(id, epoch)) return;
        const first = observation.firstSeenUnknown
            ? null
            : time(observation.observedAt);
        const last =
            time(observation.lastSeenAt) || time(observation.observedAt);
        const wearerId = userIdPattern.test(observation.wearerId)
            ? observation.wearerId.toLowerCase()
            : null;
        let entry = find(avatarId);
        const initial = !entry;
        if (!entry) {
            entries.value.push({
                id: avatarId,
                firstSeenAt: null,
                lastSeenAt: null,
                firstWearerId: null,
                source: observation.source,
                importedAt: new Date().toISOString(),
                metadata: {},
                wearers: [],
                lookupState: 'not_searched',
                publicVerifiedAt: null,
                lookedUpAt: null
            });
            entry = find(avatarId);
        }
        if (
            initial ||
            (first && (!entry.firstSeenAt || first < entry.firstSeenAt))
        ) {
            entry.firstWearerId = first ? wearerId : null;
            entry.source = observation.source;
        }
        entry.firstSeenAt = earliest(entry.firstSeenAt, first);
        entry.lastSeenAt = latest(entry.lastSeenAt, last);
        Object.assign(entry.metadata, displayMetadata(cached));
        if (wearerId) {
            let wearer = entry.wearers.find((item) => item.userId === wearerId);
            if (!wearer) {
                entry.wearers.push({
                    userId: wearerId,
                    displayName: observation.displayName || '',
                    firstSeenAt: first,
                    lastSeenAt: last
                });
            } else {
                if (
                    (!wearer.lastSeenAt ||
                        (last && last >= wearer.lastSeenAt)) &&
                    observation.displayName
                )
                    wearer.displayName = observation.displayName;
                wearer.firstSeenAt = earliest(wearer.firstSeenAt, first);
                wearer.lastSeenAt = latest(wearer.lastSeenAt, last);
            }
        }
        await save(id, entry, epoch);
        if (
            isCurrent(id, epoch) &&
            allowLookup &&
            wearerId &&
            !entry.metadata.name &&
            entry.lookupState === 'not_searched'
        )
            void lookupAvatar(avatarId, wearerId);
    }

    async function setAutoLookupFriends(enabled) {
        const id = account();
        const epoch = generation;
        if (!(await ready) || !isCurrent(id, epoch)) return;
        autoLookupFriends.value = Boolean(enabled);
        policyGeneration++;
        try {
            await configRepository.setBool(
                settingKey(id),
                autoLookupFriends.value
            );
        } catch (reason) {
            if (isCurrent(id, epoch)) error.value = true;
            console.error('Could not save Found Avatars setting', reason);
        }
    }

    async function lookupAvatar(avatarId, automaticWearerId = null) {
        const id = account();
        const epoch = generation;
        const policy = policyGeneration;
        if (
            !avatarIdPattern.test(avatarId) ||
            !(await ready) ||
            !isCurrent(id, epoch)
        )
            return;
        avatarId = avatarId.toLowerCase();
        const entry = find(avatarId);
        const eligible = () =>
            isCurrent(id, epoch) &&
            (!automaticWearerId ||
                (autoLookupFriends.value &&
                    policy === policyGeneration &&
                    watchState.isFriendsLoaded &&
                    friendStore.friends.has(automaticWearerId)));
        if (!entry || !eligible()) return;
        if (pending.has(avatarId)) return pending.get(avatarId);
        entry.publicVerifiedAt = null;
        if (!settings.avatarRemoteDatabase) {
            entry.lookupState = 'disabled';
            await save(id, entry, epoch);
            return;
        }
        const requests = pending;
        entry.lookupState = 'searching';
        const operation = (async () => {
            let state;
            let officialAvatar;
            const result = await observedAvatarRequester.run(
                async () => ({
                    json: await lookupAvatars('search', avatarId, {
                        isCurrent: eligible,
                        onOfficialAvatar: (avatar) => {
                            officialAvatar = avatar;
                        },
                        onState: (value) => {
                            state = value;
                        }
                    })
                }),
                () => !eligible()
            );
            if (!isCurrent(id, epoch)) return;
            entry.publicVerifiedAt = null;
            if (!eligible() || result.status === 'cancelled') {
                entry.lookupState = 'not_searched';
                return;
            }
            const avatar = result.json?.get(avatarId);
            if (
                result.status === 'ok' &&
                avatar?.id?.toLowerCase() === avatarId
            ) {
                Object.assign(entry.metadata, displayMetadata(avatar));
                if (
                    officialAvatar?.id === avatarId &&
                    officialAvatar.releaseStatus === 'public'
                )
                    entry.publicVerifiedAt = new Date().toISOString();
                entry.lookupState = state?.failedProviders?.length
                    ? 'partial'
                    : 'found';
            } else {
                entry.lookupState =
                    result.status !== 'ok' ||
                    state?.failedProviders?.length ||
                    !state?.attemptedProviders?.length
                        ? 'unavailable'
                        : 'not_found';
            }
            entry.lookedUpAt = new Date().toISOString();
            await save(id, entry, epoch);
        })()
            .catch((reason) => {
                if (isCurrent(id, epoch)) {
                    entry.lookupState = 'unavailable';
                    entry.publicVerifiedAt = null;
                    error.value = true;
                }
                console.error('Found Avatars lookup failed', reason);
            })
            .finally(() => {
                requests.delete(avatarId);
            });
        requests.set(avatarId, operation);
        return operation;
    }

    async function changeIntoAvatar(avatarId) {
        const id = account();
        const epoch = generation;
        if (
            !avatarIdPattern.test(avatarId) ||
            !(await ready) ||
            !isCurrent(id, epoch)
        )
            return 'unavailable';
        avatarId = avatarId.toLowerCase();
        const entry = find(avatarId);
        if (!entry) return 'unavailable';
        entry.publicVerifiedAt = null;
        const result = await observedAvatarRequester.run(
            () => avatarRequest.getAvatar({ avatarId }),
            () => !isCurrent(id, epoch)
        );
        if (!isCurrent(id, epoch)) return 'unavailable';
        entry.publicVerifiedAt = null;
        let status = 'unavailable';
        if (result.status === 'ok' && result.json?.id === avatarId) {
            if (result.json.releaseStatus === 'private') {
                entry.metadata.releaseStatus = 'private';
                status = 'not_public';
            } else if (result.json.releaseStatus === 'public') {
                entry.metadata.releaseStatus = 'public';
                try {
                    await selectAvatarWithoutConfirmation(avatarId);
                    if (!isCurrent(id, epoch)) return 'unavailable';
                    entry.publicVerifiedAt = new Date().toISOString();
                    status = 'selected';
                } catch {
                    entry.publicVerifiedAt = null;
                }
            }
        }
        await save(id, entry, epoch);
        return status;
    }

    async function importHistory() {
        const id = account();
        const epoch = generation;
        if (
            !(await ready) ||
            !isCurrent(id, epoch) ||
            importState.value.status === 'loading'
        )
            return;
        importState.value = { status: 'loading' };
        try {
            const history = await database.getFoundAvatarHistory(id);
            if (!isCurrent(id, epoch)) return;
            for (const row of history) {
                await recordObservation(
                    {
                        ...row,
                        observedAt: row.lastSeenAt,
                        firstSeenUnknown: true,
                        wearerId: id,
                        displayName: userStore.currentUser.displayName,
                        source: 'history'
                    },
                    { allowLookup: false }
                );
                if (!isCurrent(id, epoch)) return;
            }
            if (typeof AppApi?.GetFoundAvatarLogData !== 'function')
                throw new Error(
                    'Found Avatars log import requires the updated native app'
                );
            const result = JSON.parse(await AppApi.GetFoundAvatarLogData(id));
            if (!isCurrent(id, epoch)) return;
            if (!Array.isArray(result.observations))
                throw new Error('Invalid Found Avatars log response');
            for (const observation of result.observations) {
                await recordObservation(
                    {
                        avatarId: observation.avatarId,
                        observedAt: observation.firstSeenAt,
                        lastSeenAt: observation.lastSeenAt,
                        source: 'log'
                    },
                    { allowLookup: false }
                );
                if (!isCurrent(id, epoch)) return;
            }
            importState.value = {
                status: result.errors ? 'partial' : 'complete',
                filesRead: result.filesRead,
                filesSkipped: result.filesSkipped,
                errors: result.errors
            };
        } catch (reason) {
            if (isCurrent(id, epoch)) importState.value = { status: 'error' };
            console.error('Could not import Found Avatars history', reason);
        }
    }

    return {
        entries,
        loading,
        error,
        importState,
        autoLookupFriends,
        recordObservation,
        importHistory,
        lookupAvatar,
        changeIntoAvatar,
        setAutoLookupFriends
    };
});
