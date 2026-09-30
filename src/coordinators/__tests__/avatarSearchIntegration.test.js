import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
    avatar: {
        cachedAvatars: new Map(),
        cachedAvatarModerations: new Map(),
        avatarDialog: {},
        getAvatarGallery: vi.fn().mockResolvedValue([]),
        updateVRChatAvatarCache: vi.fn()
    },
    provider: {
        avatarRemoteDatabaseProvider: 'https://custom.test/search',
        avatarRemoteDatabaseProviderList: ['https://custom.test/search'],
        avatarSearchMode: 'fallback',
        avatarSearchSources: ['avtrdb', 'avtricu', 'vrcndb']
    },
    execute: vi.fn(),
    fetch: vi.fn(),
    getAvatar: vi.fn()
}));
vi.mock('../../stores/avatar', () => ({ useAvatarStore: () => mocks.avatar }));
vi.mock('../../stores/avatarProvider', () => ({
    useAvatarProviderStore: () => mocks.provider
}));
vi.mock('../../stores/vrcxUpdater', () => ({
    useVRCXUpdaterStore: () => ({ vrcxId: 'client' })
}));
vi.mock('../../stores/settings/advanced', () => ({
    useAdvancedSettingsStore: () => ({ avatarRemoteDatabase: true })
}));
vi.mock('../../stores/favorite', () => ({
    useFavoriteStore: () => ({
        localAvatarFavoritesList: [],
        getCachedFavoritesByObjectId: () => false
    })
}));
vi.mock('../../stores/user', () => ({
    useUserStore: () => ({ currentUser: { id: 'usr_me' } })
}));
vi.mock('../../stores/ui', () => ({
    useUiStore: () => ({
        openDialog: () => false,
        setDialogCrumbLabel: vi.fn(),
        jumpBackDialogCrumb: vi.fn()
    })
}));
vi.mock('../../stores/modal', () => ({ useModalStore: () => ({}) }));
vi.mock('../../plugins/i18n', () => ({
    i18n: { global: { t: (key) => key } }
}));
vi.mock('../../api', () => ({
    avatarRequest: { getAvatar: (...args) => mocks.getAvatar(...args) },
    miscRequest: {},
    queryRequest: { fetch: (...args) => mocks.fetch(...args) }
}));
vi.mock('../../services/webapi', () => ({
    default: { execute: (...args) => mocks.execute(...args) }
}));
vi.mock('../../services/database', () => ({ database: {} }));
vi.mock('../../services/appConfig', () => ({ logWebRequest: vi.fn() }));
vi.mock('../../queries', () => ({ patchAvatarFromEvent: vi.fn() }));
vi.mock('../../services/request', () => ({ processBulk: vi.fn() }));
vi.mock('../favoriteCoordinator', () => ({ applyFavorite: vi.fn() }));
vi.mock('../userCoordinator', () => ({
    refreshUserDialogAvatars: vi.fn(),
    showUserDialog: vi.fn()
}));
vi.mock('../searchIndexCoordinator', () => ({
    syncAvatarSearchIndex: vi.fn(),
    removeAvatarSearchIndex: vi.fn()
}));
vi.mock('../../shared/utils', async () => {
    const { createDefaultAvatarRef } =
        await import('../../shared/utils/avatarTransforms');
    return {
        createDefaultAvatarRef,
        extractFileId: (url) => url?.match(/file_[a-z]+/)?.[0],
        getAvailablePlatforms: () => ({
            isPC: false,
            isQuest: false,
            isIos: false
        }),
        getBundleDateSize: vi.fn(),
        getPlatformInfo: () => ({}),
        replaceBioSymbols: (x) => x,
        sanitizeEntityJson: vi.fn(),
        storeAvatarImage: vi.fn()
    };
});
import {
    lookupAvatars,
    lookupAvatarByImageFileId,
    showAvatarDialog
} from '../avatarCoordinator';
import { avatarSearchService } from '../../services/avatarSearch/avatarSearchService';
import { avatarExternalMetadata } from '../../services/avatarSearch/metadataCache';

