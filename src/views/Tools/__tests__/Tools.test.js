import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';

const push = vi.fn();
const showGalleryPage = vi.fn();
const showVRChatConfig = vi.fn();
const showLaunchOptions = vi.fn();
const showRegistryBackupDialog = vi.fn();
const openDialog = vi.fn();
const pinToolToNav = vi.fn();
const unpinToolFromNav = vi.fn();
const openVrcPhotosFolder = vi.fn();
const { toastSuccess } = vi.hoisted(() => ({ toastSuccess: vi.fn() }));
const getString = vi.fn();
const setString = vi.fn();
const friends = ref([]);
const pinnedToolKeys = ref(new Set());
let routeName = 'not-tools';

globalThis.AppApi = {
    OpenVrcPhotosFolder: openVrcPhotosFolder
};

vi.mock('vue-router', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useRouter: () => ({ push }),
        useRoute: () => ({
            get name() {
                return routeName;
            }
        })
    };
});

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key) => key })
}));

vi.mock('pinia', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        storeToRefs: (store) => store
    };
});

vi.mock('../../../stores', () => ({
    useFriendStore: () => ({ friends }),
    useGalleryStore: () => ({ showGalleryPage }),
    useToolsStore: () => ({ openDialog }),
    useAdvancedSettingsStore: () => ({ showVRChatConfig }),
    useLaunchStore: () => ({ showLaunchOptions }),
    useVrcxStore: () => ({ showRegistryBackupDialog })
}));

vi.mock('../../../composables/useToolNavPinning', () => ({
    useToolNavPinning: () => ({
        pinToolToNav,
        pinnedToolKeys,
        refreshPinnedState: vi.fn().mockResolvedValue(undefined),
        unpinToolFromNav
    })
}));

vi.mock('vue-sonner', () => ({
    toast: {
        success: toastSuccess,
        error: vi.fn()
    }
}));

vi.mock('../../../services/config.js', () => ({
    default: {
        getString: (...args) => getString(...args),
        setString: (...args) => setString(...args)
    }
}));

vi.mock('../dialogs/AutoChangeStatusDialog.vue', () => ({
    default: { template: '<div />' }
}));

vi.mock('../../../components/ui/tooltip', () => ({
    TooltipWrapper: {
        template: '<div><slot /></div>',
        props: ['content', 'disabled', 'side']
    }
}));

import Tools from '../Tools.vue';

function findToolItemByTitle(wrapper, titleKey) {
    return wrapper
        .findAllComponents({ name: 'ToolItem' })
        .find((component) => component.text().includes(titleKey));
}

function findCategoryHeaderByTitle(wrapper, titleKey) {
    return wrapper
        .findAll('div.cursor-pointer')
        .find((node) => node.text().includes(titleKey));
}

describe('Tools.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        routeName = 'not-tools';
        pinnedToolKeys.value = new Set();
        getString.mockResolvedValue('{}');
        openVrcPhotosFolder.mockResolvedValue(true);
    });

    test('clicking screenshot tool navigates to screenshot metadata', async () => {
        const wrapper = mount(Tools);
        await flushPromises();

        const screenshotItem = findToolItemByTitle(
            wrapper,
            'view.tools.pictures.screenshot'
        );

        expect(screenshotItem).toBeTruthy();
        await screenshotItem.trigger('click');

        expect(push).toHaveBeenCalledWith({ name: 'screenshot-metadata' });
    });

    test('clicking gallery tool calls showGalleryPage', async () => {
        const wrapper = mount(Tools);
        await flushPromises();

        const galleryItem = findToolItemByTitle(
            wrapper,
            'view.tools.pictures.gallery'
        );

        expect(galleryItem).toBeTruthy();
        await galleryItem.trigger('click');

        expect(push).toHaveBeenCalledWith({ name: 'gallery' });
    });

    test('toggle category persists collapsed state', async () => {
        const wrapper = mount(Tools);
        await flushPromises();

        const imageCategoryHeader = findCategoryHeaderByTitle(
            wrapper,
            'view.tools.pictures.header'
        );

        expect(imageCategoryHeader).toBeTruthy();
        await imageCategoryHeader.trigger('click');

        expect(setString).toHaveBeenCalledWith(
            'VRCX_toolsCategoryCollapsed',
            expect.stringContaining('"image":true')
        );
    });

    test('loads stored collapsed state before toggling category', async () => {
        getString.mockResolvedValue('{"image":true}');

        const wrapper = mount(Tools);
        await flushPromises();

        const imageCategoryHeader = findCategoryHeaderByTitle(
            wrapper,
            'view.tools.pictures.header'
        );

        expect(imageCategoryHeader).toBeTruthy();
        await imageCategoryHeader.trigger('click');

        expect(setString).toHaveBeenCalledWith(
            'VRCX_toolsCategoryCollapsed',
            expect.stringContaining('"image":false')
        );
    });

    test('filters the catalog by localized title and description text', async () => {
        const wrapper = mount(Tools);
        await flushPromises();

        await wrapper
            .get('[data-testid="tools-search"]')
            .setValue('screenshot_description');

        const visibleTools = wrapper.findAllComponents({ name: 'ToolItem' });
        expect(visibleTools).toHaveLength(1);
        expect(visibleTools[0].text()).toContain(
            'view.tools.pictures.screenshot'
        );
        expect(
            wrapper.get('[data-testid="tools-result-count"]').text()
        ).toContain('1');
    });

    test('pins a tool without dispatching its primary action', async () => {
        const wrapper = mount(Tools);
        await flushPromises();

        const screenshotItem = findToolItemByTitle(
            wrapper,
            'view.tools.pictures.screenshot'
        );
        await screenshotItem
            .get('button[title="nav_menu.custom_nav.pin_to_nav"]')
            .trigger('click');

        expect(pinToolToNav).toHaveBeenCalledWith('screenshot-metadata');
        expect(push).not.toHaveBeenCalled();
    });

    test('dispatches dialog, store, and native actions through the existing tool action contract', async () => {
        const wrapper = mount(Tools);
        await flushPromises();

        await findToolItemByTitle(wrapper, 'view.tools.group.calendar').trigger(
            'click'
        );
        expect(openDialog).toHaveBeenCalledWith('groupCalendar');

        await findToolItemByTitle(
            wrapper,
            'view.tools.system_tools.vrchat_config'
        ).trigger('click');
        expect(showVRChatConfig).toHaveBeenCalledTimes(1);

        await findToolItemByTitle(
            wrapper,
            'view.tools.pictures.pictures.vrc_photos'
        ).trigger('click');
        await flushPromises();
        expect(openVrcPhotosFolder).toHaveBeenCalledTimes(1);
        expect(toastSuccess).toHaveBeenCalledWith('message.file.folder_opened');
    });
});
