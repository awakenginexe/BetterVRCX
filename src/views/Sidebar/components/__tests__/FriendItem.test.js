import { beforeEach, describe, expect, test, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
    appearanceStore: {
        hideNicknames: false,
        displayVRCProfileEffects: require('vue').ref(true)
    },
    friendStore: {
        isRefreshFriendsLoading: false,
        allFavoriteFriendIds: new Set()
    },
    userStore: {
        cachedIconFrames: require('vue').ref(new Map()),
        cachedNameplateEffects: require('vue').ref(new Map())
    },
    showUserDialog: vi.fn(),
    confirmDeleteFriend: vi.fn()
}));

vi.mock('pinia', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        storeToRefs: (store) => store
    };
});

vi.mock('../../../../stores', () => ({
    useAppearanceSettingsStore: () => mocks.appearanceStore,
    useFriendStore: () => mocks.friendStore,
    useUserStore: () => mocks.userStore
}));

vi.mock('../../../../coordinators/userCoordinator', () => ({
    showUserDialog: (...args) => mocks.showUserDialog(...args)
}));

vi.mock('../../../../coordinators/friendRelationshipCoordinator', () => ({
    confirmDeleteFriend: (...args) => mocks.confirmDeleteFriend(...args)
}));

vi.mock('../../../../shared/utils', () => ({
    userImage: vi.fn(() => 'https://example.com/avatar.png'),
    userStatusClass: vi.fn(() => 'status-online')
}));

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key) => key,
        locale: require('vue').ref('en')
    })
}));

vi.mock('@/components/ui/avatar', () => ({
    Avatar: {
        template: '<div data-testid="avatar"><slot /></div>'
    },
    AvatarImage: {
        props: ['src'],
        template: '<img data-testid="avatar-image" :src="src" />'
    },
    AvatarFallback: {
        template: '<span data-testid="avatar-fallback"><slot /></span>'
    }
}));

vi.mock('@/components/ui/button', () => ({
    Button: {
        emits: ['click'],
        template:
            '<button data-testid="delete-button" @click="$emit(\'click\', $event)"><slot /></button>'
    }
}));

vi.mock('@/components/ui/spinner', () => ({
    Spinner: {
        template: '<span data-testid="spinner" />'
    }
}));

vi.mock('@/components/Location.vue', () => ({
    default: {
        props: ['location', 'traveling', 'link'],
        template:
            '<span data-testid="location">{{ location }}|{{ traveling }}</span>'
    }
}));

vi.mock('@/components/Timer.vue', () => ({
    default: {
        props: ['epoch'],
        template: '<span data-testid="timer">{{ epoch }}</span>'
    }
}));

vi.mock('lucide-vue-next', () => ({
    User: {
        template: '<span data-testid="icon-user" />'
    },
    Trash2: {
        template: '<span data-testid="icon-trash" />'
    }
}));

vi.mock('@/components/ui/tooltip', () => ({
    TooltipWrapper: {
        props: ['content', 'side'],
        template:
            '<div data-testid="tooltip-wrapper" :title="content"><slot /></div>'
    }
}));

import FriendItem from '../FriendItem.vue';

function makeFriend(overrides = {}) {
    return {
        id: 'usr_1',
        name: 'Alice',
        state: 'active',
        pendingOffline: false,
        $nickName: 'Ali',
        ref: {
            displayName: 'Alice',
            $userColour: '#fff',
            statusDescription: 'Online',
            location: 'wrld_abc:123',
            travelingToLocation: '',
            $location_at: 123,
            iconFrame: '',
            nameplateEffect: ''
        },
        ...overrides
    };
}

function mountItem(props = {}) {
    return mount(FriendItem, {
        props: {
            friend: makeFriend(),
            isGroupByInstance: false,
            ...props
        }
    });
}

