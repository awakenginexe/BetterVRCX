import { defineStore } from 'pinia';
import { reactive } from 'vue';

import {
    AVAILABILITY_NOTIFY_DURATIONS,
    AVAILABILITY_NOTIFY_TRIGGERS,
    applyAvailabilityTransition,
    createAvailabilityWatch,
    isAvailabilityWatchExpired,
    normalizeAvailabilityWatch
} from '../shared/utils/friendAvailabilityNotify';
import { useNotificationStore } from './notification';

import configRepository from '../services/config';

const STORAGE_KEY = 'VRCX_friendAvailabilityNotifyWatches';

function toPlainWatch(watch) {
    const normalized = normalizeAvailabilityWatch(watch);
    return {
        ...normalized,
        triggers: { ...normalized.triggers },
        completed: { ...normalized.completed }
    };
}

function serializeWatches(watches) {
    const data = {};
    for (const [userId, watch] of watches.entries()) {
        data[userId] = toPlainWatch(watch);
    }
    return data;
}

function resolveFriendIdentity(friend) {
    if (!friend) {
        return null;
    }
    if (typeof friend === 'string') {
        return { userId: friend, displayName: '' };
    }
    const ref = friend.ref || friend;
    const userId = friend.id || ref.id;
    if (!userId) {
        return null;
    }
    return {
        userId,
        displayName: ref.displayName || friend.name || friend.displayName || ''
    };
}

function getNotificationType(trigger) {
    return trigger === AVAILABILITY_NOTIFY_TRIGGERS.ACTIVE
        ? 'FriendAvailabilityActive'
        : 'FriendAvailabilityOnline';
}

export const useFriendAvailabilityNotifyStore = defineStore(
    'FriendAvailabilityNotify',
    () => {
        const watches = reactive(new Map());
        const dialog = reactive({
            open: false,
            userId: '',
            displayName: '',
            watch: null
        });
        let watchesLoaded = false;
        let loadPromise = null;

        async function loadWatches({ now = Date.now() } = {}) {
            const saved = await configRepository.getObject(STORAGE_KEY, {});
            let didCleanup = false;
            watches.clear();
            if (!saved || typeof saved !== 'object') {
                watchesLoaded = true;
                return;
            }
            for (const [userId, watch] of Object.entries(saved)) {
                const normalized = normalizeAvailabilityWatch({
                    ...watch,
                    userId
                });
                if (isAvailabilityWatchExpired(normalized, now)) {
                    didCleanup = true;
                    continue;
                }
                if (normalized.userId) {
                    watches.set(normalized.userId, normalized);
                }
            }
            watchesLoaded = true;
            if (didCleanup) {
                await persistWatches();
            }
        }

        function ensureWatchesLoaded() {
            if (watchesLoaded) {
                return Promise.resolve();
            }
            if (!loadPromise) {
                loadPromise = loadWatches().finally(() => {
                    loadPromise = null;
                });
            }
            return loadPromise;
        }

        async function persistWatches() {
            await configRepository.setObject(
                STORAGE_KEY,
                serializeWatches(watches)
            );
        }

        function getWatchForUser(userId) {
            const watch = watches.get(userId);
            return watch ? toPlainWatch(watch) : null;
        }

        async function saveWatch(
            friend,
            {
                duration = AVAILABILITY_NOTIFY_DURATIONS.ONCE,
                triggers = {
                    [AVAILABILITY_NOTIFY_TRIGGERS.ACTIVE]: true,
                    [AVAILABILITY_NOTIFY_TRIGGERS.ONLINE]: true
                },
                now = Date.now()
            } = {}
        ) {
            await ensureWatchesLoaded();
            const identity = resolveFriendIdentity(friend);
            if (!identity) {
                return null;
            }
            const watch = createAvailabilityWatch({
                userId: identity.userId,
                displayName: identity.displayName,
                duration,
                triggers,
                now
            });
            watches.set(identity.userId, watch);
            await persistWatches();
            return toPlainWatch(watch);
        }

        async function removeWatch(userId) {
            await ensureWatchesLoaded();
            if (!watches.has(userId)) {
                return;
            }
            watches.delete(userId);
            await persistWatches();
        }

        function openDialog(friend) {
            const identity = resolveFriendIdentity(friend);
            if (!identity) {
                return;
            }
            dialog.open = true;
            dialog.userId = identity.userId;
            dialog.displayName = identity.displayName;
            dialog.watch = getWatchForUser(identity.userId);
            ensureWatchesLoaded().then(() => {
                if (dialog.open && dialog.userId === identity.userId) {
                    dialog.watch = getWatchForUser(identity.userId);
                }
            });
        }

        function closeDialog() {
            dialog.open = false;
            dialog.userId = '';
            dialog.displayName = '';
            dialog.watch = null;
        }

        function dispatchAvailabilityNotification(notification, displayName) {
            const notificationStore = useNotificationStore();
            notificationStore.playNoty({
                type: getNotificationType(notification.trigger),
                created_at: new Date(notification.createdAt).toJSON(),
                userId: notification.userId,
                displayName:
                    displayName ||
                    notification.displayName ||
                    notification.userId,
                availabilityState: notification.trigger
            });
        }

        async function handlePresenceTransition({
            friend,
            previousState,
            newState,
            now = Date.now()
        } = {}) {
            await ensureWatchesLoaded();
            const identity = resolveFriendIdentity(friend);
            if (!identity) {
                return null;
            }
            const currentWatch = watches.get(identity.userId);
            if (!currentWatch) {
                return null;
            }
            const result = applyAvailabilityTransition(
                {
                    ...currentWatch,
                    displayName:
                        currentWatch.displayName || identity.displayName
                },
                { previousState, newState, now }
            );

            if (result.notification) {
                dispatchAvailabilityNotification(
                    result.notification,
                    identity.displayName
                );
            }

            if (result.removed) {
                watches.delete(identity.userId);
                await persistWatches();
            } else if (result.changed && result.watch) {
                watches.set(identity.userId, result.watch);
                await persistWatches();
            }

            return result;
        }

        return {
            watches,
            dialog,
            loadWatches,
            persistWatches,
            saveWatch,
            removeWatch,
            openDialog,
            closeDialog,
            getWatchForUser,
            handlePresenceTransition
        };
    }
);