beforeEach(() => {
    vi.clearAllMocks();
    avatarSearchService.clear();
    mocks.avatar.cachedAvatars.clear();
    mocks.avatar.avatarDialog = {};
    mocks.provider.avatarSearchMode = 'fallback';
});

it('retains sources on opening official detail without overriding VRChat fields', async () => {
    mocks.execute.mockResolvedValue({
        status: 200,
        data: JSON.stringify([
            {
                id: 'avtr_one',
                name: 'Database name',
                authorName: 'External author'
            }
        ])
    });
    await lookupAvatars('search', 'Rurune');
    mocks.fetch.mockResolvedValue({
        json: {
            id: 'avtr_one',
            name: 'Official name',
            authorName: 'Official author',
            releaseStatus: 'private',
            unityPackages: []
        }
    });
    await showAvatarDialog('avtr_one');
    expect(mocks.avatar.avatarDialog.ref).toMatchObject({
        name: 'Official name',
        authorName: 'Official author',
        releaseStatus: 'private'
    });
    expect(mocks.avatar.avatarDialog.externalMetadata.sources).toEqual([
        'avtrdb'
    ]);
    expect(
        mocks.avatar.avatarDialog.externalMetadata.sourceData.avtrdb.name
    ).toBe('Database name');
    expect(
        mocks.avatar.cachedAvatars.get('avtr_one').$searchMetadata
    ).toBeUndefined();
});
it('keeps selected custom search working', async () => {
    mocks.provider.avatarSearchMode = 'custom';
    mocks.execute.mockResolvedValue({
        status: 200,
        data: '[{"Id":"avtr_one","Name":"Custom"}]'
    });
    expect((await lookupAvatars('search', 'Rurune')).get('avtr_one').name).toBe(
        'Custom'
    );
    expect(mocks.execute.mock.calls[0][0].url).toContain(
        'https://custom.test/search?search=Rurune'
    );
});
it('preserves author and image/file lookup contracts', async () => {
    mocks.execute.mockResolvedValue({
        status: 200,
        data: '[{"id":"avtr_one","imageUrl":"https://files.test/file_one/1"}]'
    });
    expect((await lookupAvatars('authorId', 'usr_one')).has('avtr_one')).toBe(
        true
    );
    expect(mocks.execute.mock.calls[0][0].url).toContain('authorId=usr_one');
    mocks.execute.mockResolvedValue({ status: 200, data: '{"id":"avtr_one"}' });
    expect(await lookupAvatarByImageFileId('usr_one', 'file_one')).toBe(
        'avtr_one'
    );
    expect(mocks.execute.mock.calls[1][0].url).toContain('fileId=file_one');
});
it('does not let an earlier official dialog request overwrite a later avatar', async () => {
    let resolve;
    mocks.fetch.mockImplementationOnce(
        () =>
            new Promise((r) => {
                resolve = r;
            })
    );
    mocks.fetch.mockResolvedValueOnce({
        json: { id: 'avtr_two', name: 'Two' }
    });
    const old = showAvatarDialog('avtr_one');
    await showAvatarDialog('avtr_two');
    resolve({ json: { id: 'avtr_one', name: 'One' } });
    await old;
    expect(mocks.avatar.avatarDialog.ref.id).toBe('avtr_two');
});
it('resolves explicit avatar IDs officially before trying public databases', async () => {
    mocks.getAvatar.mockResolvedValue({
        json: { id: 'avtr_one', name: 'Official' }
    });
    expect(
        (await lookupAvatars('search', 'avtr_one')).get('avtr_one').name
    ).toBe('Official');
    expect(mocks.execute).not.toHaveBeenCalled();
});
it('clears retained metadata through service lifecycle', () => {
    avatarExternalMetadata.set('avtr_one', { sources: ['avtrdb'] });
    avatarSearchService.clear();
    expect(avatarExternalMetadata.get('avtr_one')).toBeNull();
});
