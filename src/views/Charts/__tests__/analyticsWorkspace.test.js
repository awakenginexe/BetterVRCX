import { beforeEach, describe, expect, test, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';

const mocks = vi.hoisted(() => ({
    resizeObservers: [],
    getHotWorlds: vi.fn(),
    getHotWorldFriendDetail: vi.fn(),
    cancelGraph: vi.fn(),
    changeDate: vi.fn(),
    changeDetailVisibility: vi.fn(),
    echartResize: vi.fn(),
    echartOff: vi.fn(),
    echartOn: vi.fn(),
    echartSetOption: vi.fn(),
    echartClear: vi.fn()
}));

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key) => key })
}));

vi.mock('pinia', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, storeToRefs: (store) => store };
});

vi.mock('@/services/database', () => ({
    database: {
        getHotWorlds: (...args) => mocks.getHotWorlds(...args),
        getHotWorldFriendDetail: (...args) =>
            mocks.getHotWorldFriendDetail(...args),
        getMutualGraphSnapshot: vi.fn().mockResolvedValue(new Map()),
        getMutualGraphMeta: vi.fn().mockResolvedValue(new Map())
    }
}));

vi.mock('@/coordinators/userCoordinator', () => ({ showUserDialog: vi.fn() }));
vi.mock('@/coordinators/worldCoordinator', () => ({
    showWorldDialog: vi.fn()
}));
vi.mock('@/components/BackToTop.vue', () => ({
    default: { template: '<div />' }
}));
vi.mock('@/composables/useUserDisplay', () => ({
    useUserDisplay: () => ({ userImage: () => '', userStatusClass: () => '' })
}));
vi.mock('@/services/watchState', () => ({
    watchState: { isFriendsLoaded: false, isLoggedIn: false }
}));
vi.mock('@/services/config', () => ({
    default: {
        getInt: vi.fn().mockResolvedValue(800),
        getFloat: vi.fn().mockResolvedValue(0.1),
        setInt: vi.fn(),
        setFloat: vi.fn()
    }
}));

vi.mock('@/stores', () => ({
    useAppearanceSettingsStore: () => ({
        isDarkMode: ref(false),
        dtHour12: ref(false),
        weekStartsOn: ref(0)
    }),
    useFriendStore: () => ({
        friends: ref(new Map()),
        allFavoriteFriendIds: ref(new Set())
    }),
    useUserStore: () => ({
        currentUser: ref({ id: 'usr_me' }),
        cachedUsers: new Map()
    }),
    useModalStore: () => ({
        confirm: vi.fn().mockResolvedValue({ ok: false })
    }),
    useChartsStore: () => ({
        mutualGraphFetchState: { processedFriends: 1 },
        mutualGraphStatus: {
            isFetching: true,
            hasFetched: false,
            cancelRequested: false
        },
        requestMutualGraphCancel: mocks.cancelGraph,
        fetchMutualGraph: vi.fn(),
        fetchSingleFriendMutuals: vi.fn(),
        markMutualGraphLoaded: vi.fn()
    })
}));

