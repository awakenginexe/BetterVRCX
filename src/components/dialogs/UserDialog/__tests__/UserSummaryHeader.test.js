import { beforeEach, describe, expect, test, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';

const userDialogMock = ref({
    id: 'usr_target',
    loading: false,
    previousDisplayNames: [],
    ref: {
        id: 'usr_target',
        displayName: 'TargetUser',
        $isVRCPlus: false,
        $userColour: '#ffffff',
        pronouns: '',
        status: '',
        statusDescription: '',
        badges: [],
        bannerUrl: '',
        bannerColor: '',
        bannerType: ''
    },
    publicProfileRef: {
        hasVrcPlus: false,
        isEconomyCreator: false
    },
    theme: {
        iconColor: 'var(--muted-foreground)',
        buttonColor: 'var(--primary)',
        subtextColor: 'var(--muted-foreground)'
    },
    representedGroup: {
        isRepresenting: false
    }
});

const currentUserMock = ref({
    id: 'usr_self',
    username: 'SelfUser',
    $isVRCPlus: false
});

const isLocalUserVrcPlusSupporterMock = ref(false);
const displayVRCProfileEffectsMock = ref(true);
const alwaysAnimateVRCProfileEffectsMock = ref(false);
const cachedProfileEffectsMock = ref(new Map());
const cachedIconFramesMock = ref(new Map());
const cachedNameplateEffectsMock = ref(new Map());
const copyUserDisplayNameMock = vi.fn();
const getUserStateTextMock = vi.fn(() => 'Online');
const toggleBadgeVisibilityMock = vi.fn();
const toggleBadgeShowcasedMock = vi.fn();
const userDialogCommandMock = vi.fn();
const userImageMock = vi.fn(
    (user) => user?.iconUrl || 'https://example.com/avatar.png'
);

vi.mock('pinia', async (i) => ({ ...(await i()), storeToRefs: (s) => s }));
vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (k) => k, te: () => false })
}));
vi.mock('../../../../stores', () => ({
    useAppearanceSettingsStore: () => ({
        displayVRCProfileEffects: displayVRCProfileEffectsMock,
        alwaysAnimateVRCProfileEffects: alwaysAnimateVRCProfileEffectsMock
    }),
    useUserStore: () => ({
        userDialog: userDialogMock,
        currentUser: currentUserMock,
        isLocalUserVrcPlusSupporter: isLocalUserVrcPlusSupporterMock,
        cachedProfileEffects: cachedProfileEffectsMock,
        cachedIconFrames: cachedIconFramesMock,
        cachedNameplateEffects: cachedNameplateEffectsMock,
        toggleSharedConnectionsOptOut: vi.fn(),
        toggleDiscordFriendsOptOut: vi.fn(),
        toggleAvatarCopying: vi.fn(),
        toggleAllowBooping: vi.fn(),
        showEditProfileDialog: vi.fn()
    }),
    useGalleryStore: () => ({
        showFullscreenImageDialog: vi.fn()
    })
}));

vi.mock('../../../../composables/useUserDisplay', () => ({
    useUserDisplay: () => ({
        userImage: (...args) => userImageMock(...args),
        userStatusClass: () => 'status-online'
    })
}));

vi.mock('@/coordinators/groupCoordinator', () => ({
    showGroupDialog: vi.fn()
}));

vi.mock('@/components/ui/tooltip', () => ({
    TooltipWrapper: {
        props: ['content', 'side'],
        template: '<div data-testid="tooltip-wrapper"><slot /></div>'
    }
}));

vi.mock('../../ui/popover', () => ({
    Popover: { template: '<div><slot /></div>' },
    PopoverTrigger: { template: '<div><slot /></div>' },
    PopoverContent: { template: '<div><slot /></div>' }
}));

vi.mock('../../ui/badge', () => ({
    Badge: { template: '<span data-testid="badge"><slot /></span>' }
}));

vi.mock('../../ui/checkbox', () => ({
    Checkbox: { template: '<input type="checkbox" />' }
}));

vi.mock('../UserActionDropdown.vue', () => ({
    default: { template: '<div data-testid="user-action-dropdown" />' }
}));

vi.mock('@/components/AvatarInfo.vue', () => ({
    default: { template: '<div data-testid="avatar-info" />' }
}));

import UserSummaryHeader from '../UserSummaryHeader.vue';

function mountHeader(props = {}) {
    return mount(UserSummaryHeader, {
        props: {
            getUserStateText: getUserStateTextMock,
            copyUserDisplayName: copyUserDisplayNameMock,
            toggleBadgeVisibility: toggleBadgeVisibilityMock,
            toggleBadgeShowcased: toggleBadgeShowcasedMock,
            userDialogCommand: userDialogCommandMock,
            ...props
        }
    });
}