describe('FriendItem.vue', () => {
    beforeEach(() => {
        mocks.appearanceStore.hideNicknames = false;
        mocks.appearanceStore.displayVRCProfileEffects.value = true;
        mocks.userStore.cachedIconFrames.value = new Map();
        mocks.userStore.cachedNameplateEffects.value = new Map();
        mocks.friendStore.isRefreshFriendsLoading = false;
        mocks.friendStore.allFavoriteFriendIds = new Set();
        mocks.confirmDeleteFriend.mockReset();
        mocks.showUserDialog.mockReset();
    });

    test('renders nickname when hideNicknames is false', () => {
        const wrapper = mountItem();
        expect(wrapper.text()).toContain('Alice (Ali)');
    });

    test('renders favorite star when grouped by instance and friend is favorite', () => {
        mocks.appearanceStore.hideNicknames = true;
        mocks.friendStore.allFavoriteFriendIds = new Set(['usr_1']);

        const wrapper = mountItem({
            friend: makeFriend({ $nickName: '' }),
            isGroupByInstance: true
        });

        expect(wrapper.text()).toContain('Alice ⭐');
    });

    test('clicking row opens user dialog', async () => {
        const wrapper = mountItem();
        await wrapper.get('div').trigger('click');
        expect(mocks.showUserDialog).toHaveBeenCalledWith('usr_1');
    });

    test('renders delete action for orphan friend and triggers confirmDeleteFriend', async () => {
        const wrapper = mountItem({
            friend: makeFriend({
                id: 'usr_orphan',
                name: 'Ghost',
                ref: null
            })
        });

        expect(wrapper.text()).toContain('Ghost');
        const button = wrapper.get('[data-testid="delete-button"]');
        await button.trigger('click');
        expect(mocks.confirmDeleteFriend).toHaveBeenCalledWith('usr_orphan');
        expect(mocks.showUserDialog).not.toHaveBeenCalled();
    });

    test('renders VRC+ badge when friend.ref.$isVRCPlus is true', () => {
        const wrapper = mountItem({
            friend: makeFriend({
                ref: {
                    displayName: 'Bob',
                    $userColour: '#fff',
                    $isVRCPlus: true
                }
            })
        });

        expect(wrapper.text()).toContain('Bob');
        expect(wrapper.text()).toContain('VRC+');
        expect(wrapper.findComponent({ name: 'VrcPlusBadge' }).exists()).toBe(
            true
        );
    });

    test('does not render VRC+ badge when friend.ref.$isVRCPlus is false or missing', () => {
        const wrapper = mountItem({
            friend: makeFriend({
                ref: {
                    displayName: 'Charlie',
                    $userColour: '#fff',
                    $isVRCPlus: false
                }
            })
        });

        expect(wrapper.text()).toContain('Charlie');
        expect(wrapper.text()).not.toContain('VRC+');
        expect(wrapper.findComponent({ name: 'VrcPlusBadge' }).exists()).toBe(
            false
        );
    });

    test('renders VRC+ badge after nickname when nickname is present', () => {
        const wrapper = mountItem({
            friend: makeFriend({
                $nickName: 'Chaz',
                ref: {
                    displayName: 'Charlie',
                    $userColour: '#fff',
                    $isVRCPlus: true
                }
            })
        });

        expect(wrapper.text()).toContain('Charlie (Chaz)');
        expect(wrapper.text()).toContain('VRC+');
        expect(wrapper.findComponent({ name: 'VrcPlusBadge' }).exists()).toBe(
            true
        );
    });

    test('maintains truncation and min-w-0 layout contract for display name container', () => {
        const wrapper = mountItem({
            friend: makeFriend({
                ref: {
                    displayName: 'VeryLongUsernameThatShouldTruncate',
                    $userColour: '#fff',
                    $isVRCPlus: true
                }
            })
        });

        const nameContainer = wrapper.find('.truncate');
        expect(nameContainer.exists()).toBe(true);
        expect(nameContainer.classes()).toContain('min-w-0');
    });

    test('renders a separate last-seen hint without changing the live friend status', () => {
        const wrapper = mountItem({
            isGroupByInstance: true,
            friend: makeFriend({ state: 'online' }),
            observation: {
                locationTag: 'wrld_old:7~private',
                observedAt: 456
            }
        });

        expect(wrapper.text()).toContain('Alice');
        expect(wrapper.text()).toContain('last_known_presence.last_seen');
        expect(wrapper.get('[data-testid="timer"]').text()).toBe('456');
        expect(wrapper.findAll('[data-testid="timer"]')).toHaveLength(1);
    });

    test('renders the equipped nameplate effect from friend.ref behind the row content', async () => {
        mocks.userStore.cachedNameplateEffects.value.set('cos_nameplate_a', {
            id: 'cos_nameplate_a',
            metadata: {
                assets: [
                    {
                        type: 'mainAnimation',
                        url: 'https://example.com/nameplate-a.webp'
                    }
                ],
                gradientStart: '112233',
                gradientEnd: '445566'
            }
        });

        const wrapper = mountItem({
            friend: makeFriend({
                ref: {
                    ...makeFriend().ref,
                    nameplateEffect: 'cos_nameplate_a'
                }
            })
        });
        await wrapper.vm.$nextTick();

        expect(wrapper.find('[data-nameplate-effect]').exists()).toBe(true);
        expect(
            wrapper.find('[data-nameplate-effect]').attributes('data-variant')
        ).toBe('sidebar');
        expect(
            wrapper.find('[data-nameplate-effect-main]').attributes('src')
        ).toBe('https://example.com/nameplate-a.webp');
        expect(wrapper.get('[data-friend-row-content]').classes()).toContain(
            'z-10'
        );
    });

    test('does not render a nameplate effect when the equipped id is empty', () => {
        mocks.userStore.cachedNameplateEffects.value.set('cos_nameplate_a', {
            id: 'cos_nameplate_a',
            metadata: {
                assets: [
                    {
                        type: 'mainAnimation',
                        url: 'https://example.com/nameplate-a.webp'
                    }
                ]
            }
        });

        const wrapper = mountItem();

        expect(wrapper.find('[data-nameplate-effect]').exists()).toBe(false);
    });

    test('hides sidebar cosmetics when profile cosmetics are disabled', async () => {
        mocks.appearanceStore.displayVRCProfileEffects.value = false;
        mocks.userStore.cachedIconFrames.value.set('cos_frame', {
            id: 'cos_frame',
            metadata: {
                assets: [
                    {
                        type: 'mainAnimation',
                        url: 'https://example.com/frame.webp'
                    }
                ]
            }
        });
        mocks.userStore.cachedNameplateEffects.value.set('cos_nameplate', {
            id: 'cos_nameplate',
            metadata: {
                assets: [
                    {
                        type: 'mainAnimation',
                        url: 'https://example.com/nameplate.webp'
                    }
                ]
            }
        });

        const wrapper = mountItem({
            friend: makeFriend({
                ref: {
                    ...makeFriend().ref,
                    iconFrame: 'cos_frame',
                    nameplateEffect: 'cos_nameplate'
                }
            })
        });
        await wrapper.vm.$nextTick();

        expect(wrapper.find('[data-icon-frame-asset]').exists()).toBe(false);
        expect(wrapper.find('[data-nameplate-effect]').exists()).toBe(false);
    });

    test('switching friends updates then clears the previous nameplate effect', async () => {
        for (const suffix of ['a', 'b']) {
            mocks.userStore.cachedNameplateEffects.value.set(
                `cos_nameplate_${suffix}`,
                {
                    id: `cos_nameplate_${suffix}`,
                    metadata: {
                        assets: [
                            {
                                type: 'mainAnimation',
                                url: `https://example.com/nameplate-${suffix}.webp`
                            }
                        ]
                    }
                }
            );
        }
        const wrapper = mountItem({
            friend: makeFriend({
                id: 'usr_a',
                ref: { ...makeFriend().ref, nameplateEffect: 'cos_nameplate_a' }
            })
        });
        await wrapper.vm.$nextTick();
        expect(
            wrapper.get('[data-nameplate-effect-main]').attributes('src')
        ).toContain('nameplate-a.webp');

        await wrapper.setProps({
            friend: makeFriend({
                id: 'usr_b',
                ref: { ...makeFriend().ref, nameplateEffect: 'cos_nameplate_b' }
            })
        });
        expect(
            wrapper.get('[data-nameplate-effect-main]').attributes('src')
        ).toContain('nameplate-b.webp');
        expect(wrapper.html()).not.toContain('nameplate-a.webp');

        await wrapper.setProps({
            friend: makeFriend({
                id: 'usr_b',
                ref: { ...makeFriend().ref, nameplateEffect: '' }
            })
        });
        expect(wrapper.find('[data-nameplate-effect]').exists()).toBe(false);
        expect(wrapper.html()).not.toContain('nameplate-b.webp');
    });

    test('mounting a friend row does not make a profile or network request', () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');

        mountItem({
            friend: makeFriend({
                ref: { ...makeFriend().ref, nameplateEffect: 'cos_missing' }
            })
        });

        expect(fetchSpy).not.toHaveBeenCalled();
        expect(mocks.showUserDialog).not.toHaveBeenCalled();
        fetchSpy.mockRestore();
    });
});