vi.mock('../composables/useInstanceActivitySettings', () => ({
    useInstanceActivitySettings: () => ({
        barWidth: ref(25),
        isDetailVisible: ref(true),
        isSoloInstanceVisible: ref(true),
        isNoFriendInstanceVisible: ref(true),
        initializeSettings: vi.fn(),
        changeBarWidth: vi.fn(),
        changeIsDetailInstanceVisible: mocks.changeDetailVisibility,
        changeIsSoloInstanceVisible: vi.fn(),
        changeIsNoFriendInstanceVisible: vi.fn(),
        handleChangeSettings: vi.fn()
    })
}));
vi.mock('../composables/useInstanceActivityData', () => ({
    useInstanceActivityData: () => ({
        activityData: ref([]),
        activityDetailData: ref([]),
        allDateOfActivity: ref([]),
        worldNameArray: ref([]),
        getAllDateOfActivity: vi.fn(),
        getWorldNameData: vi.fn(),
        getActivityData: vi.fn().mockResolvedValue(undefined)
    })
}));
vi.mock('../composables/useDateNavigation', () => ({
    useDateNavigation: () => ({
        selectedDate: ref(new Date('2026-08-13T00:00:00')),
        isNextDayBtnDisabled: ref(false),
        isPrevDayBtnDisabled: ref(false),
        changeSelectedDateFromBtn: mocks.changeDate,
        getDatePickerDisabledDate: () => false
    })
}));
vi.mock('../composables/useActivityDataProcessor', () => ({
    useActivityDataProcessor: () => ({
        totalOnlineTime: ref(0),
        filteredActivityDetailData: ref([])
    })
}));
vi.mock('../composables/useChartHelpers', () => ({
    useChartHelpers: () => ({
        isDetailDataFiltered: () => false,
        findMatchingDetailData: () => null,
        generateYAxisLabel: (x) => x
    })
}));
vi.mock('../composables/useIntersectionObserver', () => ({
    useIntersectionObserver: () => ({ handleIntersectionObserver: vi.fn() })
}));
vi.mock('echarts', () => ({
    init: () => ({
        resize: mocks.echartResize,
        off: mocks.echartOff,
        on: mocks.echartOn,
        setOption: mocks.echartSetOption,
        clear: mocks.echartClear,
        dispose: vi.fn()
    })
}));
vi.mock('@sigma/node-border', () => ({
    createNodeBorderProgram: () => class {}
}));
vi.mock('@sigma/edge-curve', () => ({ default: class {} }));
vi.mock('graphology', () => ({ default: class {} }));
vi.mock('sigma', () => ({ default: class {} }));
vi.mock('graphology-communities-louvain', () => ({ default: () => ({}) }));
vi.mock('../graphLayoutWorker.js?worker&inline', () => ({ default: class {} }));

import HotWorlds from '../components/HotWorlds.vue';
import InstanceActivity from '../components/InstanceActivity.vue';
import MutualFriends from '../components/MutualFriends.vue';

const ButtonStub = {
    props: ['ariaLabel'],
    emits: ['click'],
    template:
        '<button :aria-label="ariaLabel" v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>'
};
const SwitchStub = {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
        '<button data-testid="instance-detail-filter" @click="$emit(\'update:modelValue\', false)">filter</button>'
};
const ToggleGroupStub = {
    name: 'ToggleGroup',
    emits: ['update:modelValue'],
    template: '<div><slot /></div>'
};
const sharedStubs = {
    Button: ButtonStub,
    BackToTop: { template: '<div />' },
    TooltipWrapper: { template: '<div><slot /></div>' },
    HoverCard: { template: '<div><slot /></div>' },
    HoverCardTrigger: { template: '<div><slot /></div>' },
    HoverCardContent: { template: '<div><slot /></div>' },
    Popover: { template: '<div><slot /></div>' },
    PopoverTrigger: { template: '<div><slot /></div>' },
    PopoverContent: { template: '<div><slot /></div>' },
    Sheet: { template: '<div><slot /></div>' },
    SheetContent: { template: '<section><slot /></section>' },
    SheetHeader: { template: '<div><slot /></div>' },
    SheetTitle: { template: '<h2><slot /></h2>' },
    SheetTrigger: { template: '<div><slot /></div>' },
    ToggleGroup: ToggleGroupStub,
    ToggleGroupItem: { template: '<button><slot /></button>' },
    DataTableEmpty: { template: '<div />' },
    Separator: { template: '<hr />' },
    Progress: { template: '<div />' },
    Slider: { template: '<div />' },
    Spinner: { template: '<div />' },
    VirtualCombobox: { template: '<div />' },
    ContextMenu: { template: '<div><slot /></div>' },
    ContextMenuTrigger: { template: '<div><slot /></div>' },
    ContextMenuContent: { template: '<div><slot /></div>' },
    ContextMenuItem: { template: '<button><slot /></button>' },
    ContextMenuSeparator: { template: '<hr />' },
    Field: { template: '<div><slot /></div>' },
    FieldContent: { template: '<div><slot /></div>' },
    FieldGroup: { template: '<div><slot /></div>' },
    FieldLabel: { template: '<label><slot /></label>' },
    Empty: { template: '<div><slot /></div>' },
    EmptyHeader: { template: '<div><slot /></div>' },
    EmptyDescription: { template: '<div><slot /></div>' },
    ButtonGroup: { template: '<div><slot /></div>' },
    Calendar: { template: '<div />' },
    InstanceActivityDetail: { template: '<div />' },
    Switch: SwitchStub
};

