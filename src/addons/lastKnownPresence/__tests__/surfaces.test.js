import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

const mocks = vi.hoisted(() => {
    const { reactive } = require('vue');
    return {
        user: reactive({
            currentUser: { id: 'usr_me' },
            cachedUsers: new Map(),
            cachedIconFrames: new Map(),
            cachedNameplateEffects: new Map()
        }),
        friends: reactive({
            friends: new Map(),
            allFavoriteFriendIds: new Set(),
            isRefreshFriendsLoading: false
        }),
        appearance: reactive({
            isAgeGatedInstancesVisible: true,
            hideNicknames: false,
            displayVRCProfileEffects: true,
            alwaysAnimateVRCProfileEffects: false
        }),
        location: reactive({
            lastLocation: { location: '', friendList: new Map() }
        }),
        world: reactive({
            worldDialog: {
                id: 'wrld_a',
                ref: {
                    id: 'wrld_a',
                    publicOccupants: 5,
                    privateOccupants: 0,
                    recommendedCapacity: 16,
                    capacity: 32
                },
                rooms: [],
                $location: { shortName: '' }
            },
            cachedWorlds: new Map()
        }),
        instance: reactive({
            instanceJoinHistory: new Map(),
            cachedInstances: new Map(),
            showPreviousInstancesInfoDialog: () => {}
        }),
        group: reactive({ cachedGroups: new Map() }),
        invite: reactive({ canOpenInstanceInGame: false }),
        launch: reactive({
            isOpeningInstance: false,
            showLaunchDialog: vi.fn(),
            tryOpenInstanceInVrc: vi.fn()
        }),
        modal: reactive({ confirm: vi.fn() }),
        showWorld: vi.fn(),
        showUser: vi.fn()
    };
});
vi.mock('pinia', async (original) => {
    const actual = await original();
    const { toRefs } = await import('vue');
    return {
        ...actual,
        storeToRefs: (store) =>
            store.$id ? actual.storeToRefs(store) : toRefs(store)
    };
});
vi.mock('../../../stores', () => ({
    useUserStore: () => mocks.user,
    useFriendStore: () => mocks.friends,
    useAppearanceSettingsStore: () => mocks.appearance,
    useLocationStore: () => mocks.location,
    useWorldStore: () => mocks.world,
    useInstanceStore: () => mocks.instance,
    useGroupStore: () => mocks.group,
    useInviteStore: () => mocks.invite,
    useLaunchStore: () => mocks.launch,
    useModalStore: () => mocks.modal
}));
vi.mock('../../../api', () => ({
    queryRequest: { fetch: vi.fn().mockResolvedValue({}) },
    instanceRequest: { selfInvite: vi.fn().mockResolvedValue({}) },
    miscRequest: { closeInstance: vi.fn().mockResolvedValue({}) }
}));
vi.mock('../../../services/config', () => ({
    default: {
        getBool: vi.fn().mockResolvedValue(false),
        setBool: vi.fn().mockResolvedValue(undefined)
    }
}));
vi.mock('../../../coordinators/userCoordinator', () => ({
    showUserDialog: (...args) => mocks.showUser(...args)
}));
vi.mock('../../../coordinators/worldCoordinator', () => ({
    showWorldDialog: (...args) => mocks.showWorld(...args)
}));
vi.mock('../../../coordinators/instanceCoordinator', () => ({
    refreshInstancePlayerCount: vi.fn()
}));
vi.mock('../../../coordinators/friendRelationshipCoordinator', () => ({
    confirmDeleteFriend: vi.fn()
}));
vi.mock('vue-i18n', async (original) => {
    const actual = await original();
    const { i18n } = await import('../../../plugins/i18n');
    return { ...actual, useI18n: () => i18n.global };
});
import WorldInstances from '../../../components/dialogs/WorldDialog/WorldDialogInstancesTab.vue';
import Settings from '../LastKnownPresenceSettings.vue';
import Timer from '../../../components/Timer.vue';
import { useLastKnownPresenceStore } from '../store';

