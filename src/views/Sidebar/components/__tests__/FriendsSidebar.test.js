import { beforeEach, describe, expect, test, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

const mocks = vi.hoisted(() => ({
    friendStore: {
        allFavoriteOnlineFriends: { value: [] },
        allFavoriteFriendIds: { value: new Set() },
        onlineFriends: { value: [] },
        activeFriends: { value: [] },
        offlineFriends: { value: [] },
        friendsInSameInstance: { value: [] }
    },
    appearanceStore: {
        isSidebarGroupByInstance: { value: false },
        isHideFriendsInSameInstance: { value: false },
        isSameInstanceAboveFavorites: { value: false },
        isSidebarDivideByFriendGroup: { value: false },
        sidebarFavoriteGroups: { value: [] },
        sidebarFavoriteGroupOrder: { value: [] },
        sidebarSortMethods: { value: [] }
    },
    advancedStore: {
        gameLogDisabled: { value: false }
    },
    userStore: {
        showSendBoopDialog: vi.fn(),
        showEditProfileDialog: vi.fn(),
        editProfileDialog: {
            value: { visible: false }
        },
        currentUser: {
            value: {
                id: 'usr_me',
                displayName: 'Me',
                $userColour: '#fff',
                statusDescription: 'Ready',
                status: 'active',
                statusHistory: [],
                isBoopingEnabled: true,
                $locationTag: 'wrld_me:123',
                $travelingToLocation: ''
            }
        }
    },
    launchStore: {
        showLaunchDialog: vi.fn()
    },
    favoriteStore: {
        favoriteFriendGroups: { value: [] },
        groupedByGroupKeyFavoriteFriends: { value: {} },
        localFriendFavorites: { value: {} }
    },
    locationStore: {
        lastLocation: {
            value: { location: 'wrld_home:123', friendList: new Map() }
        },
        lastLocationDestination: { value: '' }
    },
    gameStore: {
        isGameRunning: { value: true }
    },
    instanceStore: {
        cachedInstances: new Map()
    },
    worldStore: {
        cachedWorlds: new Map()
    },
    configRepository: {
        getBool: vi.fn(),
        setBool: vi.fn(),
        getArray: vi.fn(),
        setArray: vi.fn()
    },
    notificationRequest: {
        sendRequestInvite: vi.fn().mockResolvedValue({}),
        sendInvite: vi.fn().mockResolvedValue({})
    },
    worldRequest: {},
    instanceRequest: {
        selfInvite: vi.fn().mockResolvedValue({})
    },
    userRequest: {
        saveCurrentUser: vi.fn().mockResolvedValue({})
    },
    queryRequest: {
        fetch: vi.fn().mockResolvedValue({})
    },
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        warning: vi.fn()
    },
    lastKnownPresenceStore: {
        enabled: require('vue').ref(false),
        observations: require('vue').ref(new Map())
    }
}));

vi.mock('pinia', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        storeToRefs: (store) => store
    };
});

vi.mock('@tanstack/vue-virtual', () => ({
    useVirtualizer: (optionsRef) => ({
        value: {
            getVirtualItems: () => {
                const options = optionsRef.value;
                return Array.from({ length: options.count }, (_, index) => ({
                    index,
                    key: options.getItemKey?.(index) ?? index,
                    start: index * 52
                }));
            },
            getTotalSize: () => optionsRef.value.count * 52,
            measure: vi.fn(),
            measureElement: vi.fn()
        }
    })
}));

vi.mock('../../../../stores', () => ({
    useFriendStore: () => mocks.friendStore,
    useAppearanceSettingsStore: () => mocks.appearanceStore,
    useAdvancedSettingsStore: () => mocks.advancedStore,
    useFavoriteStore: () => mocks.favoriteStore,
    useGameStore: () => mocks.gameStore,
    useLaunchStore: () => mocks.launchStore,
    useLocationStore: () => mocks.locationStore,
    useInstanceStore: () => mocks.instanceStore,
    useWorldStore: () => mocks.worldStore,
    useAuthStore: () => ({}),
    useModalStore: () => ({}),
    useGalleryStore: () => ({ refreshGalleryTable: vi.fn() }),
    useGeneralSettingsStore: () => ({
        disableGpuAcceleration: { value: false }
    }),
    useUserStore: () => mocks.userStore
}));

vi.mock('@/stores/settings/general', () => ({
    useGeneralSettingsStore: () => ({
        disableGpuAcceleration: { value: false }
    })
}));

vi.mock('../../../../coordinators/userCoordinator', () => ({
    showUserDialog: vi.fn()
}));

