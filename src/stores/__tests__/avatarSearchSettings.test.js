import { beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises } from '@vue/test-utils';
const mocks = vi.hoisted(() => ({
    values: {},
    setString: vi.fn(),
    setAvatarRemoteDatabase: vi.fn()
}));
vi.mock('../../services/config', () => ({
    default: {
        getString: async (key, fallback = null) =>
            mocks.values[key] ?? fallback,
        setString: (...args) => mocks.setString(...args),
        remove: vi.fn()
    }
}));
vi.mock('../../plugins/router', () => ({ router: { push: vi.fn() } }));
vi.mock('../settings/advanced', () => ({
    useAdvancedSettingsStore: () => ({
        setAvatarRemoteDatabase: mocks.setAvatarRemoteDatabase
    })
}));
vi.mock('../../services/watchState', () => ({
    watchState: { isLoggedIn: false }
}));
import { useAvatarProviderStore } from '../avatarProvider';
beforeEach(() => {
    setActivePinia(createPinia());
    mocks.values = {};
    vi.clearAllMocks();
});
it('defaults to built-in fallback and persists source/mode changes', async () => {
    const store = useAvatarProviderStore();
    await flushPromises();
    expect(store.avatarSearchMode).toBe('fallback');
    expect(store.avatarSearchContactEmail).toBe('');
    expect(store.avatarSearchSources).toEqual(['avtrdb', 'avtricu', 'vrcndb']);
    await store.setAvatarSearchMode('deep');
    await store.setAvatarSearchSource('avtricu', false);
    await store.setAvatarSearchContactEmail('support@example.invalid');
    expect(mocks.setString).toHaveBeenCalledWith(
        'VRCX_avatarSearchContactEmail',
        'support@example.invalid'
    );
    expect(mocks.setString).toHaveBeenCalledWith(
        'VRCX_avatarSearchMode',
        'deep'
    );
    expect(mocks.setString).toHaveBeenCalledWith(
        'VRCX_avatarSearchSources',
        '["avtrdb","vrcndb"]'
    );
});
it('restores valid settings and discards unknown sources', async () => {
    mocks.values = {
        VRCX_avatarSearchMode: 'deep',
        VRCX_avatarSearchSources: '["vrcndb","unknown"]'
    };
    const store = useAvatarProviderStore();
    await flushPromises();
    expect(store.avatarSearchMode).toBe('deep');
    expect(store.avatarSearchSources).toEqual(['vrcndb']);
});
it('recovers malformed configuration', async () => {
    mocks.values = {
        VRCX_avatarSearchMode: 'bad',
        VRCX_avatarSearchSources: '{'
    };
    const store = useAvatarProviderStore();
    await flushPromises();
    expect(store.avatarSearchMode).toBe('fallback');
    expect(store.avatarSearchSources).toHaveLength(3);
});
it('removing custom URLs does not disable built-in search', async () => {
    const store = useAvatarProviderStore();
    await flushPromises();
    store.avatarRemoteDatabaseProviderList = [];
    await store.saveAvatarProviderList();
    expect(mocks.setAvatarRemoteDatabase).toHaveBeenLastCalledWith(true);
});
