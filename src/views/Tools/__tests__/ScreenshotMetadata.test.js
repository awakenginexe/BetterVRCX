import { beforeEach, describe, expect, test, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';

const push = vi.fn();
const showFullscreenImageDialog = vi.fn();
const handleGalleryImageAdd = vi.fn();
const getLastScreenshot = vi.fn();
const findScreenshotsBySearch = vi.fn();
const getScreenshotMetadata = vi.fn();
const getExtraScreenshotData = vi.fn();

vi.mock('vue-router', () => ({
    useRouter: () => ({ push })
}));

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key, params) => (params?.count ? `${key}:${params.count}` : key)
    })
}));

vi.mock('pinia', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        storeToRefs: (store) => store
    };
});

vi.mock('@vueuse/core', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useMagicKeys: () => ({}),
        whenever: () => vi.fn()
    };
});

vi.mock('@/stores', () => ({
    useGalleryStore: () => ({
        showFullscreenImageDialog,
        handleGalleryImageAdd,
        fullscreenImageDialog: ref({ visible: false })
    }),
    useVrcxStore: () => ({ currentlyDroppingFile: ref(null) }),
    useUserStore: () => ({ isLocalUserVrcPlusSupporter: ref(false) })
}));

vi.mock('@/shared/utils', () => ({
    formatDateFilter: (value) => `date:${value}`
}));

vi.mock('@/api', () => ({
    vrcPlusImageRequest: { uploadGalleryImage: vi.fn() }
}));

vi.mock('@/coordinators/userCoordinator', () => ({
    lookupUser: vi.fn()
}));

globalThis.AppApi = {
    GetLastScreenshot: getLastScreenshot,
    FindScreenshotsBySearch: findScreenshotsBySearch,
    GetScreenshotMetadata: getScreenshotMetadata,
    GetExtraScreenshotData: getExtraScreenshotData
};

import ScreenshotMetadata from '../ScreenshotMetadata.vue';

describe('ScreenshotMetadata.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        getLastScreenshot.mockResolvedValue('');
        findScreenshotsBySearch.mockResolvedValue(
            JSON.stringify(['C:/shots/one.png'])
        );
        getScreenshotMetadata.mockResolvedValue(
            JSON.stringify({
                sourceFile: 'C:/shots/one.png',
                timestamp: '2026-08-13T01:00:00Z',
                world: {
                    id: 'wrld_1',
                    name: 'Test World',
                    instanceId: 'wrld_1:1'
                },
                author: { id: 'usr_1', displayName: 'Photographer' },
                players: [{ id: 'usr_2', displayName: 'Friend' }]
            })
        );
        getExtraScreenshotData.mockResolvedValue(
            JSON.stringify({
                filePath: 'C:/shots/one.png',
                fileName: 'VRChat_1920x1080_2026-08-13_01-00-00.000.png',
                fileResolution: '1920x1080',
                fileSize: '2 MB',
                creationDate: '2026-08-13T01:00:00Z'
            })
        );
    });

    test('searches metadata, opens a result in the inspector, and dispatches image preview', async () => {
        const wrapper = mount(ScreenshotMetadata, {
            global: {
                stubs: {
                    DisplayName: { template: '<span><slot /></span>' },
                    Location: { template: '<span><slot /></span>' }
                }
            }
        });
        await flushPromises();

        await wrapper
            .get(
                'input[placeholder="dialog.screenshot_metadata.search_placeholder"]'
            )
            .setValue('Friend');
        await vi.advanceTimersByTimeAsync(500);
        await flushPromises();

        expect(findScreenshotsBySearch).toHaveBeenCalledWith('Friend', 0);
        expect(wrapper.get('.screenshot-metadata__results').text()).toContain(
            'Test World'
        );

        await wrapper.get('[data-testid="screenshot-result"]').trigger('click');
        await flushPromises();

        const preview = wrapper.get('.screenshot-metadata__preview');
        await preview.get('img').trigger('click');
        expect(showFullscreenImageDialog).toHaveBeenCalledWith(
            'C:/shots/one.png'
        );
    });
});