let presence;
let wrappers;
const tag = 'wrld_a:4582~hidden(usr_a)';
const hidden = {
    id: 'usr_a',
    displayName: 'Hidden Alice',
    status: 'ask me',
    state: 'online',
    location: 'private'
};
const live = {
    id: 'usr_live',
    displayName: 'Live Bob',
    status: 'active',
    state: 'online',
    location: tag
};
function mountSurface(component, { useRealInstanceActionBar = false } = {}) {
    const stubs = {
        LocationWorld: { template: '<span>Live instance</span>' },
        Avatar: { template: '<span><slot /></span>' },
        AvatarImage: true,
        AvatarFallback: { template: '<span><slot /></span>' },
        VrcPlusBadge: true,
        Switch: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
                '<button role="switch" :aria-checked="modelValue" @click="$emit(\'update:modelValue\', !modelValue)">toggle</button>'
        }
    };
    if (!useRealInstanceActionBar) {
        stubs.InstanceActionBar = {
            props: ['friendcount', 'launchLocation'],
            template:
                '<span data-live-actions :data-launch-location="launchLocation">{{ friendcount }} confirmed</span>'
        };
    }
    const wrapper = mount(component, {
        global: {
            components: { Timer },
            stubs
        }
    });
    wrappers.push(wrapper);
    return wrapper;
}
beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-15T00:00:00Z'));
    setActivePinia(createPinia());
    presence = useLastKnownPresenceStore();
    await presence.init();
    presence.setEnabled(true);
    mocks.user.cachedUsers.clear();
    mocks.user.cachedUsers.set(hidden.id, hidden);
    mocks.friends.friends.clear();
    mocks.friends.friends.set(hidden.id, {
        id: hidden.id,
        state: 'online',
        ref: hidden
    });
    mocks.location.lastLocation.friendList.clear();
    mocks.appearance.isAgeGatedInstancesVisible = true;
    mocks.world.worldDialog.rooms = [];
    presence.playerJoined(
        hidden,
        { location: tag, name: 'Midnight Rooftop' },
        { isFriend: true }
    );
    wrappers = [];
    mocks.showWorld.mockClear();
    mocks.launch.showLaunchDialog.mockClear();
});
afterEach(() => {
    wrappers.forEach((w) => w.unmount());
    vi.useRealTimers();
});

