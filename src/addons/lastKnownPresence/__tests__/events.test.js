import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { reactive } from 'vue';

// Keep coordinators and the observation store real; replace native/database,
// network and unrelated UI effects at their boundaries.
const state = vi.hoisted(() => {
    const noop = () => {};
    const locationStore = {
        lastLocation: {},
        setLastLocation(value) {
            this.lastLocation = value;
        },
        setLastLocationLocation(value) {
            this.lastLocation.location = value;
        },
        setLastLocationDestination: noop,
        setLastLocationDestinationTime: noop
    };
    const userStore = {
        currentUser: { id: 'usr_me' },
        cachedUsers: new Map(),
        currentTravelers: new Map(),
        customUserTags: new Map(),
        state: { instancePlayerCount: new Map() },
        userDialog: { visible: false },
        setCachedUser(user) {
            userStore.cachedUsers.set(user.id, user);
        },
        applyUserLanguage: noop,
        applyUserDialogLocation: noop
    };
    const friendStore = {
        friends: new Map(),
        localFavoriteFriends: new Set(),
        pendingOfflineMap: new Map(),
        reindexSortedFriend: noop,
        deleteFriend(id) {
            this.friends.delete(id);
        }
    };
    const instanceStore = {
        cachedInstances: new Map(),
        updateCurrentInstanceWorld: noop,
        getCurrentInstanceUserList: noop,
        applyWorldDialogInstances: noop,
        applyGroupDialogInstances: noop,
        removeQueuedInstance: noop,
        addInstanceJoinHistory: noop
    };
    const photonStore = {
        photonLobby: new Map(),
        photonLobbyCurrent: new Map(),
        photonLobbyAvatars: new Map(),
        resetLocationPhotonState: noop
    };
    const vrStore = { updateVRLastLocation: noop };
    const gameLogStore = {
        state: { lastLocationAvatarList: new Map() },
        addGameLog: noop,
        resetLastMediaUrls: noop,
        clearNowPlaying: noop,
        addGamelogLocationToDatabase: noop
    };
    const empty = new Proxy({}, { get: () => noop });
    return {
        locationStore,
        userStore,
        friendStore,
        instanceStore,
        photonStore,
        vrStore,
        gameLogStore,
        empty,
        gameStore: { isGameRunning: true },
        database: new Proxy({}, { get: () => vi.fn().mockResolvedValue([]) }),
        socket: null
    };
});

vi.mock('../../../services/config', () => ({
    default: {
        getBool: vi.fn().mockResolvedValue(false),
        setBool: vi.fn().mockResolvedValue(undefined)
    }
}));
vi.mock('../../../services/database', () => ({ database: state.database }));
vi.mock('../../../services/watchState', () => ({
    watchState: { isLoggedIn: true, isFriendsLoaded: true }
}));
vi.mock('../../../services/request', () => ({
    request: vi.fn().mockResolvedValue({ ok: true, token: 'test' }),
    processBulk: vi.fn()
}));
vi.mock('../../../queries', () => ({ patchUserFromEvent: vi.fn() }));
vi.mock('../../../api', () => ({
    userRequest: { getUser: vi.fn().mockResolvedValue({}) },
    instanceRequest: { getInstance: vi.fn().mockResolvedValue({}) },
    friendRequest: {
        getFriendStatus: vi
            .fn()
            .mockResolvedValue({ json: { isFriend: false } })
    },
    groupRequest: {},
    queryRequest: {}
}));
vi.mock('../../../coordinators/searchIndexCoordinator', () => ({
    syncFriendSearchIndex: vi.fn(),
    removeFriendSearchIndex: vi.fn()
}));
vi.mock('../../../coordinators/userEventCoordinator', () => ({
    runHandleUserUpdateFlow: vi.fn()
}));
vi.mock('../../../coordinators/favoriteCoordinator', () => ({
    applyFavorite: vi.fn(),
    handleFavoriteDelete: vi.fn()
}));
vi.mock('../../../coordinators/friendPresenceCoordinator', () => ({
    runUpdateFriendFlow: vi.fn()
}));
vi.mock('../../../coordinators/friendRelationshipCoordinator', () => ({
    userOnFriend: vi.fn(),
    handleFriendAdd: vi.fn(),
    handleFriendDelete: vi.fn()
}));
vi.mock('../../../stores/user', () => ({
    useUserStore: () => state.userStore
}));
vi.mock('../../../stores/friend', () => ({
    useFriendStore: () => state.friendStore
}));
vi.mock('../../../stores/location', () => ({
    useLocationStore: () => state.locationStore
}));
vi.mock('../../../stores/instance', () => ({
    useInstanceStore: () => state.instanceStore
}));
vi.mock('../../../stores/photon', () => ({
    usePhotonStore: () => state.photonStore
}));
vi.mock('../../../stores/vr', () => ({ useVrStore: () => state.vrStore }));
vi.mock('../../../stores/gameLog', () => ({
    useGameLogStore: () => state.gameLogStore
}));
vi.mock('../../../stores/game', () => ({
    useGameStore: () => state.gameStore
}));
vi.mock('../../../stores/world', () => ({
    useWorldStore: () => ({
        cachedWorlds: new Map([['wrld_a', { name: 'Rooftop' }]])
    })
}));
vi.mock('../../../stores/settings/advanced', () => ({
    useAdvancedSettingsStore: () => ({ gameLogDisabled: false })
}));
vi.mock('../../../stores/settings/appearance', () => ({
    useAppearanceSettingsStore: () => ({ applyUserTrustLevel: vi.fn() })
}));
vi.mock('../../../stores/settings/general', () => ({
    useGeneralSettingsStore: () => state.empty
}));
vi.mock('../../../stores/moderation', () => ({
    useModerationStore: () => ({ getUserModerations: () => [] })
}));
vi.mock('../../../stores/modal', () => ({ useModalStore: () => state.empty }));
vi.mock('../../../stores/gallery', () => ({
    useGalleryStore: () => state.empty
}));
vi.mock('../../../stores/notification', () => ({
    useNotificationStore: () => state.empty
}));
vi.mock('../../../stores/sharedFeed', () => ({
    useSharedFeedStore: () => state.empty
}));
vi.mock('../../../stores/vrcx', () => ({ useVrcxStore: () => state.empty }));
vi.mock('../../../stores', () => ({
    useUserStore: () => state.userStore,
    useFriendStore: () => state.friendStore,
    useLocationStore: () => state.locationStore,
    useInstanceStore: () => state.instanceStore,
    useGalleryStore: () => state.empty,
    useGroupStore: () => state.empty,
    useNotificationStore: () => state.empty,
    useSharedFeedStore: () => state.empty,
    useUiStore: () => state.empty
}));