vi.mock('../../../../shared/utils', () => ({
    getFriendsSortFunction: () => (a, b) => a.id.localeCompare(b.id),
    isRealInstance: (location) =>
        typeof location === 'string' && location.startsWith('wrld_'),
    userImage: vi.fn(() => 'https://example.com/avatar.png'),
    userStatusClass: vi.fn(() => ''),
    debounce: vi.fn((fn) => fn),
    copyToClipboard: vi.fn(),
    parseLocation: vi.fn((location) => ({
        worldId: location?.split(':')[0] ?? '',
        instanceId: location?.split(':')[1] ?? '',
        tag: location ?? ''
    }))
}));

vi.mock('../../../../shared/utils/invite.js', () => ({
    checkCanInvite: vi.fn(() => true),
    checkCanInviteSelf: vi.fn(() => true)
}));

vi.mock('../../../../shared/utils/location.js', () => ({
    getFriendsLocations: vi.fn(() => 'wrld_same:1')
}));

vi.mock('../../../../services/config', () => ({
    default: mocks.configRepository
}));

vi.mock('../../../../addons/lastKnownPresence/store', () => ({
    useLastKnownPresenceStore: () => mocks.lastKnownPresenceStore
}));

vi.mock('../../../../api', () => ({
    notificationRequest: mocks.notificationRequest,
    worldRequest: mocks.worldRequest,
    instanceRequest: mocks.instanceRequest,
    userRequest: mocks.userRequest,
    queryRequest: mocks.queryRequest
}));

vi.mock('vue-sonner', () => ({
    toast: mocks.toast
}));

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key) => key,
        locale: require('vue').ref('en')
    })
}));

vi.mock('../../../../components/ui/context-menu', () => ({
    ContextMenu: { template: '<div><slot /></div>' },
    ContextMenuTrigger: { template: '<div><slot /></div>' },
    ContextMenuContent: { template: '<div><slot /></div>' },
    ContextMenuItem: {
        emits: ['click'],
        props: ['disabled'],
        template:
            '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
    },
    ContextMenuSeparator: { template: '<hr />' },
    ContextMenuShortcut: { template: '<span><slot /></span>' },
    ContextMenuSub: { template: '<div><slot /></div>' },
    ContextMenuSubContent: { template: '<div><slot /></div>' },
    ContextMenuSubTrigger: { template: '<div><slot /></div>' },
    ContextMenuCheckboxItem: {
        emits: ['click'],
        props: ['modelValue'],
        template: '<button @click="$emit(\'click\')"><slot /></button>'
    }
}));

vi.mock('../../../../components/BackToTop.vue', () => ({
    default: { template: '<div data-testid="back-to-top" />' }
}));

vi.mock('../../../../components/Location.vue', () => ({
    default: {
        props: ['location', 'traveling', 'link'],
        template: '<span data-testid="location">{{ location }}</span>'
    }
}));

vi.mock('../FriendItem.vue', () => ({
    default: {
        props: ['friend', 'observation'],
        template:
            '<div data-testid="friend-item">{{ friend.id }}{{ observation ? ":last-seen" : "" }}</div>'
    }
}));

vi.mock('lucide-vue-next', () => ({
    ChevronDown: { template: '<span data-testid="chevron" />' },
    Clock: { template: '<span data-testid="clock" />' },
    User: { template: '<i />' }
}));

vi.mock('../../../../composables/useRecentActions', () => ({
    isActionRecent: vi.fn(() => false),
    recordRecentAction: vi.fn()
}));

import FriendsSidebar from '../FriendsSidebar.vue';

function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

function makeFriend(id, location = 'wrld_online:1') {
    return {
        id,
        state: 'online',
        pendingOffline: false,
        ref: {
            location,
            status: location === 'private' ? 'busy' : 'active',
            $location: {
                tag: location
            }
        }
    };
}

