import { describe, expect, test, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, defineStore } from 'pinia';
import { ref } from 'vue';

const api = vi.hoisted(() => ({
    uploadGalleryImage: vi.fn().mockResolvedValue({ json: { id: 'file_new' } }),
    uploadVRCPlusIcon: vi.fn().mockResolvedValue({ json: { id: 'file_icon' } })
}));
vi.mock('../../../../api', () => ({
    vrcPlusImageRequest: api,
    vrcPlusIconRequest: api
}));
vi.mock('../../../../stores', () => ({
    useGalleryStore: defineStore('gallery-test', () => ({
        galleryTable: ref([]),
        VRCPlusIconsTable: ref([]),
        refreshGalleryTable: vi.fn(),
        refreshVRCPlusIconsTable: vi.fn(),
        handleGalleryImageAdd: vi.fn()
    })),
    useUserStore: defineStore('user-test', () => ({
        isLocalUserVrcPlusSupporter: ref(true)
    }))
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
import GallerySelectDialog from '../GallerySelectDialog.vue';

const slot = { template: '<div><slot /></div>' };
describe('gallery image upload', () => {
    test('a supporter uploads a gallery image through the gallery endpoint', async () => {
        const wrapper = mount(GallerySelectDialog, {
            props: {
                gallerySelectDialog: {
                    visible: true,
                    isIconGallerySelectDialog: false
                }
            },
            global: {
                plugins: [createPinia()],
                stubs: {
                    Dialog: slot,
                    DialogContent: slot,
                    DialogHeader: slot,
                    DialogTitle: slot
                }
            }
        });
        const input = wrapper.find('input[type=file]');
        Object.defineProperty(input.element, 'files', {
            value: [new File(['image'], 'photo.png', { type: 'image/png' })]
        });
        await input.trigger('change');
        await vi.waitFor(() =>
            expect(api.uploadGalleryImage).toHaveBeenCalled()
        );
        expect(api.uploadVRCPlusIcon).not.toHaveBeenCalled();
    });
});
