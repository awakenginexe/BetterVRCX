import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';

const mocks = vi.hoisted(() => ({
    getProfileEffects: vi.fn(),
    getIconFrames: vi.fn(),
    getNameplateEffects: vi.fn()
}));

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key) => key })
}));

vi.mock('../../api', () => ({
    instanceRequest: {},
    userRequest: {},
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
    useModalStore: () => ({ confirm: vi.fn() })
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