import { useLastKnownPresenceStore } from '../store';
import {
    addGameLogEvent,
    addGameLogEntry
} from '../../../coordinators/gameLogCoordinator';
import { runLastLocationResetFlow } from '../../../coordinators/locationCoordinator';
import { applyUser } from '../../../coordinators/userCoordinator';
import { initWebsocket, closeWebSocket } from '../../../services/websocket';

const tag = 'wrld_a:4582~friends(usr_owner)';
let store;
let friend;
function log(type, seconds, ...args) {
    addGameLogEvent(
        JSON.stringify([
            0,
            new Date(seconds * 1000).toISOString(),
            type,
            ...args
        ])
    );
}

beforeEach(async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    setActivePinia(createPinia());
    store = useLastKnownPresenceStore();
    await store.init();
    store.setEnabled(true);
    friend = reactive({
        id: 'usr_friend',
        displayName: 'Friend',
        status: 'busy',
        state: 'online',
        location: 'private',
        tags: [],
        languages: [],
        bio: '',
        bioLinks: [],
        badges: [],
        $lastFetch: 1000
    });
    state.userStore.cachedUsers.clear();
    state.userStore.cachedUsers.set(friend.id, friend);
    state.friendStore.friends.clear();
    state.friendStore.friends.set(friend.id, {
        id: friend.id,
        ref: friend,
        state: 'online'
    });
    state.locationStore.setLastLocation({
        location: tag,
        name: 'Rooftop',
        date: 1000,
        playerList: new Map(),
        friendList: new Map()
    });
    vi.stubGlobal(
        'WebSocket',
        class {
            constructor() {
                state.socket = this;
            }
            close() {}
        }
    );
});

afterEach(() => {
    closeWebSocket();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('real event integration', () => {
    it('snapshots a fresh physical join when we leave, before synthetic leave history', () => {
        log('player-joined', 2, 'Friend', friend.id);
        expect(store.observations.get(friend.id)?.locationTag).toBe(tag);
        log('location-destination', 46, 'wrld_c:12');
        expect(store.observations.get(friend.id)?.observedAt).toBe(46000);
        expect(state.locationStore.lastLocation.playerList.size).toBe(0);
        expect(friend.location).toBe('private');
    });

    it('actual player-left invalidates even if our list no longer contains the friend', () => {
        log('player-joined', 2, 'Friend', friend.id);
        expect(store.observations.size).toBe(1);
        state.locationStore.lastLocation.playerList.clear();
        log('player-left', 3, 'Friend', friend.id);
        expect(store.observations.size).toBe(0);
        runLastLocationResetFlow(new Date(46000).toISOString());
        expect(store.observations.size).toBe(0);
    });

    it('history replay does not capture observations or departure timestamps', () => {
        addGameLogEntry(
            {
                type: 'player-joined',
                dt: new Date(2000).toISOString(),
                userId: friend.id,
                displayName: 'Friend'
            },
            tag
        );
        runLastLocationResetFlow(new Date(46000).toISOString());
        expect(store.observations.size).toBe(0);
    });

    it('applyUser captures previous truth before in-place mutation; counts follow only API truth', () => {
        applyUser({ id: friend.id, status: 'active', location: tag });
        expect(store.observations.size).toBe(0);
        applyUser({ id: friend.id, status: 'ask me', location: 'private' });
        expect(store.observations.get(friend.id)).toMatchObject({
            locationTag: tag,
            worldName: 'Rooftop',
            source: 'last_visible_api'
        });
        expect(friend.location).toBe('private');
        expect(friend.$location.tag).toBe('private');
        expect(state.userStore.state.instancePlayerCount.size).toBe(0);
    });

    it.each(['friend-active', 'friend-offline', 'friend-delete'])(
        '%s clears immediately even without a user payload',
        async (type) => {
            log('player-joined', 2, 'Friend', friend.id);
            expect(store.observations.size).toBe(1);
            await initWebsocket();
            state.socket.onmessage({
                data: JSON.stringify({
                    type,
                    content: JSON.stringify({ userId: friend.id })
                })
            });
            expect(store.observations.size).toBe(0);
        }
    );

    it('disabled rejects real game-log and applyUser capture paths', () => {
        store.setEnabled(false);
        log('player-joined', 2, 'Friend', friend.id);
        applyUser({ id: friend.id, status: 'active', location: tag });
        applyUser({ id: friend.id, status: 'ask me', location: 'private' });
        log('location-destination', 46, 'wrld_c:12');
        expect(store.observations.size).toBe(0);
    });
});
