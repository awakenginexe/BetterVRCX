import { expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
const verify = vi.hoisted(() => vi.fn().mockResolvedValue());
vi.mock('../../addons/lastKnownPresence/store', () => ({
    useLastKnownPresenceStore: () => ({ verifyInstances: verify })
}));
vi.mock('../../services/watchState', () => ({
    watchState: { isLoggedIn: true, isFriendsLoaded: false }
}));
vi.mock('worker-timers', () => ({ setTimeout: vi.fn() }));
vi.mock('../../api', () => ({
    groupRequest: {},
    instanceRequest: { getInstance: vi.fn() }
}));
vi.mock('../../services/database', () => ({ database: {} }));
vi.mock('../auth', () => ({ useAuthStore: () => ({}) }));
vi.mock('../user', () => ({ useUserStore: () => ({}) }));
vi.mock('../friend', () => ({
    useFriendStore: () => ({ setIsRefreshFriendsLoading: () => {} })
}));
vi.mock('../vrcx', () => ({
    useVrcxStore: () => ({ setIpcEnabled: () => {} })
}));
vi.mock('../settings/discordPresence', () => ({
    useDiscordPresenceSettingsStore: () => ({})
}));
vi.mock('../vrcxUpdater', () => ({ useVRCXUpdaterStore: () => ({}) }));
vi.mock('../vr', () => ({ useVrStore: () => ({}) }));
vi.mock('../../coordinators/friendSyncCoordinator', () => ({
    runRefreshFriendsListFlow: vi.fn()
}));
vi.mock('../../coordinators/gameCoordinator', () => ({
    runUpdateIsGameRunningFlow: vi.fn()
}));
vi.mock('../../coordinators/gameLogCoordinator', () => ({
    addGameLogEvent: vi.fn()
}));
vi.mock('../../coordinators/moderationCoordinator', () => ({
    runRefreshPlayerModerationsFlow: vi.fn()
}));
vi.mock('../../coordinators/vrcxCoordinator', () => ({
    clearVRCXCache: vi.fn()
}));
vi.mock('../../coordinators/groupCoordinator', () => ({
    handleGroupUserInstances: vi.fn()
}));
vi.mock('../../coordinators/userCoordinator', () => ({
    getCurrentUser: vi.fn(),
    updateAutoStateChange: vi.fn()
}));
import { useUpdateLoopStore } from '../updateLoop';
it('runs presence verification at the existing five minute cadence', async () => {
    vi.stubGlobal('AppApi', { CheckGameRunning: vi.fn() });
    vi.stubGlobal('LINUX', false);
    setActivePinia(createPinia());
    const store = useUpdateLoopStore();
    for (let i = 0; i < 299; i++) await store.updateLoop();
    expect(verify).not.toHaveBeenCalled();
    await store.updateLoop();
    expect(verify).toHaveBeenCalledTimes(1);
});
