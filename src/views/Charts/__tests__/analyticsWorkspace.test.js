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
    echartClear: vi.fn(),
    snapshot: vi.fn().mockResolvedValue(new Map()),
    watchState: { isFriendsLoaded: false, isLoggedIn: false },
    graphStatus: {
        isFetching: true,
        hasFetched: false,
        cancelRequested: false
    },
    sigma: []
}));

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key, values) =>
            values?.count === undefined ? key : `${key}: ${values.count}`
    })
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
        getMutualGraphSnapshot: mocks.snapshot,
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
    watchState: mocks.watchState
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
        mutualGraphStatus: mocks.graphStatus,
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
vi.mock('@sigma/node-image', () => ({
    createNodeImageProgram: () => class {}
}));
vi.mock('sigma/rendering', () => ({
    createNodeCompoundProgram: () => class {}
}));
vi.mock('@sigma/edge-curve', () => ({ default: class {} }));
vi.mock('sigma', () => ({
    default: class {
        constructor(graph, container, settings) {
            this.graph = graph;
            this.settings = settings;
            this.events = {};
            this.camera = {
                animate: vi.fn(),
                animatedZoom: vi.fn(),
                animatedUnzoom: vi.fn(),
                animatedReset: vi.fn(),
                getState: () => ({ x: 0.5, y: 0.5, ratio: 1, angle: 0 }),
                setState: vi.fn()
            };
            mocks.sigma.push(this);
        }
        setGraph(graph) {
            this.graph = graph;
        }
        setSetting(key, value) {
            this.settings[key] = value;
        }
        getNodeDisplayData(node) {
            return this.graph.getNodeAttributes(node);
        }
        getCamera() {
            return this.camera;
        }
        getDimensions() {
            return { width: 1000, height: 700 };
        }
        framedGraphToViewport(data) {
            return { x: data.x, y: data.y };
        }
        on(event, callback) {
            this.events[event] = callback;
        }
        removeAllListeners() {
            this.events = {};
        }
        refresh() {}
        kill() {}
    }
}));
vi.mock('graphology-communities-louvain', () => ({ default: () => ({}) }));
vi.mock('../graphLayoutWorker.js?worker&inline', () => ({
    default: class {
        addEventListener(event, callback) {
            if (event === 'message') this.receive = callback;
        }
        postMessage({ requestId, nodes }) {
            this.receive({
                data: {
                    requestId,
                    positions: Object.fromEntries(
                        nodes.map(({ id }, i) => [
                            id,
                            { x: i * 100, y: (i % 2) * 100 }
                        ])
                    )
                }
            });
        }
        terminate() {}
    }
}));

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
        mocks.watchState.isFriendsLoaded = false;
        mocks.watchState.isLoggedIn = false;
        Object.assign(mocks.graphStatus, {
            isFetching: true,
            hasFetched: false
        });
        mocks.snapshot.mockReset().mockResolvedValue(new Map());
        mocks.sigma.length = 0;
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
        const ranking = wrapper.get('[data-testid="hot-worlds-ranking"]');
        expect(ranking.classes()).toContain('analytics-workspace__ranking');
        expect(ranking.classes()).not.toContain('lg:flex-row');
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

    test('focuses cached connections, restores hover focus, and wires camera controls without fetching', async () => {
        Object.assign(mocks.watchState, {
            isFriendsLoaded: true,
            isLoggedIn: true
        });
        mocks.graphStatus.isFetching = false;
        mocks.snapshot.mockResolvedValue(
            new Map([
                ['usr_a', ['usr_b']],
                ['usr_b', ['usr_a']],
                ['usr_c', []]
            ])
        );
        const bounds = vi
            .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
            .mockReturnValue({ width: 1000, height: 700 });
        const wrapper = mount(MutualFriends, {
            global: { stubs: sharedStubs }
        });
        await flushPromises();
        const renderer = mocks.sigma.at(-1);
        expect(
            wrapper.get('[data-testid="mutual-network-counts"]').text()
        ).toContain('3');
        expect(renderer.graph.size).toBe(1);
        const node = (id) =>
            renderer.settings.nodeReducer(
                id,
                renderer.graph.getNodeAttributes(id)
            );
        const edge = renderer.graph.edges()[0];

        wrapper.vm.navigateToFriend('usr_a');
        await nextTick();
        expect(node('usr_a').forceLabel).toBe(true);
        expect(node('usr_c').label).toBe('');
        expect(node('usr_c').image).toBeNull();
        expect(renderer.camera.animate).toHaveBeenCalledWith(
            expect.objectContaining({ x: 50, y: 50, ratio: 0.3 }),
            expect.any(Object)
        );
        expect(renderer.settings.edgeReducer(edge, {}).hidden).toBe(false);
        renderer.events.enterNode({ node: 'usr_c' });
        expect(renderer.settings.edgeReducer(edge, {}).hidden).toBe(true);
        renderer.events.leaveNode();
        expect(node('usr_a').forceLabel).toBe(true);
        expect(renderer.settings.edgeReducer(edge, {}).hidden).toBe(false);

        await wrapper
            .get('[aria-label="view.charts.mutual_friend.actions.zoom_in"]')
            .trigger('click');
        await wrapper
            .get('[aria-label="view.charts.mutual_friend.actions.zoom_out"]')
            .trigger('click');
        expect(renderer.camera.animatedZoom).toHaveBeenCalledOnce();
        expect(renderer.camera.animatedUnzoom).toHaveBeenCalledOnce();
        await wrapper
            .get('[aria-label="view.charts.mutual_friend.actions.reset_view"]')
            .trigger('click');
        expect(renderer.camera.animatedReset).toHaveBeenCalledOnce();
        expect(node('usr_c').label).toBe('usr_c');
        expect(mocks.snapshot).toHaveBeenCalledOnce();
        wrapper.vm.navigateToFriend('usr_a');
        await nextTick();
        await wrapper.vm.applyGraph(
            new Map([
                [
                    'usr_d',
                    { friend: { id: 'usr_d' }, mutuals: [{ id: 'usr_b' }] }
                ],
                ['usr_c', { friend: { id: 'usr_c' }, mutuals: [] }]
            ])
        );
        await nextTick();
        expect(wrapper.find('.mutual-network__selection').exists()).toBe(false);
        expect(
            wrapper.vm.excludePickerGroups[0].items.map((item) => item.value)
        ).toEqual(['usr_b', 'usr_c', 'usr_d']);
        const frame = vi
            .spyOn(window, 'requestAnimationFrame')
            .mockReturnValue(42);
        const cancelFrame = vi.spyOn(window, 'cancelAnimationFrame');
        mocks.resizeObservers.forEach((observer) => observer.callback());
        expect(frame).toHaveBeenCalledOnce();
        wrapper.unmount();
        expect(cancelFrame).toHaveBeenCalledWith(42);
        frame.mockRestore();
        cancelFrame.mockRestore();
        bounds.mockRestore();
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
