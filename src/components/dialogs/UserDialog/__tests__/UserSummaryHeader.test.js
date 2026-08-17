import { beforeEach, describe, expect, test, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';

import {
    getProfileEffectPresentation,
    resolveProfileIconFrameAssetUrl,
    resolveProfileEffectAssetUrl
} from '@/shared/utils/profileEffect';

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
const copyUserDisplayNameMock = vi.fn();
const getUserStateTextMock = vi.fn(() => 'Online');
const toggleBadgeVisibilityMock = vi.fn();
const toggleBadgeShowcasedMock = vi.fn();
const userDialogCommandMock = vi.fn();
const getInventoryItemsMock = vi.fn();
const getInventoryTemplateMock = vi.fn();

vi.mock('pinia', async (i) => ({ ...(await i()), storeToRefs: (s) => s }));
vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (k) => k, te: () => false })
}));
vi.mock('../../../../stores', () => ({
    useAppearanceSettingsStore: () => ({
        displayVRCProfileEffects: displayVRCProfileEffectsMock
    }),
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

vi.mock('@/api', () => ({
    inventoryRequest: {
        getInventoryItems: (...args) => getInventoryItemsMock(...args),
        getInventoryTemplate: (...args) => getInventoryTemplateMock(...args)
    }
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
        displayVRCProfileEffectsMock.value = true;
        currentUserMock.value.id = 'usr_self';
        isLocalUserVrcPlusSupporterMock.value = false;
        copyUserDisplayNameMock.mockReset();
        getInventoryItemsMock.mockReset();
        getInventoryTemplateMock.mockReset().mockResolvedValue({ json: {} });
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

    test('renders the VRChat profile-effect asset with the live-site sizing', () => {
        userDialogMock.value.publicProfileRef.profileEffect =
            'file_dfc3780b-88e5-4210-aa42-3953a4c0107a';

        const wrapper = mountHeader();
        const effectImage = wrapper.find('[data-profile-effect-asset]');

        expect(effectImage.exists()).toBe(true);
        expect(effectImage.attributes('alt')).toBe('');
        expect(effectImage.attributes('src')).toBe(
            'https://api.vrchat.cloud/api/1/file/file_dfc3780b-88e5-4210-aa42-3953a4c0107a/1/file'
        );
        expect(effectImage.classes()).not.toContain('h-full');
        expect(wrapper.findAll('.bv-profile-effect-surface')).toHaveLength(0);
    });

    test('does not render or resolve profile effects when disabled', async () => {
        displayVRCProfileEffectsMock.value = false;
        userDialogMock.value.publicProfileRef.profileEffect =
            'invt_11111111-1111-4111-8111-111111111111';
        userDialogMock.value.publicProfileRef.iconFrame =
            'invt_22222222-2222-4222-8222-222222222222';

        const wrapper = mountHeader();
        await flushPromises();

        expect(wrapper.find('[data-profile-effect-asset]').exists()).toBe(
            false
        );
        expect(wrapper.find('[data-profile-effect-avatar]').exists()).toBe(
            false
        );
        expect(getInventoryTemplateMock).not.toHaveBeenCalled();
    });

    test('renders the VRChat icon frame above the circular profile image', async () => {
        userDialogMock.value.publicProfileRef.iconFrame =
            'invt_4f85c77c-d5f1-48a5-a3eb-1120f68af121';
        getInventoryTemplateMock.mockResolvedValue({
            json: {
                data: [
                    {
                        templateId:
                            userDialogMock.value.publicProfileRef.iconFrame,
                        metadata: {
                            assets: [
                                {
                                    type: 'mainAnimation',
                                    url: 'https://api.vrchat.cloud/api/1/file/file_4a23a060-2148-4a1f-a854-7e5d427f2ed3/1/file'
                                }
                            ]
                        }
                    }
                ]
            }
        });

        const wrapper = mountHeader();
        await flushPromises();
        const avatarFrame = wrapper.find('[data-profile-effect-avatar]');

        expect(avatarFrame.exists()).toBe(true);
        expect(avatarFrame.attributes('src')).toBe(
            'https://api.vrchat.cloud/api/1/file/file_4a23a060-2148-4a1f-a854-7e5d427f2ed3/1/file'
        );
        expect(
            wrapper.find('.bv-entity-hero-avatar-frame').classes()
        ).toContain('z-30');
        expect(wrapper.find('.bv-entity-hero-avatar').classes()).toContain(
            'rounded-full'
        );
    });

    test('loads the exact profile-effect asset from the public template', async () => {
        const userId = 'usr_effect_target';
        const profileEffect = 'invt_6b603b03-5ed0-432b-8f4c-f7ac9c9bad096';
        const assetUrl =
            'https://api.vrchat.cloud/api/1/file/file_effect-animation/1/file';
        userDialogMock.value.id = userId;
        userDialogMock.value.ref.id = userId;
        userDialogMock.value.publicProfileRef.profileEffect = profileEffect;
        getInventoryTemplateMock.mockResolvedValue({
            json: {
                data: [
                    {
                        templateId: profileEffect,
                        metadata: {
                            assets: [{ type: 'mainAnimation', url: assetUrl }]
                        }
                    }
                ]
            }
        });

        const wrapper = mountHeader();
        await flushPromises();

        expect(getInventoryTemplateMock).toHaveBeenCalledWith({
            inventoryTemplateId: profileEffect
        });
        expect(getInventoryItemsMock).not.toHaveBeenCalled();
        expect(
            wrapper.find('[data-profile-effect-asset]').attributes('src')
        ).toBe(assetUrl);
        expect(wrapper.findAll('.bv-profile-effect-surface')).toHaveLength(0);
    });
});

describe('getProfileEffectPresentation', () => {
    test('normalizes a known profile effect into its visual theme', () => {
        expect(getProfileEffectPresentation('Meteor Shower')).toEqual({
            active: true,
            assetUrl: '',
            id: 'Meteor Shower',
            theme: 'meteor'
        });
    });

    test('keeps unknown profile effects active with the default visual theme', () => {
        expect(getProfileEffectPresentation('vrchat-effect-unknown')).toEqual({
            active: true,
            assetUrl: '',
            id: 'vrchat-effect-unknown',
            theme: 'default'
        });
    });

    test('resolves a VRChat file identifier to the profile-effect asset endpoint', () => {
        expect(
            getProfileEffectPresentation(
                'file_dfc3780b-88e5-4210-aa42-3953a4c0107a'
            )
        ).toEqual({
            active: true,
            assetUrl:
                'https://api.vrchat.cloud/api/1/file/file_dfc3780b-88e5-4210-aa42-3953a4c0107a/1/file',
            id: 'file_dfc3780b-88e5-4210-aa42-3953a4c0107a',
            theme: 'default'
        });
    });

    test('ignores missing and whitespace-only profile effects', () => {
        expect(getProfileEffectPresentation('   ')).toEqual({
            active: false,
            assetUrl: '',
            id: '',
            theme: 'default'
        });
        expect(getProfileEffectPresentation(null)).toEqual({
            active: false,
            assetUrl: '',
            id: '',
            theme: 'default'
        });
    });
});

describe('resolveProfileEffectAssetUrl', () => {
    test('resolves an inventory template to its animated profile-effect asset', async () => {
        const getInventoryTemplate = vi.fn().mockResolvedValue({
            json: {
                data: [
                    {
                        templateId:
                            'invt_6b603b03-5ed0-432b-8f4c-f7ac9c9bad096',
                        metadata: {
                            assets: [
                                {
                                    type: 'mainAnimation',
                                    url: 'https://api.vrchat.cloud/api/1/file/file_dfc3780b-88e5-4210-aa42-3953a4c0107a/1/file'
                                }
                            ]
                        }
                    }
                ]
            }
        });

        await expect(
            resolveProfileEffectAssetUrl(
                'invt_6b603b03-5ed0-432b-8f4c-f7ac9c9bad096',
                getInventoryTemplate
            )
        ).resolves.toBe(
            'https://api.vrchat.cloud/api/1/file/file_dfc3780b-88e5-4210-aa42-3953a4c0107a/1/file'
        );

        expect(getInventoryTemplate).toHaveBeenCalledWith({
            inventoryTemplateId: 'invt_6b603b03-5ed0-432b-8f4c-f7ac9c9bad096'
        });
    });

    test('does not query inventory for a named fallback effect', async () => {
        const getInventoryTemplate = vi.fn();

        await expect(
            resolveProfileEffectAssetUrl('Afterglow', getInventoryTemplate)
        ).resolves.toBe('');

        expect(getInventoryTemplate).not.toHaveBeenCalled();
    });

    test('resolves an inventory template to its animated icon-frame asset', async () => {
        const getInventoryTemplate = vi.fn().mockResolvedValue({
            json: {
                data: [
                    {
                        templateId: 'invt_4f85c77c-d5f1-48a5-a3eb-1120f68af121',
                        metadata: {
                            assets: [
                                {
                                    type: 'mainAnimation',
                                    url: 'https://api.vrchat.cloud/api/1/file/file_4a23a060-2148-4a1f-a854-7e5d427f2ed3/1/file'
                                }
                            ]
                        }
                    }
                ]
            }
        });

        await expect(
            resolveProfileIconFrameAssetUrl(
                'invt_4f85c77c-d5f1-48a5-a3eb-1120f68af121',
                getInventoryTemplate
            )
        ).resolves.toBe(
            'https://api.vrchat.cloud/api/1/file/file_4a23a060-2148-4a1f-a854-7e5d427f2ed3/1/file'
        );
    });

    test('resolves a public inventory template without requesting a holder inventory', async () => {
        const getInventoryTemplate = vi.fn().mockResolvedValue({
            json: {
                id: 'invt_12345678-1234-1234-1234-123456789abc',
                metadata: {
                    assets: [
                        {
                            type: 'mainAnimation',
                            url: 'https://api.vrchat.cloud/api/1/file/file_public-animation/1/file'
                        }
                    ]
                }
            }
        });

        await expect(
            resolveProfileEffectAssetUrl(
                'invt_12345678-1234-1234-1234-123456789abc',
                getInventoryTemplate
            )
        ).resolves.toBe(
            'https://api.vrchat.cloud/api/1/file/file_public-animation/1/file'
        );

        expect(getInventoryTemplate).toHaveBeenCalledWith({
            inventoryTemplateId: 'invt_12345678-1234-1234-1234-123456789abc'
        });
    });
});
