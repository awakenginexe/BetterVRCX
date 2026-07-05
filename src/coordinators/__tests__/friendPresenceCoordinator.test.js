import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    friendStore: {
        friends: new Map(),
        localFavoriteFriends: new Set(),
        pendingOfflineMap: new Map(),
        pendingOfflineDelay: 1000,
        updateOnlineFriendCounter: vi.fn(),
        reindexSortedFriend: vi.fn()
    },
    feedStore: {
        addFeedEntry: vi.fn()
    },
    notificationStore: {
        queueFeedNoty: vi.fn()
    },
    sharedFeedStore: {
        addEntry: vi.fn()
    },
    userStore: {
        cachedUsers: new Map()
    },
    availabilityNotifyStore: {
        handlePresenceTransition: vi.fn().mockResolvedValue(null)
    },
    database: {
        addOnlineOfflineToDatabase: vi.fn()
    }
}));

vi.mock('../../stores/feed', () => ({
    useFeedStore: () => mocks.feedStore
}));

vi.mock('../../stores/friend', () => ({
    useFriendStore: () => mocks.friendStore
}));

vi.mock('../../stores/friendAvailabilityNotify', () => ({
    useFriendAvailabilityNotifyStore: () => mocks.availabilityNotifyStore
}));

vi.mock('../../stores/notification', () => ({
    useNotificationStore: () => mocks.notificationStore
}));

vi.mock('../../stores/sharedFeed', () => ({
    useSharedFeedStore: () => mocks.sharedFeedStore
}));

vi.mock('../../stores/user', () => ({
    useUserStore: () => mocks.userStore
}));

vi.mock('../../shared/utils', () => ({
    getGroupName: vi.fn().mockResolvedValue(''),
    getWorldName: vi.fn().mockResolvedValue(''),
    isRealInstance: vi.fn(() => false)
}));

vi.mock('../../services/appConfig', () => ({
    AppDebug: { debugFriendState: false }
}));

vi.mock('../../services/database', () => ({
    database: mocks.database
}));

vi.mock('../../api', () => ({
    userRequest: {
        getUser: vi.fn()
    }
}));

vi.mock('../searchIndexCoordinator', () => ({
    syncFriendSearchIndex: vi.fn()
}));

vi.mock('../../services/watchState', () => ({
    watchState: { isFriendsLoaded: true }
}));

import { runUpdateFriendDelayedCheckFlow } from '../friendPresenceCoordinator';

const NOW = Date.parse('2026-07-04T12:00:00.000Z');

function makeFriend(state = 'offline') {
    return {
        id: 'usr_1',
        state,
        name: 'Aki',
        ref: {
            id: 'usr_1',
            displayName: 'Aki',
            location: '',
            $location_at: NOW
        }
    };
}

describe('friendPresenceCoordinator availability notifications', () => {
    beforeEach(() => {
        mocks.friendStore.friends = new Map();
        mocks.friendStore.localFavoriteFriends = new Set();
        mocks.friendStore.pendingOfflineMap = new Map();
        mocks.userStore.cachedUsers = new Map();
        vi.clearAllMocks();
    });

    test('notifies availability watcher after a confirmed state transition', async () => {
        const friend = makeFriend('offline');
        mocks.friendStore.friends.set(friend.id, friend);

        await runUpdateFriendDelayedCheckFlow(friend, 'active', '', NOW, {
            now: () => NOW + 1000,
            nowIso: () => new Date(NOW + 1000).toJSON()
        });

        expect(
            mocks.availabilityNotifyStore.handlePresenceTransition
        ).toHaveBeenCalledWith({
            friend,
            previousState: 'offline',
            newState: 'active',
            now: NOW + 1000
        });
    });
});
