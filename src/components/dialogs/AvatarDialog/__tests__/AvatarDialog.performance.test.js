import { beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, shallowMount } from '@vue/test-utils';
import { ref } from 'vue';
import { createI18n } from 'vue-i18n';
import en from '../../../../localization/en.json';
import AvatarDialog from '../AvatarDialog.vue';
import AvatarPerformanceDetails from '../AvatarPerformanceDetails.vue';
const mocks = vi.hoisted(() => ({
    avatar: null,
    user: null,
    fetch: vi.fn(),
    resolve: vi.fn()
}));
vi.mock('pinia', async (importOriginal) => ({
    ...(await importOriginal()),
    storeToRefs: (store) => store
}));
vi.mock('../../../../plugins/router', () => ({
    router: { beforeEach: vi.fn(), push: vi.fn() },
    initRouter: vi.fn()
}));
vi.mock('../../../../stores', () => ({
    useAvatarStore: () => mocks.avatar,
    useUserStore: () => mocks.user,
    useFavoriteStore: () => ({}),
    useGalleryStore: () => ({}),
    useGameStore: () => ({}),
    useAuthStore: () => ({ cachedConfig: {} }),
    useModalStore: () => ({}),
    useUiStore: () => ({})
}));
vi.mock('../../../../services/avatarPerformance/service', () => ({
    fetchAvatarPerformance: (...args) => mocks.fetch(...args),
    getCachedPerformance: () => undefined,
    cacheOfficialAvatar: vi.fn(),
    resolveOfficialAvatar: (...args) => mocks.resolve(...args)
}));
vi.mock('../../../../shared/utils', () => ({
    compareUnityVersion: () => true,
    commaNumber: String,
    formatDateFilter: String,
    timeToText: String,
    getAvailablePlatforms: () => ({ isPC: true, isQuest: false, isIos: false }),
    getPlatformInfo: () => ({})
}));
vi.mock('../../../../services/database', () => ({ database: {} }));
vi.mock('../../../../services/appConfig', () => ({ AppDebug: {} }));
vi.mock('../../../../api', () => ({ avatarRequest: {} }));
vi.mock('../../../../shared/utils/base/ui', () => ({
    formatJsonVars: (x) => x
}));
vi.mock('../../../../coordinators/avatarCoordinator', () => ({
    showAvatarDialog: vi.fn(),
    applyAvatar: (metadata) => metadata,
    selectAvatarWithoutConfirmation: vi.fn()
}));
vi.mock('../../../../coordinators/userCoordinator', () => ({
    showUserDialog: vi.fn()
}));
vi.mock('../../../../coordinators/gameCoordinator', () => ({
    runDeleteVRChatCacheFlow: vi.fn()
}));
vi.mock('../../../../coordinators/imageUploadCoordinator', () => ({
    handleImageUploadInput: vi.fn()
}));
vi.mock('../useAvatarDialogCommands', () => ({
    useAvatarDialogCommands: () => ({ registerCallbacks: vi.fn() })
}));
vi.mock('../SetAvatarStylesDialog.vue', () => ({
    default: { template: '<div />' }
}));
vi.mock('../SetAvatarTagsDialog.vue', () => ({
    default: { template: '<div />' }
}));
vi.mock('../../ImageCropDialog.vue', () => ({
    default: { template: '<div />' }
}));
vi.mock('../../DialogJsonTab.vue', () => ({
    default: { template: '<div />' }
}));

beforeEach(() => {
    vi.resetAllMocks();
    mocks.user = { currentUser: ref({ id: 'usr_me' }), userDialog: ref({}) };
    mocks.avatar = {
        cachedAvatars: new Map(),
        cachedAvatarModerations: new Map(),
        avatarDialog: ref({})
    };
});
function render(authorId, ready = true) {
    const avatar = {
        id: 'avtr_one',
        name: 'Existing avatar name',
        description: 'Existing description',
        authorId,
        authorName: 'Existing author',
        tags: [],
        version: 1,
        releaseStatus: authorId === 'usr_me' ? 'private' : 'public',
        unityPackages: [
            {
                platform: 'standalonewindows',
                assetUrl:
                    'https://api.vrchat.cloud/api/1/file/file_ce35d830-e20a-4df0-a6d4-5aaef4508044/65/file'
            }
        ]
    };
    mocks.avatar.avatarDialog.value = {
        id: avatar.id,
        ref: avatar,
        visible: true,
        performanceAvatar: ready ? avatar : null,
        platformInfo: {},
        fileAnalysis: {},
        galleryImages: [],
        activeTab: 'Info'
    };
    return shallowMount(AvatarDialog, {
        global: {
            plugins: [
                createI18n({ legacy: false, locale: 'en', messages: { en } })
            ],
            renderStubDefaultSlot: true,
            stubs: {
                AvatarPerformanceDetails: false,
                TabsUnderline: { template: '<div><slot name="Info" /></div>' },
                TooltipWrapper: { template: '<span><slot /></span>' }
            }
        }
    });
}
it.each([
    ['public non-owned avatar', 'usr_other'],
    ['My Uploaded Avatar', 'usr_me']
])(
    'shows shared performance in %s and preserves metadata after failure',
    async (_, authorId) => {
        mocks.fetch.mockResolvedValue({ status: 'unavailable' });
        const wrapper = render(authorId);
        await flushPromises();
        expect(wrapper.findComponent(AvatarPerformanceDetails).exists()).toBe(
            true
        );
        expect(wrapper.text()).toContain('Performance data unavailable');
        expect(wrapper.text()).toContain('Existing avatar name');
        expect(wrapper.text()).toContain('Existing description');
        expect(wrapper.text()).toContain('Existing author');
        expect(mocks.fetch).toHaveBeenCalledTimes(1);
    }
);
it('renders existing metadata immediately while official metadata/performance is loading', () => {
    const wrapper = render('usr_other', false);
    expect(wrapper.text()).toContain('Existing avatar name');
    expect(wrapper.text()).toContain('Loading performance data');
    expect(mocks.fetch).not.toHaveBeenCalled();
});
it('preserves existing file size/JSON analysis when older analysis omits performance statistics', async () => {
    mocks.fetch.mockResolvedValue({
        status: 'unavailable',
        fileAnalysis: {
            success: true,
            fileSize: 1048576,
            uncompressedSize: 2097152
        }
    });
    const wrapper = render('usr_other');
    await flushPromises();
    expect(wrapper.text()).toContain('Performance data unavailable');
    expect(
        mocks.avatar.avatarDialog.value.fileAnalysis.standalonewindows
    ).toMatchObject({ _fileSize: '1.00 MB', _uncompressedSize: '2.00 MB' });
});
it('refresh applies the new official avatar to the existing shared metadata layer', async () => {
    mocks.fetch.mockResolvedValue({ status: 'unavailable' });
    const wrapper = render('usr_other');
    await flushPromises();
    const latest = {
        ...mocks.avatar.avatarDialog.value.ref,
        name: 'Reuploaded avatar',
        version: 2
    };
    mocks.resolve.mockResolvedValue(latest);
    wrapper.findComponent(AvatarPerformanceDetails).vm.$emit('refresh');
    await flushPromises();
    expect(wrapper.text()).toContain('Reuploaded avatar');
    expect(mocks.avatar.avatarDialog.value.ref).toEqual(latest);
});
