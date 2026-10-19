import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';

const mocks = vi.hoisted(() => ({
    getClientConfig: vi.fn(),
    saveClientConfig: vi.fn(),
    confirm: vi.fn(),
    getProfileEffects: vi.fn(),
    getIconFrames: vi.fn(),
    getNameplateEffects: vi.fn()
}));

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key) => key })
}));

vi.mock('../../api', () => ({
    instanceRequest: {},
    userRequest: {
        getClientConfig: (...args) => mocks.getClientConfig(...args),
        saveClientConfig: (...args) => mocks.saveClientConfig(...args)
    },
    cosmeticsRequest: {
        getProfileEffects: (...args) => mocks.getProfileEffects(...args),
        getIconFrames: (...args) => mocks.getIconFrames(...args),
        getNameplateEffects: (...args) => mocks.getNameplateEffects(...args)
    }
}));

vi.mock('../../services/watchState', async () => {
    const { reactive } = await import('vue');
    return {
        watchState: reactive({
            isLoggedIn: false,
            isFriendsLoaded: false,
            isFavoritesLoaded: false
        })
    };
});

vi.mock('../../services/appConfig', () => ({
    AppDebug: { debugVrcPlus: false }
}));

vi.mock('../../services/database', () => ({
    database: {}
}));

vi.mock('../../shared/utils', () => ({
    compareByCreatedAt: vi.fn(),
    compareByDisplayName: vi.fn(),
    compareByLocationAt: vi.fn(),
    compareByName: vi.fn(),
    compareByUpdatedAt: vi.fn(),
    isRealInstance: vi.fn(() => false),
    parseLocation: vi.fn(() => ({})),
    replaceBioSymbols: vi.fn((value) => value)
}));

vi.mock('../../coordinators/memoCoordinator', () => ({
    getAllUserMemos: vi.fn()
}));

vi.mock('../../coordinators/locationCoordinator', () => ({
    runUpdateCurrentUserLocationFlow: vi.fn()
}));

vi.mock('../../coordinators/searchIndexCoordinator', () => ({
    syncFriendSearchIndex: vi.fn()
}));

vi.mock('../settings/appearance', () => ({
    useAppearanceSettingsStore: () => ({ instanceUsersSortAlphabetical: false })
}));

vi.mock('../friend', () => ({
    useFriendStore: () => ({ friends: new Map() })
}));

vi.mock('../instance', () => ({
    useInstanceStore: () => ({ cachedInstances: new Map() })
}));

vi.mock('../location', () => ({
    useLocationStore: () => ({
        lastLocation: {
            location: '',
            friendList: new Map(),
            playerList: new Map()
        }
    })
}));

vi.mock('../modal', () => ({
    useModalStore: () => ({ confirm: mocks.confirm })
}));

vi.mock('../ui', () => ({
    useUiStore: () => ({ clearDialogCrumbs: vi.fn() })
}));

async function flushPromises() {
    await Promise.resolve();
    await Promise.resolve();
}

