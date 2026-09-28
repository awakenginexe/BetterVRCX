import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
    loadGalleryData: vi.fn(),
    routerPush: vi.fn(),
    getInventory: vi.fn(),
    saveProfile: vi.fn(),
    getCurrentUser: vi.fn(),
    updateUserDialogProfile: vi.fn()
}));

const currentUser = ref({
    id: 'usr_me',
    iconUrl: '',
    currentAvatarImageUrl: ''
});
const vrcPlusSupporter = ref(true);

const galleryStore = {
    galleryTable: ref([]),
    galleryDialogVisible: ref(false),
    VRCPlusIconsTable: ref([]),
    printUploadNote: ref(''),
    printCropBorder: ref(false),
    stickerTable: ref([]),
    printTable: ref([]),
    emojiTable: ref([]),
    inventoryTable: ref([]),
    loadGalleryData: (...args) => mocks.loadGalleryData(...args),
    refreshGalleryTable: vi.fn(),
    refreshVRCPlusIconsTable: vi.fn(),
    refreshStickerTable: vi.fn(),
    refreshPrintTable: vi.fn(),
    refreshEmojiTable: vi.fn(),
    getInventory: (...args) => mocks.getInventory(...args),
    handleStickerAdd: vi.fn(),
    handleGalleryImageAdd: vi.fn(),
    showFullscreenImageDialog: vi.fn()
};

