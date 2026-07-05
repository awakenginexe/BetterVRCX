import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import {
    AVAILABILITY_NOTIFY_DURATIONS,
    AVAILABILITY_NOTIFY_TRIGGERS
} from '../../shared/utils/friendAvailabilityNotify';

const mocks = vi.hoisted(() => ({
    configRepository: {
        getObject: vi.fn(),
        setObject: vi.fn()
    },
    notificationStore: {
        playNoty: vi.fn()
    }
}));

vi.mock('../../services/config', () => ({
    default: mocks.configRepository
}));

vi.mock('../notification', () => ({
    useNotificationStore: () => mocks.notificationStore
}));

import { useFriendAvailabilityNotifyStore } from '../friendAvailabilityNotify';

const NOW = Date.parse('2026-07-04T12:00:00.000Z');

function makeFriend(id = 'usr_1', displayName = 'Aki') {
    return {
        id,
        name: displayName,
        ref: {
            id,
            displayName
        }
    };
}

describe('useFriendAvailabilityNotifyStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        mocks.configRepository.getObject.mockResolvedValue({});
        mocks.configRepository.setObject.mockResolvedValue(undefined);
        mocks.notificationStore.playNoty.mockReset();
    });

    test('loads persisted watches into a map', async () => {
        mocks.configRepository.getObject.mockResolvedValue({
            usr_1: {
                userId: 'usr_1',
                displayName: 'Aki',
                duration: AVAILABILITY_NOTIFY_DURATIONS.FOREVER,
                triggers: { active: true, online: false },
                completed: { active: false, online: false },
                createdAt: NOW,
                updatedAt: NOW,
                expiresAt: null
            }
        });

        const store = useFriendAvailabilityNotifyStore();
        await store.loadWatches();

        expect(store.getWatchForUser('usr_1')).toMatchObject({
            userId: 'usr_1',
            displayName: 'Aki',
            duration: AVAILABILITY_NOTIFY_DURATIONS.FOREVER,
            triggers: { active: true, online: false }
        });
    });

    test('skips and persists cleanup for expired watches during load', async () => {
        mocks.configRepository.getObject.mockResolvedValue({
            usr_1: {
                userId: 'usr_1',
                displayName: 'Aki',
                duration: AVAILABILITY_NOTIFY_DURATIONS.SEVEN_DAYS,
                triggers: { active: true, online: true },
                completed: { active: false, online: false },
                createdAt: NOW - 8 * 24 * 60 * 60 * 1000,
                updatedAt: NOW - 8 * 24 * 60 * 60 * 1000,
                expiresAt: NOW - 1000
            }
        });

        const store = useFriendAvailabilityNotifyStore();
        await store.loadWatches({ now: NOW });

        expect(store.getWatchForUser('usr_1')).toBeNull();
        expect(mocks.configRepository.setObject).toHaveBeenCalledWith(
            'VRCX_friendAvailabilityNotifyWatches',
            {}
        );
    });

    test('opens the edit dialog with friend identity and existing watch', async () => {
        const store = useFriendAvailabilityNotifyStore();
        await store.saveWatch(makeFriend(), {
            duration: AVAILABILITY_NOTIFY_DURATIONS.SEVEN_DAYS,
            triggers: { active: false, online: true },
            now: NOW
        });

        store.openDialog(makeFriend());

        expect(store.dialog.open).toBe(true);
        expect(store.dialog.userId).toBe('usr_1');
        expect(store.dialog.displayName).toBe('Aki');
        expect(store.dialog.watch).toMatchObject({
            duration: AVAILABILITY_NOTIFY_DURATIONS.SEVEN_DAYS,
            triggers: { active: false, online: true }
        });
    });

    test('dispatches a desktop/TTS-compatible notification on matching transition', async () => {
        const store = useFriendAvailabilityNotifyStore();
        await store.saveWatch(makeFriend(), {
            duration: AVAILABILITY_NOTIFY_DURATIONS.ONCE,
            triggers: { active: false, online: true },
            now: NOW
        });

        await store.handlePresenceTransition({
            friend: makeFriend(),
            previousState: 'active',
            newState: 'online',
            now: NOW + 1000
        });

        expect(mocks.notificationStore.playNoty).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'FriendAvailabilityOnline',
                userId: 'usr_1',
                displayName: 'Aki',
                availabilityState: AVAILABILITY_NOTIFY_TRIGGERS.ONLINE
            })
        );
        expect(store.getWatchForUser('usr_1')).toBeNull();
    });

    test('saves changed one-shot watch after active fires but online remains pending', async () => {
        const store = useFriendAvailabilityNotifyStore();
        await store.saveWatch(makeFriend(), {
            duration: AVAILABILITY_NOTIFY_DURATIONS.ONCE,
            triggers: { active: true, online: true },
            now: NOW
        });

        await store.handlePresenceTransition({
            friend: makeFriend(),
            previousState: 'offline',
            newState: 'active',
            now: NOW + 1000
        });

        expect(store.getWatchForUser('usr_1')).toMatchObject({
            completed: { active: true, online: false }
        });
        expect(mocks.configRepository.setObject).toHaveBeenCalled();
    });
});