describe('World instance hints', () => {
    it('retains a historical-only exact instance with separate named friends and its exact launch target', async () => {
        const wrapper = mountSurface(WorldInstances);
        expect(wrapper.text()).toContain('Last known instance');
        expect(wrapper.text()).toContain('Midnight Rooftop');
        expect(wrapper.text()).toContain('4582');
        expect(wrapper.text()).toContain('Hidden Alice');
        expect(
            wrapper
                .get('[data-live-actions]')
                .attributes('data-launch-location')
        ).toBe(tag);
        expect(mocks.world.worldDialog.rooms).toHaveLength(0);
        presence.setEnabled(false);
        await nextTick();
        expect(wrapper.text()).not.toContain('Hidden Alice');
        expect(wrapper.text()).not.toContain('Last known instance');
    });

    it('launches the exact historical instance through the existing instance action', async () => {
        const wrapper = mountSurface(WorldInstances, {
            useRealInstanceActionBar: true
        });
        const launchButton = wrapper.get(
            '.last-known-presence button[aria-label]'
        );

        await launchButton.trigger('click');

        expect(mocks.launch.showLaunchDialog).toHaveBeenCalledWith(
            'wrld_a:4582~hidden(usr_a)'
        );
    });

    it('associates exact live room without changing users or counts', () => {
        mocks.world.worldDialog.rooms = [
            {
                id: tag,
                tag,
                location: tag,
                $location: { tag, userId: '' },
                users: [live],
                friendCount: 1,
                ref: { n_users: 5 }
            }
        ];
        const wrapper = mountSurface(WorldInstances);
        expect(wrapper.text()).toContain('Might be here');
        expect(wrapper.text()).toContain('Hidden Alice');
        expect(wrapper.text()).toContain('Live Bob');
        expect(wrapper.text()).toContain('1 confirmed');
        expect(wrapper.findAll('[data-live-actions]')).toHaveLength(1);
        expect(wrapper.text()).not.toContain('Last known instance');
        expect(mocks.world.worldDialog.rooms[0].users.map((u) => u.id)).toEqual(
            ['usr_live']
        );
        expect(mocks.world.worldDialog.rooms[0].ref.n_users).toBe(5);
    });

    it('suppresses a hint when the friend is currently present locally', () => {
        mocks.location.lastLocation.friendList.set(hidden.id, {
            userId: hidden.id
        });
        const wrapper = mountSurface(WorldInstances);
        expect(wrapper.text()).not.toContain('Hidden Alice');
    });

    it('honors age-gated instance visibility for historical-only groups', () => {
        presence.playerJoined(
            hidden,
            { location: `${tag}~ageGate`, name: 'Age gated Rooftop' },
            { isFriend: true }
        );
        mocks.appearance.isAgeGatedInstancesVisible = false;
        const wrapper = mountSurface(WorldInstances);
        expect(wrapper.text()).not.toContain('Hidden Alice');
    });

    it('displays historical world artwork in grayscale when cached, preserving real friend colors', () => {
        mocks.world.cachedWorlds.set('wrld_a', {
            thumbnailImageUrl: 'https://example.com/rooftop-thumb.png'
        });
        const wrapper = mountSurface(WorldInstances);
        const bg = wrapper.find('.last-known-presence .grayscale');
        expect(bg.exists()).toBe(true);
        expect(bg.attributes('style')).toContain(
            'https://example.com/rooftop-thumb.png'
        );
        expect(bg.classes()).toContain('saturate-0');
        expect(bg.classes()).toContain('group-hover:grayscale-0');
        expect(bg.classes()).toContain('group-hover:saturate-100');

        // Content (avatars, text, badges) is inside relative z-10 and NOT grayscaled
        const content = wrapper.find('.last-known-presence .relative.z-10');
        expect(content.exists()).toBe(true);
        expect(content.classes()).not.toContain('grayscale');
    });

    it('renders gracefully when world metadata is uncached without breaking the card', () => {
        mocks.world.cachedWorlds.clear();
        const wrapper = mountSurface(WorldInstances);
        expect(wrapper.find('.last-known-presence').exists()).toBe(true);
        expect(wrapper.find('.last-known-presence .grayscale').exists()).toBe(
            false
        );
        expect(wrapper.text()).toContain('Hidden Alice');
    });
});

describe('Settings session overview', () => {
    it('shows named friends grouped by exact instance, with elapsed time and world navigation', async () => {
        const wrapper = mountSurface(Settings);
        expect(wrapper.text()).toContain('Hidden Alice');
        expect(wrapper.text()).toContain('Midnight Rooftop');
        const before = wrapper.text();
        await vi.advanceTimersByTimeAsync(120000);
        expect(wrapper.text()).not.toBe(before);
        const world = wrapper
            .findAll('button')
            .find((b) => b.text().includes('Midnight Rooftop'));
        expect(world).toBeDefined();
        await world.trigger('click');
        expect(mocks.showWorld).toHaveBeenCalledWith('wrld_a');
        await wrapper.get('[role="switch"]').trigger('click');
        expect(presence.enabled).toBe(false);
        expect(presence.observations.size).toBe(0);
        expect(wrapper.text()).not.toContain('Hidden Alice');
        expect(wrapper.text()).not.toContain('Midnight Rooftop');
    });

    it('displays world artwork background on settings overview cards when cached', () => {
        mocks.world.cachedWorlds.set('wrld_a', {
            imageUrl: 'https://example.com/settings-bg.png'
        });
        const wrapper = mountSurface(Settings);
        const bg = wrapper.find('.last-known-presence .grayscale');
        expect(bg.exists()).toBe(true);
        expect(bg.attributes('style')).toContain(
            'https://example.com/settings-bg.png'
        );
        expect(bg.classes()).toContain('saturate-0');
    });
});
