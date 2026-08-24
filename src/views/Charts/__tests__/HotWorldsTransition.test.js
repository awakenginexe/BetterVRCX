import { describe, expect, test, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref, Transition } from 'vue';

const getHotWorlds = vi.fn();

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key) => key })
}));

vi.mock('pinia', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, storeToRefs: (store) => store };
});

vi.mock('@/services/database', () => ({
    database: {
        getHotWorlds: (...args) => getHotWorlds(...args),
        getHotWorldFriendDetail: vi.fn().mockResolvedValue([])
    }
}));

vi.mock('@/coordinators/userCoordinator', () => ({ showUserDialog: vi.fn() }));
vi.mock('@/coordinators/worldCoordinator', () => ({
    showWorldDialog: vi.fn()
}));
vi.mock('@/components/BackToTop.vue', () => ({
    default: { template: '<div />' }
}));
vi.mock('@/stores', () => ({
    useAppearanceSettingsStore: () => ({ isDarkMode: ref(false) })
}));

import HotWorlds from '../components/HotWorlds.vue';

const stubs = {
    Button: { template: '<button><slot /></button>' },
    DataTableEmpty: { template: '<div />' },
    HoverCard: { template: '<div><slot /></div>' },
    HoverCardContent: { template: '<div><slot /></div>' },
    HoverCardTrigger: { template: '<div><slot /></div>' },
    Sheet: { template: '<div><slot /></div>' },
    SheetContent: { template: '<section><slot /></section>' },
    SheetHeader: { template: '<div><slot /></div>' },
    SheetTitle: { template: '<h2><slot /></h2>' },
    Separator: { template: '<hr />' },
    ToggleGroup: { template: '<div><slot /></div>' },
    ToggleGroupItem: { template: '<button><slot /></button>' }
};

describe('Hot Worlds route transitions', () => {
    beforeEach(() => {
        globalThis.ResizeObserver = class {
            observe() {}
            unobserve() {}
        };
        getHotWorlds.mockReset().mockResolvedValue([
            {
                worldId: 'wrld_1',
                worldName: 'World One',
                uniqueFriends: 1,
                visitCount: 1,
                trend: 'stable'
            }
        ]);
    });

    test('renders the next page after leaving Hot Worlds through an out-in transition', async () => {
        const NextPage = defineComponent({
            name: 'NextPage',
            render: () => h('div', { 'data-testid': 'next-page' }, 'next')
        });
        const host = defineComponent({
            setup() {
                const activePage = ref('hot');
                return { activePage };
            },
            render() {
                return h(
                    Transition,
                    { name: 'page', mode: 'out-in' },
                    {
                        default: () =>
                            this.activePage === 'hot'
                                ? h(HotWorlds)
                                : h(NextPage)
                    }
                );
            }
        });

        const wrapper = mount(host, {
            global: { stubs: { ...stubs, transition: false } }
        });
        await flushPromises();

        expect(wrapper.get('.analytics-workspace').exists()).toBe(true);

        wrapper.vm.activePage = 'next';
        await nextTick();
        await flushPromises();
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(wrapper.get('[data-testid="next-page"]').exists()).toBe(true);
    });
});
