import { describe, expect, it, vi, beforeEach } from 'vitest';
const mocks = vi.hoisted(() => ({
    avatarRemoteDatabase: require('vue').ref(true),
    searchText: require('vue').ref(''),
    lookupAvatars: vi.fn(),
    avatarSearchMode: require('vue').ref('fallback'),
    avatarSearchSources: require('vue').ref(['avtrdb', 'avtricu', 'vrcndb']),
    avatarRemoteDatabaseProvider: require('vue').ref('https://custom.test')
}));

vi.mock('pinia', () => ({
    storeToRefs: (store) => store
}));
vi.mock('../../../../plugins/i18n', () => ({
    i18n: { global: { t: (key) => key } }
}));

vi.mock('../../../../stores', () => ({
    useAdvancedSettingsStore: () => ({
        avatarRemoteDatabase: mocks.avatarRemoteDatabase
    }),
    useAvatarProviderStore: () => ({
        avatarSearchMode: mocks.avatarSearchMode,
        avatarSearchSources: mocks.avatarSearchSources,
        avatarRemoteDatabaseProvider: mocks.avatarRemoteDatabaseProvider
    }),
    useSearchStore: () => ({
        searchText: mocks.searchText
    })
}));

vi.mock('../../../../coordinators/avatarCoordinator', () => ({
    lookupAvatars: (...args) => mocks.lookupAvatars(...args)
}));

import { useSearchAvatar } from '../useSearchAvatar';

describe('useSearchAvatar', () => {
    beforeEach(() => {
        mocks.avatarRemoteDatabase.value = true;
        mocks.searchText.value = '';
        mocks.lookupAvatars.mockReset();
        mocks.avatarSearchMode.value = 'fallback';
    });

    it('queries remote avatars and builds first page', async () => {
        mocks.searchText.value = 'alice';
        mocks.lookupAvatars.mockResolvedValue([
            { id: 'avtr_1', name: 'A' },
            { id: 'avtr_1', name: 'A-dup' },
            { id: 'avtr_2', name: 'B' }
        ]);

        const api = useSearchAvatar();
        await api.searchAvatar();

        expect(mocks.lookupAvatars).toHaveBeenCalledWith(
            'search',
            'alice',
            expect.objectContaining({ onState: expect.any(Function) })
        );
        expect(api.searchAvatarResults.value.map((x) => x.id)).toEqual([
            'avtr_1',
            'avtr_2'
        ]);
        expect(api.searchAvatarPage.value.map((x) => x.id)).toEqual([
            'avtr_1',
            'avtr_2'
        ]);
        expect(api.searchAvatarPageNum.value).toBe(0);
    });

    it('skips remote query when text is too short', async () => {
        mocks.searchText.value = 'ab';
        const api = useSearchAvatar();

        await api.searchAvatar();

        expect(mocks.lookupAvatars).not.toHaveBeenCalled();
        expect(api.searchAvatarResults.value).toEqual([]);
    });

    it('paginates results by 10 items', () => {
        const api = useSearchAvatar();
        api.searchAvatarResults.value = Array.from({ length: 25 }, (_, i) => ({
            id: `avtr_${i}`
        }));
        api.searchAvatarPage.value = api.searchAvatarResults.value.slice(0, 10);

        api.moreSearchAvatar(1);
        expect(api.searchAvatarPageNum.value).toBe(1);
        expect(api.searchAvatarPage.value.map((x) => x.id)).toEqual(
            Array.from({ length: 10 }, (_, i) => `avtr_${i + 10}`)
        );

        api.moreSearchAvatar(-1);
        expect(api.searchAvatarPageNum.value).toBe(0);
        expect(api.searchAvatarPage.value.map((x) => x.id)).toEqual(
            Array.from({ length: 10 }, (_, i) => `avtr_${i}`)
        );
    });

    it('never replaces a newer query with old results or progress', async () => {
        let oldResolve;
        mocks.lookupAvatars.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    oldResolve = resolve;
                })
        );
        mocks.lookupAvatars.mockResolvedValueOnce(
            new Map([['avtr_new', { id: 'avtr_new' }]])
        );
        mocks.searchText.value = 'Rur';
        const api = useSearchAvatar();
        const old = api.searchAvatar();
        const oldState = mocks.lookupAvatars.mock.calls[0][2].onState;
        mocks.searchText.value = 'Rurune';
        await api.searchAvatar();
        oldState({ activeProvider: 'vrcndb' });
        oldResolve(new Map([['avtr_old', { id: 'avtr_old' }]]));
        await old;
        expect(api.searchAvatarResults.value.map((a) => a.id)).toEqual([
            'avtr_new'
        ]);
        expect(api.avatarSearchState.value.activeProvider).toBeNull();
        expect(api.isSearchAvatarLoading.value).toBe(false);
    });
    it('invalidates pending results when cleared', async () => {
        let resolve;
        mocks.lookupAvatars.mockImplementationOnce(
            () =>
                new Promise((r) => {
                    resolve = r;
                })
        );
        mocks.searchText.value = 'Rurune';
        const api = useSearchAvatar();
        const pending = api.searchAvatar();
        api.clearAvatarSearch();
        resolve(new Map([['avtr_old', { id: 'avtr_old' }]]));
        await pending;
        expect(api.searchAvatarResults.value).toEqual([]);
        expect(api.isSearchAvatarLoading.value).toBe(false);
    });
    it('rejects a result and its metadata after source mode changes', async () => {
        let resolve;
        mocks.searchText.value = 'Rurune';
        mocks.lookupAvatars.mockImplementationOnce(
            () =>
                new Promise((r) => {
                    resolve = r;
                })
        );
        const api = useSearchAvatar();
        const pending = api.searchAvatar();
        const isCurrent = mocks.lookupAvatars.mock.calls[0][2].isCurrent;
        mocks.avatarSearchMode.value = 'deep';
        expect(isCurrent()).toBe(false);
        resolve(new Map([['avtr_old', { id: 'avtr_old' }]]));
        await pending;
        expect(api.searchAvatarResults.value).toEqual([]);
    });
    it('does not keep loading after an unexpected rejection', async () => {
        mocks.searchText.value = 'Rurune';
        mocks.lookupAvatars.mockRejectedValue(new Error('offline'));
        const api = useSearchAvatar();
        await api.searchAvatar();
        expect(api.isSearchAvatarLoading.value).toBe(false);
        expect(api.searchAvatarResults.value).toEqual([]);
    });
});