function installResizeObserver() {
    mocks.resizeObservers = [];
    globalThis.ResizeObserver = class {
        constructor(callback) {
            this.callback = callback;
            this.observed = [];
            mocks.resizeObservers.push(this);
        }
        observe(element) {
            this.observed.push(element);
        }
        unobserve() {}
        disconnect() {}
    };
}

function setClientHeight(element, height) {
    Object.defineProperty(element, 'clientHeight', {
        configurable: true,
        value: height
    });
}

describe('analytics workspace behavior', () => {
    beforeEach(() => {
        installResizeObserver();
        mocks.getHotWorlds.mockReset().mockResolvedValue([
            {
                worldId: 'wrld_1',
                worldName: 'World One',
                uniqueFriends: 2,
                visitCount: 3,
                trend: 'rising'
            }
        ]);
        mocks.getHotWorldFriendDetail
            .mockReset()
            .mockResolvedValue([
                { userId: 'usr_1', displayName: 'A', visitCount: 1 }
            ]);
        mocks.cancelGraph.mockReset();
        mocks.changeDate.mockReset();
        mocks.changeDetailVisibility.mockReset();
        mocks.echartResize.mockReset();
    });

    test('loads a selected Hot Worlds window, opens detail retrieval, and tracks the containing workspace height', async () => {
        const wrapper = mount(HotWorlds, { global: { stubs: sharedStubs } });
        const workspace = wrapper.get('.analytics-workspace');
        setClientHeight(workspace.element, 180);
        mocks.resizeObservers.forEach((observer) => observer.callback());
        await flushPromises();

        await wrapper
            .findComponent(ToggleGroupStub)
            .vm.$emit('update:modelValue', '7');
        await flushPromises();
        await wrapper
            .get('[data-testid="hot-worlds-open-detail"]')
            .trigger('click');
        await flushPromises();

        expect(mocks.getHotWorlds).toHaveBeenLastCalledWith(7);
        expect(mocks.getHotWorldFriendDetail).toHaveBeenCalledWith('wrld_1', 7);
        expect(
            wrapper.get('.analytics-workspace__content').element.style.height
        ).toBe('100%');
        expect(
            mocks.resizeObservers.some((observer) =>
                observer.observed.includes(workspace.element)
            )
        ).toBe(true);
    });

    test('keeps the Mutual Friends stop action named, announced, and wired to cancellation', async () => {
        const wrapper = mount(MutualFriends, {
            global: { stubs: sharedStubs }
        });
        await nextTick();

        const cancel = wrapper.get('[data-testid="mutual-friends-cancel"]');
        expect(cancel.attributes('aria-label')).toBe(
            'view.charts.mutual_friend.actions.stop_fetching'
        );
        expect(wrapper.get('[aria-live="polite"]').text()).toContain('1 / 0');
        await cancel.trigger('click');

        expect(mocks.cancelGraph).toHaveBeenCalledTimes(1);
    });

    test('runs Instance Activity date navigation and detail filter controls through their composable callbacks', async () => {
        const wrapper = mount(InstanceActivity, {
            global: { stubs: sharedStubs }
        });
        await flushPromises();

        await wrapper
            .get('[aria-label="view.charts.instance_activity.previous_day"]')
            .trigger('click');
        await wrapper
            .get('[data-testid="instance-detail-filter"]')
            .trigger('click');

        expect(mocks.changeDate).toHaveBeenCalledWith(false);
        expect(mocks.changeDetailVisibility).toHaveBeenCalled();
        expect(
            wrapper
                .get('[aria-label="view.charts.instance_activity.refresh"]')
                .exists()
        ).toBe(true);
    });
});