describe('FriendsSidebar.vue', () => {
    beforeEach(() => {
        mocks.friendStore.allFavoriteOnlineFriends.value = [];
        mocks.friendStore.allFavoriteFriendIds.value = new Set();
        mocks.friendStore.onlineFriends.value = [];
        mocks.friendStore.activeFriends.value = [];
        mocks.friendStore.offlineFriends.value = [];
        mocks.friendStore.friendsInSameInstance.value = [];
        mocks.friendStore.friends = new Map();
        mocks.lastKnownPresenceStore.enabled.value = false;
        mocks.lastKnownPresenceStore.observations.value = new Map();
        mocks.instanceStore.cachedInstances = new Map();

        mocks.appearanceStore.isSidebarGroupByInstance.value = false;
        mocks.appearanceStore.isHideFriendsInSameInstance.value = false;
        mocks.appearanceStore.isSidebarDivideByFriendGroup.value = false;
        mocks.appearanceStore.sidebarFavoriteGroups.value = [];
        mocks.appearanceStore.sidebarFavoriteGroupOrder.value = [];
        mocks.appearanceStore.sidebarSortMethods.value = [];

        mocks.configRepository.getBool.mockImplementation(
            (_key, defaultValue) => Promise.resolve(defaultValue ?? false)
        );
        mocks.configRepository.setBool.mockResolvedValue(undefined);
        mocks.configRepository.getArray.mockResolvedValue([]);
        mocks.configRepository.setArray.mockResolvedValue(undefined);
        vi.clearAllMocks();
    });

    test('renders online section and friend rows', async () => {
        mocks.friendStore.onlineFriends.value = [makeFriend('usr_online')];

        const wrapper = mount(FriendsSidebar);
        await flushPromises();
        await nextTick();

        expect(wrapper.text()).toContain('side_panel.online');
        expect(wrapper.findAll('[data-testid="friend-item"]').length).toBe(1);
        expect(wrapper.text()).toContain('usr_online');
    });

    test('clicking online header collapses online rows and persists state', async () => {
        mocks.friendStore.onlineFriends.value = [makeFriend('usr_online')];
        const wrapper = mount(FriendsSidebar);
        await flushPromises();
        await nextTick();

        const onlineHeader = wrapper
            .findAll('div.cursor-pointer')
            .find((node) => node.text().includes('side_panel.online'));
        expect(onlineHeader).toBeTruthy();

        await onlineHeader.trigger('click');
        await flushPromises();
        await nextTick();

        expect(wrapper.findAll('[data-testid="friend-item"]').length).toBe(0);
        expect(mocks.configRepository.setBool).toHaveBeenCalledWith(
            'VRCX_isFriendsGroupOnline',
            false
        );
    });

    test('renders same-instance section when grouping is enabled', async () => {
        mocks.appearanceStore.isSidebarGroupByInstance.value = true;
        mocks.friendStore.friendsInSameInstance.value = [
            [
                makeFriend('usr_a', 'wrld_same:1'),
                makeFriend('usr_b', 'wrld_same:1')
            ]
        ];

        const wrapper = mount(FriendsSidebar);
        await flushPromises();
        await nextTick();

        expect(wrapper.text()).toContain('side_panel.same_instance');
        expect(wrapper.findAll('[data-testid="friend-item"]').length).toBe(2);
        expect(wrapper.text()).toContain('(2)');
    });

    test('adds session-only last-seen rows only while the addon is enabled', async () => {
        const remembered = makeFriend('usr_remembered', 'private');
        mocks.friendStore.friends = new Map([[remembered.id, remembered]]);
        mocks.lastKnownPresenceStore.enabled.value = true;
        mocks.lastKnownPresenceStore.observations.value = new Map([
            [
                remembered.id,
                {
                    userId: remembered.id,
                    locationTag: 'wrld_history:9~private',
                    worldId: 'wrld_history',
                    observedAt: 100
                }
            ]
        ]);

        const wrapper = mount(FriendsSidebar);
        await flushPromises();
        await nextTick();

        expect(wrapper.text()).toContain(
            'last_known_presence.last_seen_friends'
        );
        expect(wrapper.text()).toContain('usr_remembered:last-seen');
        mocks.lastKnownPresenceStore.enabled.value = false;
        await nextTick();
        expect(wrapper.text()).not.toContain('usr_remembered:last-seen');
        expect(wrapper.text()).not.toContain(
            'last_known_presence.last_seen_friends'
        );
    });

    test('grouping off never duplicates confirmed friends inside historical groups', async () => {
        const live = makeFriend('usr_live', 'wrld_history:9');
        const hidden = makeFriend('usr_hidden', 'private');
        hidden.ref.status = 'busy';
        mocks.friendStore.friends = new Map([
            [live.id, live],
            [hidden.id, hidden]
        ]);
        mocks.friendStore.onlineFriends.value = [live, hidden];
        mocks.lastKnownPresenceStore.enabled.value = true;
        mocks.lastKnownPresenceStore.observations.value = new Map([
            [
                hidden.id,
                {
                    userId: hidden.id,
                    worldId: 'wrld_history',
                    worldName: 'Historical World',
                    locationTag: 'wrld_history:9',
                    observedAt: 100
                }
            ]
        ]);
        const wrapper = mount(FriendsSidebar);
        await flushPromises();
        const liveRows = wrapper
            .findAll('[data-testid="friend-item"]')
            .filter((row) => row.text() === 'usr_live');
        expect(liveRows).toHaveLength(1);
    });

    test('historic-only sidebar groups are explicitly uncertain', async () => {
        const hidden = makeFriend('usr_hidden', 'private');
        hidden.ref.status = 'ask me';
        mocks.friendStore.friends = new Map([[hidden.id, hidden]]);
        mocks.lastKnownPresenceStore.enabled.value = true;
        mocks.lastKnownPresenceStore.observations.value = new Map([
            [
                hidden.id,
                {
                    userId: hidden.id,
                    worldId: 'wrld_history',
                    worldName: 'Historical World',
                    locationTag: 'wrld_history:9',
                    observedAt: 100
                }
            ]
        ]);
        const wrapper = mount(FriendsSidebar);
        await flushPromises();
        expect(wrapper.text()).toContain(
            'last_known_presence.last_known_instance'
        );
        expect(wrapper.text()).toContain('Historical World');
    });

    test('merges hints after confirmed members in the same card without changing the live count', async () => {
        const a = makeFriend('usr_a', 'wrld_same:1');
        const b = makeFriend('usr_b', 'wrld_same:1');
        const hidden = makeFriend('usr_hidden', 'private');
        mocks.friendStore.friends = new Map([
            [a.id, a],
            [b.id, b],
            [hidden.id, hidden]
        ]);
        mocks.friendStore.onlineFriends.value = [a, b, hidden];
        mocks.friendStore.friendsInSameInstance.value = [[a, b]];
        mocks.appearanceStore.isSidebarGroupByInstance.value = true;
        mocks.appearanceStore.isHideFriendsInSameInstance.value = true;
        mocks.lastKnownPresenceStore.enabled.value = true;
        mocks.lastKnownPresenceStore.observations.value = new Map([
            [
                hidden.id,
                {
                    userId: hidden.id,
                    worldId: 'wrld_same',
                    worldName: 'Same World',
                    locationTag: 'wrld_same:1',
                    observedAt: 100
                }
            ]
        ]);
        const wrapper = mount(FriendsSidebar);
        await flushPromises();
        expect(
            wrapper
                .findAll('[data-testid="friend-item"]')
                .map((row) => row.text())
        ).toEqual(['usr_a', 'usr_b', 'usr_hidden:last-seen']);
        expect(wrapper.text()).toContain('(2)');
        expect(wrapper.text()).not.toContain('(3)');
        expect(wrapper.text()).not.toContain(
            'last_known_presence.last_seen_friends'
        );
        expect(mocks.friendStore.friendsInSameInstance.value[0]).toHaveLength(
            2
        );
    });

    test('displays world artwork with grayscale styling on last-known groups when cached', async () => {
        const hidden = makeFriend('usr_hidden', 'private');
        hidden.ref.status = 'ask me';
        mocks.friendStore.friends = new Map([[hidden.id, hidden]]);
        mocks.worldStore.cachedWorlds.set('wrld_history', {
            thumbnailImageUrl: 'https://example.com/sidebar-historical.png'
        });
        mocks.lastKnownPresenceStore.enabled.value = true;
        mocks.lastKnownPresenceStore.observations.value = new Map([
            [
                hidden.id,
                {
                    userId: hidden.id,
                    worldId: 'wrld_history',
                    worldName: 'Historical World',
                    locationTag: 'wrld_history:9',
                    observedAt: 100
                }
            ]
        ]);
        const wrapper = mount(FriendsSidebar);
        await flushPromises();
        const bg = wrapper.find('.grayscale');
        expect(bg.exists()).toBe(true);
        expect(bg.attributes('style')).toContain(
            'https://example.com/sidebar-historical.png'
        );
        expect(bg.classes()).toContain('saturate-0');
        expect(bg.classes()).toContain('group-hover:grayscale-0');
    });

    test('last-known groups render without error when world metadata is uncached', async () => {
        const hidden = makeFriend('usr_hidden', 'private');
        hidden.ref.status = 'ask me';
        mocks.friendStore.friends = new Map([[hidden.id, hidden]]);
        mocks.worldStore.cachedWorlds.clear();
        mocks.lastKnownPresenceStore.enabled.value = true;
        mocks.lastKnownPresenceStore.observations.value = new Map([
            [
                hidden.id,
                {
                    userId: hidden.id,
                    worldId: 'wrld_uncached',
                    worldName: 'Uncached World',
                    locationTag: 'wrld_uncached:9',
                    observedAt: 100
                }
            ]
        ]);
        const wrapper = mount(FriendsSidebar);
        await flushPromises();
        expect(wrapper.text()).toContain('Uncached World');
        expect(mocks.queryRequest.fetch).toHaveBeenCalledWith('world.dialog', {
            worldId: 'wrld_uncached'
        });
    });
});
