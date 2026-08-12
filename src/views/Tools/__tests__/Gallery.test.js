import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
    loadGalleryData: vi.fn(),
    routerPush: vi.fn()
}));

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
    getInventory: vi.fn(),
    handleStickerAdd: vi.fn(),
    handleGalleryImageAdd: vi.fn(),
    showFullscreenImageDialog: vi.fn()
};

vi.mock('pinia', () => ({ storeToRefs: (store) => store }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.routerPush }) }));
vi.mock('vue-sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('../../../stores', () => ({
    useAdvancedSettingsStore: () => ({ currentUserInventory: ref([]) }),
    useAuthStore: () => ({ cachedConfig: ref({ maxUserEmoji: 64, maxUserStickers: 64 }) }),
    useGalleryStore: () => galleryStore,
    useModalStore: () => ({ confirm: vi.fn() }),
    useUserStore: () => ({
        currentUser: ref({ profilePicOverride: '', userIcon: '' }),
        isLocalUserVrcPlusSupporter: ref(true)
    })
}));
vi.mock('../../../api', () => ({
    inventoryRequest: {}, miscRequest: {}, userRequest: {}, vrcPlusIconRequest: {}, vrcPlusImageRequest: {}
}));
vi.mock('../../../shared/utils', () => ({
    extractFileId: () => '', formatDateFilter: () => '', getEmojiFileName: () => '', getPrintFileName: () => '', openExternalLink: vi.fn()
}));
vi.mock('../../../shared/utils/imageUpload', () => ({ readFileAsBase64: vi.fn(), withUploadTimeout: (promise) => promise }));
vi.mock('../../../coordinators/imageUploadCoordinator', () => ({ handleImageUploadInput: vi.fn() }));
vi.mock('../../../shared/constants', () => ({ emojiAnimationStyleList: {}, emojiAnimationStyleUrl: '' }));
vi.mock('../../../services/appConfig', () => ({ AppDebug: { endpointDomain: '' } }));
vi.mock('../../../components/Emoji.vue', () => ({ default: { template: '<div />' } }));
vi.mock('../../../components/dialogs/ImageCropDialog.vue', () => ({ default: { template: '<div />' } }));
vi.mock('lucide-vue-next', () => ({
    ArrowLeft: { template: '<i />' }, Check: { template: '<i />' }, Gift: { template: '<i />' },
    RefreshCw: { template: '<i />' }, Trash2: { template: '<i />' }, Upload: { template: '<i />' }, X: { template: '<i />' }
}));

import Gallery from '../Gallery.vue';

const Button = { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' };
const Passthrough = { template: '<div><slot /></div>' };

describe('Gallery', () => {
    beforeEach(() => vi.clearAllMocks());

    it('labels the media tab workspace and routes gallery uploads to its file input', async () => {
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
                        template: '<div data-testid="gallery-tabs" :aria-label="ariaLabel"><button v-for="item in items" :key="item.value" data-testid="gallery-tab">{{ item.value }}</button><slot name="gallery" /></div>'
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

        expect(wrapper.get('[data-testid="gallery-tabs"]').attributes('aria-label')).toBe('dialog.gallery_icons.header');
        expect(wrapper.findAll('[data-testid="gallery-tab"]').map((button) => button.text())).toEqual([
            'gallery', 'icons', 'emojis', 'stickers', 'prints', 'inventory'
        ]);

        const input = wrapper.get('#GalleryUploadButton').element;
        const click = vi.spyOn(input, 'click');
        const upload = wrapper.findAll('button').find((button) => button.text().includes('dialog.gallery_icons.upload'));
        await upload.trigger('click');

        expect(click).toHaveBeenCalledOnce();
        wrapper.unmount();
    });
});
