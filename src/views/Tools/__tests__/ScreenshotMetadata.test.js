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

function mountInspector() {
    return mount(ScreenshotMetadata, {
        global: {
            stubs: {
                DisplayName: { template: '<span><slot /></span>' },
                Location: { template: '<span><slot /></span>' }
            }
        }
    });
}

function searchInput(wrapper) {
    return wrapper.get(
        'input[placeholder="dialog.screenshot_metadata.search_placeholder"]'
    );
}

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
        const wrapper = mountInspector();
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

    test('does not enumerate photos for whitespace or short automatic input, but Enter searches a short term', async () => {
        const wrapper = mountInspector();
        await flushPromises();
        const input = searchInput(wrapper);

        await input.setValue('   ');
        await vi.advanceTimersByTimeAsync(500);
        expect(findScreenshotsBySearch).not.toHaveBeenCalled();

        await input.setValue('猫');
        await vi.advanceTimersByTimeAsync(500);
        expect(findScreenshotsBySearch).not.toHaveBeenCalled();

        await input.trigger('keydown.enter');
        await flushPromises();
        expect(findScreenshotsBySearch).toHaveBeenCalledWith('猫', 0);
        wrapper.unmount();
    });

    test('waits for IME composition and searches trimmed Unicode input after completion', async () => {
        const wrapper = mountInspector();
        await flushPromises();
        const input = searchInput(wrapper);

        await input.trigger('compositionstart');
        await input.setValue('  ภาษาไทย  ');
        await vi.advanceTimersByTimeAsync(500);
        expect(findScreenshotsBySearch).not.toHaveBeenCalled();

        await input.trigger('compositionend');
        await vi.advanceTimersByTimeAsync(500);
        expect(findScreenshotsBySearch).toHaveBeenCalledWith('ภาษาไทย', 0);
        wrapper.unmount();
    });

    test('ignores an old response after clearing search and resets loading and selection', async () => {
        let resolveSearch;
        findScreenshotsBySearch.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolveSearch = resolve;
                })
        );
        const wrapper = mountInspector();
        await flushPromises();
        const input = searchInput(wrapper);

        await input.setValue('Friend');
        await vi.advanceTimersByTimeAsync(500);
        expect(findScreenshotsBySearch).toHaveBeenCalledOnce();

        await input.setValue('');
        await flushPromises();
        resolveSearch(JSON.stringify(['C:/shots/one.png']));
        await flushPromises();

        expect(wrapper.find('.screenshot-metadata__results').exists()).toBe(
            false
        );
        expect(
            wrapper.find('.screenshot-metadata__toolbar').text()
        ).not.toContain('1/');
        wrapper.unmount();
    });

    test('keeps only the latest search response when requests finish out of order', async () => {
        let resolveOld;
        findScreenshotsBySearch
            .mockImplementationOnce(
                () =>
                    new Promise((resolve) => {
                        resolveOld = resolve;
                    })
            )
            .mockResolvedValueOnce(JSON.stringify(['C:/shots/one.png']));
        const wrapper = mountInspector();
        await flushPromises();
        const input = searchInput(wrapper);

        await input.setValue('older');
        await vi.advanceTimersByTimeAsync(500);
        await input.setValue('newer');
        await vi.advanceTimersByTimeAsync(500);
        await flushPromises();
        expect(wrapper.get('.screenshot-metadata__results').text()).toContain(
            'Test World'
        );

        resolveOld(JSON.stringify([]));
        await flushPromises();
        expect(wrapper.get('.screenshot-metadata__results').text()).toContain(
            'Test World'
        );
        wrapper.unmount();
    });

    test('reports search errors and clears the loading state', async () => {
        findScreenshotsBySearch.mockRejectedValueOnce(
            new Error('disk unavailable')
        );
        const wrapper = mountInspector();
        await flushPromises();
        await searchInput(wrapper).setValue('Friend');
        await vi.advanceTimersByTimeAsync(500);
        await flushPromises();

        expect(wrapper.text()).toContain(
            'dialog.screenshot_metadata.search_failed'
        );
        expect(wrapper.find('.screenshot-metadata__results').exists()).toBe(
            false
        );
        wrapper.unmount();
    });
});