vi.mock('pinia', () => ({ storeToRefs: (store) => store }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock('vue-router', () => ({
    useRouter: () => ({ push: mocks.routerPush })
}));
vi.mock('vue-sonner', () => ({
    toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
}));
vi.mock('../../../coordinators/userCoordinator', () => ({
    getCurrentUser: (...args) => mocks.getCurrentUser(...args),
    updateUserDialogProfile: (...args) => mocks.updateUserDialogProfile(...args)
}));
vi.mock('../../../stores', () => ({
    useAdvancedSettingsStore: () => ({ currentUserInventory: ref([]) }),
    useAuthStore: () => ({
        cachedConfig: ref({ maxUserEmoji: 64, maxUserStickers: 64 })
    }),
    useGalleryStore: () => galleryStore,
    useModalStore: () => ({ confirm: vi.fn() }),
    useUserStore: () => ({
        currentUser,
        userDialog: { id: 'usr_me' },
        isLocalUserVrcPlusSupporter: vrcPlusSupporter
    })
}));
vi.mock('../../../api', () => ({
    inventoryRequest: {},
    miscRequest: {},
    userRequest: { saveProfile: (...args) => mocks.saveProfile(...args) },
    vrcPlusIconRequest: {},
    vrcPlusImageRequest: {}
}));
vi.mock('../../../shared/utils', () => ({
    extractFileId: () => '',
    formatDateFilter: () => '',
    getEmojiFileName: () => '',
    getPrintFileName: () => '',
    openExternalLink: vi.fn()
}));
vi.mock('../../../shared/utils/imageUpload', () => ({
    readFileAsBase64: vi.fn(),
    withUploadTimeout: (promise) => promise
}));
vi.mock('../../../coordinators/imageUploadCoordinator', () => ({
    handleImageUploadInput: vi.fn()
}));
vi.mock('../../../shared/constants', () => ({
    emojiAnimationStyleList: {},
    emojiAnimationStyleUrl: ''
}));
vi.mock('../../../services/appConfig', () => ({
    AppDebug: { endpointDomain: '' }
}));
vi.mock('../../../components/Emoji.vue', () => ({
    default: { template: '<div />' }
}));
vi.mock('../../../components/dialogs/ImageCropDialog.vue', () => ({
    default: { template: '<div />' }
}));
vi.mock('lucide-vue-next', () => ({
    ArrowLeft: { template: '<i />' },
    Check: { template: '<i />' },
    Gift: { template: '<i />' },
    RefreshCw: { template: '<i />' },
    Trash2: { template: '<i />' },
    Upload: { template: '<i />' },
    X: { template: '<i />' }
}));

import Gallery from '../Gallery.vue';
import { toast } from 'vue-sonner';

const Button = {
    emits: ['click'],
    template: '<button @click="$emit(\'click\')"><slot /></button>'
};
const Passthrough = { template: '<div><slot /></div>' };

function mountIconGallery() {
    galleryStore.VRCPlusIconsTable.value = [
        {
            id: 'file_1',
            versions: [{ file: { url: 'https://example.com/file_1.png' } }]
        }
    ];
    const wrapper = mount(Gallery, {
        global: {
            stubs: {
                Button,
                ButtonGroup: Passthrough,
                TabsUnderline: {
                    props: ['items'],
                    data: () => ({ activeTab: 'gallery' }),
                    template:
                        '<div><button v-for="item in items" :key="item.value" data-testid="gallery-tab" @click="activeTab = item.value">{{ item.value }}</button><slot :name="activeTab" /></div>'
                },
                Item: Passthrough,
                ItemHeader: Passthrough,
                ItemFooter: { template: '<footer><slot /></footer>' },
                ItemGroup: Passthrough
            }
        }
    });
    return wrapper
        .findAll('[data-testid="gallery-tab"]')[1]
        .trigger('click')
        .then(() => wrapper);
}

describe('Gallery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        currentUser.value = {
            id: 'usr_me',
            iconUrl: '',
            currentAvatarImageUrl: ''
        };
        vrcPlusSupporter.value = true;
        mocks.saveProfile.mockResolvedValue({
            json: { iconUrl: 'https://example.com/file/file_1/1' }
        });
        mocks.getCurrentUser.mockResolvedValue({ json: { id: 'usr_me' } });
    });

    it('switches Gallery tabs, routes an upload, and refreshes inventory from its tab', async () => {
        const wrapper = mount(Gallery, {
            attachTo: document.body,
            global: {
                stubs: {
                    Button,
                    ButtonGroup: Passthrough,
                    Checkbox: Passthrough,
                    InputGroupTextareaField: Passthrough,
                    Select: Passthrough,
                    SelectContent: Passthrough,
                    SelectGroup: Passthrough,
                    SelectItem: Passthrough,
                    SelectTrigger: Passthrough,
                    SelectValue: Passthrough,
                    TabsUnderline: {
                        props: ['items', 'ariaLabel'],
                        data: () => ({ activeTab: 'gallery' }),
                        template:
                            '<div data-testid="gallery-tabs" :aria-label="ariaLabel"><button v-for="item in items" :key="item.value" data-testid="gallery-tab" @click="activeTab = item.value">{{ item.value }}</button><slot :name="activeTab" /></div>'
                    },
                    VirtualCombobox: Passthrough,
                    Item: Passthrough,
                    ItemContent: Passthrough,
                    ItemDescription: Passthrough,
                    ItemFooter: Passthrough,
                    ItemGroup: Passthrough,
                    ItemHeader: Passthrough,
                    ItemTitle: Passthrough,
                    NumberField: Passthrough,
                    NumberFieldContent: Passthrough,
                    NumberFieldDecrement: Passthrough,
                    NumberFieldIncrement: Passthrough,
                    NumberFieldInput: Passthrough,
                    Location: Passthrough,
                    DisplayName: Passthrough
                }
            }
        });

        expect(
            wrapper.get('[data-testid="gallery-tabs"]').attributes('aria-label')
        ).toBe('dialog.gallery_icons.header');
        expect(
            wrapper
                .findAll('[data-testid="gallery-tab"]')
                .map((button) => button.text())
        ).toEqual([
            'gallery',
            'icons',
            'emojis',
            'stickers',
            'prints',
            'inventory'
        ]);

        const input = wrapper.get('#GalleryUploadButton').element;
        const click = vi.spyOn(input, 'click');
        const upload = wrapper
            .findAll('button')
            .find((button) =>
                button.text().includes('dialog.gallery_icons.upload')
            );
        await upload.trigger('click');

        expect(click).toHaveBeenCalledOnce();

        await wrapper
            .findAll('[data-testid="gallery-tab"]')
            .at(-1)
            .trigger('click');
        const refresh = wrapper
            .findAll('button')
            .find((button) =>
                button.text().includes('dialog.gallery_icons.refresh')
            );
        await refresh.trigger('click');

        expect(mocks.getInventory).toHaveBeenCalledOnce();
        wrapper.unmount();
    });

    it('sets and clears the icon through the profile API, then refreshes current and dialog data', async () => {
        const wrapper = await mountIconGallery();
        await wrapper.findAll('footer button')[1].trigger('click');
        await flushPromises();

        expect(mocks.saveProfile).toHaveBeenCalledWith({
            userIcon: '/file/file_1/1'
        });
        expect(mocks.getCurrentUser).toHaveBeenCalledOnce();
        expect(mocks.updateUserDialogProfile).toHaveBeenCalledOnce();
        expect(toast.success).toHaveBeenCalledOnce();

        currentUser.value.iconUrl = '/file/file_1/1';
        await nextTick();
        await wrapper
            .findAll('button')
            .find((button) =>
                button.text().includes('dialog.gallery_icons.clear')
            )
            .trigger('click');
        await flushPromises();
        expect(mocks.saveProfile).toHaveBeenLastCalledWith({ userIcon: '' });
        expect(mocks.getCurrentUser).toHaveBeenCalledTimes(2);
        wrapper.unmount();
    });

    it('keeps the icon state and reports failure when the profile API rejects', async () => {
        mocks.saveProfile.mockRejectedValueOnce(new Error('API failure'));
        const wrapper = await mountIconGallery();
        await wrapper.findAll('footer button')[1].trigger('click');
        await flushPromises();

        expect(currentUser.value.iconUrl).toBe('');
        expect(mocks.getCurrentUser).not.toHaveBeenCalled();
        expect(mocks.updateUserDialogProfile).not.toHaveBeenCalled();
        expect(toast.success).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledOnce();
        wrapper.unmount();
    });

    it('does not send an icon update without the required account entitlement', async () => {
        vrcPlusSupporter.value = false;
        const wrapper = await mountIconGallery();
        await wrapper.findAll('footer button')[1].trigger('click');
        await flushPromises();

        expect(mocks.saveProfile).not.toHaveBeenCalled();
        expect(toast.success).not.toHaveBeenCalled();
        wrapper.unmount();
    });
});