describe('UserSummaryHeader.vue', () => {
    beforeEach(() => {
        userDialogMock.value.id = 'usr_target';
        userDialogMock.value.ref = {
            id: 'usr_target',
            displayName: 'TargetUser',
            $isVRCPlus: false,
            badges: []
        };
        userDialogMock.value.publicProfileRef = {
            hasVrcPlus: false,
            isEconomyCreator: false
        };
        displayVRCProfileEffectsMock.value = true;
        alwaysAnimateVRCProfileEffectsMock.value = false;
        cachedProfileEffectsMock.value = new Map();
        cachedIconFramesMock.value = new Map();
        cachedNameplateEffectsMock.value = new Map();
        currentUserMock.value.id = 'usr_self';
        isLocalUserVrcPlusSupporterMock.value = false;
        copyUserDisplayNameMock.mockReset();
        userImageMock.mockClear();
    });

    test('renders VRC+ badge with md size when userDialog.ref.$isVRCPlus is true', () => {
        userDialogMock.value.ref.$isVRCPlus = true;
        const wrapper = mountHeader();

        expect(wrapper.text()).toContain('TargetUser');
        expect(wrapper.text()).toContain('VRC+');
        const badge = wrapper.findComponent({ name: 'VrcPlusBadge' });
        expect(badge.exists()).toBe(true);
        expect(badge.props('size')).toBe('md');
    });

    test('renders VRC+ badge when publicProfileRef.hasVrcPlus is true', () => {
        userDialogMock.value.ref.$isVRCPlus = false;
        userDialogMock.value.publicProfileRef.hasVrcPlus = true;
        const wrapper = mountHeader();

        expect(wrapper.text()).toContain('VRC+');
        const badge = wrapper.findComponent({ name: 'VrcPlusBadge' });
        expect(badge.exists()).toBe(true);
        expect(badge.props('size')).toBe('md');
    });

    test('renders the remote icon and badges from publicProfileRef', () => {
        userDialogMock.value.ref.iconUrl =
            'https://example.com/stale-user-icon.png';
        userDialogMock.value.ref.badges = [
            {
                badgeId: 'bdg_stale',
                badgeName: 'Stale badge',
                badgeImageUrl: 'https://example.com/stale-badge.png'
            }
        ];
        userDialogMock.value.publicProfileRef.iconUrl =
            'https://example.com/public-icon.png';
        userDialogMock.value.publicProfileRef.badges = [
            {
                badgeId: 'bdg_public',
                badgeName: 'Public badge',
                badgeDescription: 'From profile',
                badgeImageUrl: 'https://example.com/public-badge.png'
            }
        ];

        const wrapper = mountHeader();

        expect(
            wrapper
                .find('img[src="https://example.com/public-icon.png"]')
                .exists()
        ).toBe(true);
        expect(wrapper.html()).toContain('public-badge.png');
        expect(wrapper.html()).not.toContain('stale-badge.png');
    });

    test('renders VRC+ badge for self profile when isLocalUserVrcPlusSupporter is true', () => {
        userDialogMock.value.id = 'usr_self';
        userDialogMock.value.ref.id = 'usr_self';
        userDialogMock.value.ref.$isVRCPlus = false;
        isLocalUserVrcPlusSupporterMock.value = true;

        const wrapper = mountHeader();
        expect(wrapper.text()).toContain('VRC+');
        const badge = wrapper.findComponent({ name: 'VrcPlusBadge' });
        expect(badge.exists()).toBe(true);
    });

    test('does not render VRC+ badge when user is not VRC+', () => {
        userDialogMock.value.ref.$isVRCPlus = false;
        userDialogMock.value.publicProfileRef.hasVrcPlus = false;
        isLocalUserVrcPlusSupporterMock.value = false;

        const wrapper = mountHeader();
        expect(wrapper.text()).not.toContain('VRC+');
        const badge = wrapper.findComponent({ name: 'VrcPlusBadge' });
        expect(badge.exists()).toBe(false);
    });

    test('renders skeleton placeholders when userDialog is loading without displayName', () => {
        userDialogMock.value.loading = true;
        userDialogMock.value.ref = {};
        const wrapper = mountHeader();

        const skeletons = wrapper.findAll('[data-slot="skeleton"]');
        expect(skeletons.length).toBeGreaterThan(0);
        expect(wrapper.text()).not.toContain('TargetUser');
    });

    test('preserves copy displayName click behavior', async () => {
        const wrapper = mountHeader();
        const nameSpan = wrapper
            .findAll('span')
            .find((s) => s.text() === 'TargetUser');
        expect(nameSpan).toBeTruthy();
        await nameSpan.trigger('click');
        expect(copyUserDisplayNameMock).toHaveBeenCalledWith('TargetUser');
    });

    test('keeps the profile card rounded and the avatar circular', () => {
        const wrapper = mountHeader();

        expect(wrapper.find('.bv-entity-card').classes()).toContain(
            'overflow-hidden'
        );
        expect(wrapper.find('.bv-entity-hero-avatar').classes()).toContain(
            'rounded-full'
        );
    });

    test('does not render the removed CSS profile-effect fallback', () => {
        userDialogMock.value.publicProfileRef.profileEffect = 'Afterglow';

        const wrapper = mountHeader();
        expect(wrapper.findAll('[data-profile-effect]')).toHaveLength(0);
        expect(wrapper.findAll('.bv-profile-effect-surface')).toHaveLength(0);
        expect(wrapper.find('.bv-entity-card').classes()).not.toContain(
            'bv-profile-effect-card'
        );
    });

    test('does not render profile cosmetics when disabled', async () => {
        displayVRCProfileEffectsMock.value = false;
        userDialogMock.value.publicProfileRef.profileEffect = 'cos_profile';
        userDialogMock.value.publicProfileRef.iconFrame = 'cos_frame';
        userDialogMock.value.publicProfileRef.nameplateEffect = 'cos_nameplate';
        cachedProfileEffectsMock.value.set('cos_profile', {
            id: 'cos_profile',
            metadata: {
                assets: [
                    {
                        type: 'mainAnimation',
                        url: 'https://example.com/profile.webp'
                    }
                ]
            }
        });
        cachedIconFramesMock.value.set('cos_frame', {
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
        cachedNameplateEffectsMock.value.set('cos_nameplate', {
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

        const wrapper = mountHeader();
        await flushPromises();

        expect(wrapper.find('[data-profile-effect-asset]').exists()).toBe(
            false
        );
        expect(wrapper.find('[data-icon-frame-asset]').exists()).toBe(false);
        expect(wrapper.find('[data-nameplate-effect]').exists()).toBe(false);
    });

    test('renders profile effect and icon frame but never renders the equipped nameplate effect', async () => {
        userDialogMock.value.ref.profileEffect = 'cos_profile_stale';
        userDialogMock.value.ref.iconFrame = 'cos_frame_stale';
        userDialogMock.value.ref.nameplateEffect = 'cos_nameplate_stale';
        userDialogMock.value.publicProfileRef.profileEffect =
            'cos_profile_public';
        userDialogMock.value.publicProfileRef.iconFrame = 'cos_frame_public';
        userDialogMock.value.publicProfileRef.nameplateEffect =
            'cos_nameplate_public';

        cachedProfileEffectsMock.value.set('cos_profile_public', {
            id: 'cos_profile_public',
            metadata: {
                assets: [
                    {
                        type: 'mainAnimation',
                        url: 'https://example.com/profile-public.webp'
                    }
                ]
            }
        });
        cachedIconFramesMock.value.set('cos_frame_public', {
            id: 'cos_frame_public',
            metadata: {
                assets: [
                    {
                        type: 'mainAnimation',
                        url: 'https://example.com/frame-public.webp'
                    }
                ]
            }
        });
        cachedNameplateEffectsMock.value.set('cos_nameplate_public', {
            id: 'cos_nameplate_public',
            metadata: {
                assets: [
                    {
                        type: 'mainAnimation',
                        url: 'https://example.com/nameplate-public.webp'
                    }
                ],
                gradientStart: '112233',
                gradientEnd: '445566'
            }
        });

        const wrapper = mountHeader();
        await flushPromises();

        expect(
            wrapper.find('[data-profile-effect-asset]').attributes('src')
        ).toBe('https://example.com/profile-public.webp');
        expect(wrapper.find('[data-icon-frame-asset]').attributes('src')).toBe(
            'https://example.com/frame-public.webp'
        );
        expect(wrapper.find('[data-nameplate-effect]').exists()).toBe(false);
        expect(wrapper.html()).not.toContain('nameplate-public.webp');
        expect(wrapper.html()).not.toContain('stale');
    });

    test('switching users clears the previous cosmetic before the next index entry is available', async () => {
        userDialogMock.value.publicProfileRef.profileEffect = 'cos_profile_a';
        cachedProfileEffectsMock.value.set('cos_profile_a', {
            id: 'cos_profile_a',
            metadata: {
                assets: [
                    {
                        type: 'mainAnimation',
                        url: 'https://example.com/user-a.webp'
                    }
                ]
            }
        });
        const wrapper = mountHeader();
        await flushPromises();
        expect(
            wrapper.find('[data-profile-effect-asset]').attributes('src')
        ).toBe('https://example.com/user-a.webp');

        userDialogMock.value.id = 'usr_user_b';
        userDialogMock.value.ref = {
            id: 'usr_user_b',
            displayName: 'User B',
            badges: []
        };
        userDialogMock.value.publicProfileRef = {
            profileEffect: 'cos_profile_b'
        };
        await flushPromises();

        expect(wrapper.find('[data-profile-effect-asset]').exists()).toBe(
            false
        );
        expect(wrapper.html()).not.toContain('user-a.webp');
    });

    test('an explicitly unequipped public profile cosmetic does not fall back to stale user data', async () => {
        userDialogMock.value.ref.profileEffect = 'cos_profile_stale';
        userDialogMock.value.ref.iconFrame = 'cos_frame_stale';
        userDialogMock.value.ref.nameplateEffect = 'cos_nameplate_stale';
        userDialogMock.value.publicProfileRef.profileEffect = '';
        userDialogMock.value.publicProfileRef.iconFrame = '';
        userDialogMock.value.publicProfileRef.nameplateEffect = '';
        cachedProfileEffectsMock.value.set('cos_profile_stale', {
            id: 'cos_profile_stale',
            metadata: {
                assets: [
                    {
                        type: 'mainAnimation',
                        url: 'https://example.com/stale-profile.webp'
                    }
                ]
            }
        });
        cachedIconFramesMock.value.set('cos_frame_stale', {
            id: 'cos_frame_stale',
            metadata: {
                assets: [
                    {
                        type: 'mainAnimation',
                        url: 'https://example.com/stale-frame.webp'
                    }
                ]
            }
        });
        cachedNameplateEffectsMock.value.set('cos_nameplate_stale', {
            id: 'cos_nameplate_stale',
            metadata: {
                assets: [
                    {
                        type: 'mainAnimation',
                        url: 'https://example.com/stale-nameplate.webp'
                    }
                ]
            }
        });

        const wrapper = mountHeader();
        await flushPromises();

        expect(wrapper.find('[data-profile-effect-asset]').exists()).toBe(
            false
        );
        expect(wrapper.find('[data-icon-frame-asset]').exists()).toBe(false);
        expect(wrapper.find('[data-nameplate-effect]').exists()).toBe(false);
    });

    test('transitions a cached cosmetic from intro animation to main animation', async () => {
        vi.useFakeTimers();
        alwaysAnimateVRCProfileEffectsMock.value = true;
        userDialogMock.value.publicProfileRef.profileEffect =
            'cos_profile_intro';
        cachedProfileEffectsMock.value.set('cos_profile_intro', {
            id: 'cos_profile_intro',
            metadata: {
                assets: [
                    {
                        type: 'introAnimation',
                        url: 'https://example.com/intro.webp',
                        totalDurationMs: 250
                    },
                    {
                        type: 'mainAnimation',
                        url: 'https://example.com/main.webp'
                    }
                ]
            }
        });

        const wrapper = mountHeader();
        const introImage = wrapper
            .findAll('[data-profile-effect-intro]')
            .find((asset) => asset.element.tagName === 'IMG');
        await introImage.trigger('load');
        expect(wrapper.find('[data-profile-effect-intro]').isVisible()).toBe(
            true
        );
        expect(wrapper.find('[data-profile-effect-main]').isVisible()).toBe(
            false
        );

        await vi.runAllTimersAsync();
        await wrapper.vm.$nextTick();
        const introImageAfter = wrapper
            .findAll('[data-profile-effect-intro]')
            .find((asset) => asset.element.tagName === 'IMG');
        const mainImageAfter = wrapper
            .findAll('[data-profile-effect-main]')
            .find((asset) => asset.element.tagName === 'IMG');
        expect(introImageAfter.attributes('style')).toContain('display: none');
        expect(mainImageAfter.attributes('style') ?? '').not.toContain(
            'display: none'
        );
        vi.useRealTimers();
    });

    test('missing cosmetic definitions and missing assets render nothing without throwing', async () => {
        userDialogMock.value.publicProfileRef.profileEffect = 'cos_missing';
        userDialogMock.value.publicProfileRef.iconFrame =
            'cos_frame_without_assets';
        userDialogMock.value.publicProfileRef.nameplateEffect =
            'cos_nameplate_without_assets';
        cachedIconFramesMock.value.set('cos_frame_without_assets', {
            id: 'cos_frame_without_assets',
            metadata: { assets: [] }
        });
        cachedNameplateEffectsMock.value.set('cos_nameplate_without_assets', {
            id: 'cos_nameplate_without_assets',
            metadata: {}
        });

        const wrapper = mountHeader();
        await flushPromises();

        expect(wrapper.find('[data-profile-effect-asset]').exists()).toBe(
            false
        );
        expect(wrapper.find('[data-icon-frame-asset]').exists()).toBe(false);
        expect(wrapper.find('[data-nameplate-effect]').exists()).toBe(false);
    });
});
