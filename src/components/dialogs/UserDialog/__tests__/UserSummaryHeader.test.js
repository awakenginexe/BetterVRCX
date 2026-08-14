import { beforeEach, describe, expect, test, vi } from 'vitest';
import { mount } from '@vue/test-utils';
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
const copyUserDisplayNameMock = vi.fn();
const getUserStateTextMock = vi.fn(() => 'Online');
const toggleBadgeVisibilityMock = vi.fn();
const toggleBadgeShowcasedMock = vi.fn();
const userDialogCommandMock = vi.fn();

vi.mock('pinia', async (i) => ({ ...(await i()), storeToRefs: (s) => s }));
vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (k) => k, te: () => false })
}));
vi.mock('../../../../stores', () => ({
    useUserStore: () => ({
        userDialog: userDialogMock,
        currentUser: currentUserMock,
        isLocalUserVrcPlusSupporter: isLocalUserVrcPlusSupporterMock,
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
        userImage: () => 'https://example.com/avatar.png',
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
        currentUserMock.value.id = 'usr_self';
        isLocalUserVrcPlusSupporterMock.value = false;
        copyUserDisplayNameMock.mockReset();
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

    test('preserves copy displayName click behavior', async () => {
        const wrapper = mountHeader();
        const nameSpan = wrapper
            .findAll('span')
            .find((s) => s.text() === 'TargetUser');
        expect(nameSpan).toBeTruthy();
        await nameSpan.trigger('click');
        expect(copyUserDisplayNameMock).toHaveBeenCalledWith('TargetUser');
    });
});
