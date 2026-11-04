import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    state: { isLoggedIn: true, isFriendsLoaded: true },
    request: vi.fn(),
    friend: { refreshFriends: vi.fn() },
    notification: { refreshNotifications: vi.fn() },
    user: { currentUser: { id: 'usr_a' }, cachedUsers: new Map() },
    economy: { handleEvent: vi.fn() },
    timers: [],
    sockets: []
}));
vi.mock('../watchState', () => ({ watchState: mocks.state }));
vi.mock('../request', () => ({ request: mocks.request }));
vi.mock('../appConfig', () => ({
    AppDebug: { websocketDomain: 'wss://example.test' }
}));
vi.mock('worker-timers', () => ({ setTimeout: (fn) => mocks.timers.push(fn) }));
vi.mock('vue-sonner', () => ({ toast: { dismiss: vi.fn(), error: vi.fn() } }));
vi.mock('../../stores', () => ({
    useUserStore: () => mocks.user,
    useFriendStore: () => mocks.friend,
    useNotificationStore: () => mocks.notification,
    useGalleryStore: () => ({}),
    useGroupStore: () => ({}),
    useInstanceStore: () => ({}),
    useLocationStore: () => ({}),
    useSharedFeedStore: () => ({}),
    useUiStore: () => ({})
}));
vi.mock('../../stores/economy', () => ({
    useEconomyStore: () => mocks.economy
}));
vi.mock('../../addons/lastKnownPresence/store', () => ({
    useLastKnownPresenceStore: () => ({})
}));
vi.mock('../../coordinators/userCoordinator', () => ({
    applyUser: vi.fn(),
    applyCurrentUser: vi.fn()
}));
vi.mock('../../coordinators/groupCoordinator', () => ({
    onGroupLeft: vi.fn(),
    applyGroup: vi.fn(),
    getGroupDialogGroup: vi.fn(),
    handleGroupMember: vi.fn()
}));
vi.mock('../../coordinators/friendRelationshipCoordinator', () => ({
    handleFriendAdd: vi.fn(),
    handleFriendDelete: vi.fn()
}));
vi.mock('../../coordinators/friendPresenceCoordinator', () => ({
    runUpdateFriendFlow: vi.fn()
}));
vi.mock('../../coordinators/locationCoordinator', () => ({
    runSetCurrentUserLocationFlow: vi.fn()
}));
vi.mock('../../shared/utils', () => ({ parseLocation: vi.fn() }));
vi.mock('../../api', () => ({ groupRequest: {} }));

describe('websocket lifecycle', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        mocks.sockets.length = 0;
        mocks.timers.length = 0;
        mocks.state.isLoggedIn = true;
        mocks.state.isFriendsLoaded = true;
        mocks.request.mockResolvedValue({ ok: true, token: 'token' });
        globalThis.WebSocket = class {
            close = vi.fn();
            constructor() {
                mocks.sockets.push(this);
            }
        };
    });

    it('reconciles friends and notifications once after abnormal reconnect', async () => {
        const ws = await import('../websocket');
        await ws.initWebsocket();
        mocks.sockets[0].onopen();
        expect(mocks.friend.refreshFriends).not.toHaveBeenCalled();
        mocks.sockets[0].onclose({ code: 1006, reason: 'network' });
        await mocks.timers[0]();
        await Promise.resolve();
        mocks.sockets[1].onopen();
        expect(mocks.friend.refreshFriends).toHaveBeenCalledTimes(1);
        expect(mocks.notification.refreshNotifications).toHaveBeenCalledTimes(
            1
        );
    });

    it('clears all handlers and telemetry for deliberate closure without scheduling a reconnect', async () => {
        const ws = await import('../websocket');
        await ws.initWebsocket();
        const socket = mocks.sockets[0];
        socket.onopen();
        ws.closeWebSocket();
        expect(ws.wsState.connected).toBe(false);
        expect(socket.onclose).toBeNull();
        expect(socket.onmessage).toBeNull();
        expect(socket.onerror).toBeNull();
        expect(socket.onopen).toBeNull();
        expect(mocks.timers).toHaveLength(0);
    });

    it('does not open a socket from an auth response that completed after logout', async () => {
        let resolve;
        mocks.request.mockReturnValue(
            new Promise((done) => {
                resolve = done;
            })
        );
        const ws = await import('../websocket');
        const pending = ws.initWebsocket();
        ws.closeWebSocket();
        mocks.state.isLoggedIn = false;
        resolve({ ok: true, token: 'old' });
        await pending;
        expect(mocks.sockets).toHaveLength(0);
    });

    it('routes economy messages to account-scoped synchronization', async () => {
        const ws = await import('../websocket');
        await ws.initWebsocket();
        mocks.sockets[0].onmessage({
            data: JSON.stringify({
                type: 'economy-update',
                content: JSON.stringify({ walletBalance: 50 })
            })
        });
        expect(mocks.economy.handleEvent).toHaveBeenCalledWith({
            walletBalance: 50
        });
    });
});