describe('user cosmetic indexes', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        setActivePinia(createPinia());
        const { watchState } = await import('../../services/watchState');
        watchState.isLoggedIn = false;
        mocks.getClientConfig.mockResolvedValue({
            json: { accessReduceDecorAnim: true }
        });
        mocks.getProfileEffects.mockResolvedValue({
            json: [{ id: 'cos_profile', metadata: { assets: [] } }]
        });
        mocks.getIconFrames.mockResolvedValue({
            json: [{ id: 'cos_frame', metadata: { assets: [] } }]
        });
        mocks.getNameplateEffects.mockResolvedValue({
            json: [{ id: 'cos_nameplate', metadata: { assets: [] } }]
        });
    });

    test('loads and caches each cosmetic index once after login, not when user dialogs open', async () => {
        const { useUserStore } = await import('../user');
        const { watchState } = await import('../../services/watchState');
        const store = useUserStore();

        watchState.isLoggedIn = true;
        await nextTick();
        await flushPromises();

        expect(store.cachedProfileEffects.get('cos_profile')?.id).toBe(
            'cos_profile'
        );
        expect(store.cachedIconFrames.get('cos_frame')?.id).toBe('cos_frame');
        expect(store.cachedNameplateEffects.get('cos_nameplate')?.id).toBe(
            'cos_nameplate'
        );
        expect(mocks.getProfileEffects).toHaveBeenCalledTimes(1);
        expect(mocks.getIconFrames).toHaveBeenCalledTimes(1);
        expect(mocks.getNameplateEffects).toHaveBeenCalledTimes(1);

        store.setUserDialogVisible(true);
        store.setUserDialogVisible(false);
        store.setUserDialogVisible(true);
        await flushPromises();

        expect(mocks.getProfileEffects).toHaveBeenCalledTimes(1);
        expect(mocks.getIconFrames).toHaveBeenCalledTimes(1);
        expect(mocks.getNameplateEffects).toHaveBeenCalledTimes(1);
    }, 15000);
});

describe('current user client configuration', () => {
    test('loads reduced animations and clears account settings on logout', async () => {
        setActivePinia(createPinia());
        const { useUserStore } = await import('../user');
        const { watchState } = await import('../../services/watchState');
        watchState.isLoggedIn = false;
        const store = useUserStore();
        mocks.getClientConfig.mockResolvedValue({
            json: { accessReduceDecorAnim: true }
        });
        watchState.isLoggedIn = true;
        await flushPromises();
        expect(store.currentUserClientConfig.accessReduceDecorAnim).toBe(true);
        watchState.isLoggedIn = false;
        expect(store.currentUserClientConfig.accessReduceDecorAnim).toBe(false);
    });

    test('discards configuration that finishes after logout', async () => {
        setActivePinia(createPinia());
        const { useUserStore } = await import('../user');
        const { watchState } = await import('../../services/watchState');
        watchState.isLoggedIn = false;
        const store = useUserStore();
        let resolve;
        mocks.getClientConfig.mockReturnValue(
            new Promise((done) => {
                resolve = done;
            })
        );
        watchState.isLoggedIn = true;
        watchState.isLoggedIn = false;
        resolve({ json: { accessReduceDecorAnim: true } });
        await flushPromises();
        expect(store.currentUserClientConfig.accessReduceDecorAnim).toBe(false);
    });
});

describe('reduced animation setting', () => {
    test('saves a confirmed change and resumes animations only after success', async () => {
        setActivePinia(createPinia());
        const { useUserStore } = await import('../user');
        const { watchState } = await import('../../services/watchState');
        watchState.isLoggedIn = false;
        const store = useUserStore();
        mocks.getClientConfig.mockResolvedValue({
            json: { accessReduceDecorAnim: false }
        });
        watchState.isLoggedIn = true;
        await flushPromises();
        mocks.confirm.mockResolvedValue({ ok: true });
        mocks.saveClientConfig.mockResolvedValue({
            json: { accessReduceDecorAnim: true }
        });
        await store.toggleReducedProfileAnimations();
        expect(mocks.saveClientConfig).toHaveBeenCalledWith({
            accessReduceDecorAnim: true
        });
        expect(store.currentUserClientConfig.accessReduceDecorAnim).toBe(true);
    });
});

test('does not save an animation preference before its account setting has loaded', async () => {
    setActivePinia(createPinia());
    const { useUserStore } = await import('../user');
    const { watchState } = await import('../../services/watchState');
    watchState.isLoggedIn = false;
    const store = useUserStore();
    mocks.saveClientConfig.mockClear();
    mocks.confirm.mockResolvedValue({ ok: true });
    mocks.getClientConfig.mockReturnValue(new Promise(() => {}));
    watchState.isLoggedIn = true;
    await store.toggleReducedProfileAnimations();
    expect(mocks.saveClientConfig).not.toHaveBeenCalled();
});
