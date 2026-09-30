import { beforeEach, describe, expect, test, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { reactive, ref } from 'vue';

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
const isGameRunningMock = ref(true);
const photonLobbyCurrentMock = ref(new Map());
const photonLobbyAvatarsMock = ref(new Map());
const lastLocationMock = ref({
    location: 'wrld_test:1',
    playerList: new Map()
});
const gameLogStateMock = reactive({ lastLocationAvatarList: new Map() });
const cachedAvatarsMock = new Map();
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
    }),
    useGameStore: () => ({ isGameRunning: isGameRunningMock }),
    usePhotonStore: () => ({
        photonLobbyCurrent: photonLobbyCurrentMock,
        photonLobbyAvatars: photonLobbyAvatarsMock
    }),
    useLocationStore: () => ({ lastLocation: lastLocationMock }),
    useGameLogStore: () => ({ state: gameLogStateMock }),
    useAvatarStore: () => ({ cachedAvatars: cachedAvatarsMock }),
    useAvatarProviderStore: () => ({
        avatarRemoteDatabaseProviderList: ['https://example.com/provider']
    })
}));

vi.mock('../../../../api', () => ({
    avatarRequest: { getAvatar: vi.fn() },
    userRequest: { getUsers: vi.fn() }
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
vi.mock('../../../../coordinators/avatarCoordinator', () => ({
    lookupAvatarsByAuthor: vi.fn()
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
    default: {
        name: 'AvatarInfo',
        props: ['observedAvatar'],
        template: '<div data-testid="avatar-info" />'
    }
}));

vi.mock('../../../../services/observedAvatarRequest', () => ({
    observedAvatarRequester: { getAvatar: vi.fn(), run: vi.fn() }
}));

import { avatarRequest, userRequest } from '../../../../api';
import { lookupAvatarsByAuthor } from '../../../../coordinators/avatarCoordinator';
import { observedAvatarRequester } from '../../../../services/observedAvatarRequest';
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
        },
        global: {
            components: {
                AvatarInfo: {
                    name: 'AvatarInfo',
                    props: ['observedAvatar'],
                    template: '<div data-testid="avatar-info" />'
                },
                TooltipWrapper: { template: '<div><slot /></div>' }
            }
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
        isGameRunningMock.value = true;
        photonLobbyCurrentMock.value = new Map();
        photonLobbyAvatarsMock.value = new Map();
        lastLocationMock.value = {
            location: 'wrld_test:1',
            playerList: new Map()
        };
        gameLogStateMock.lastLocationAvatarList.clear();
        globalThis.AppApi = {
            GetObservedAvatarLogData: vi
                .fn()
                .mockResolvedValue('{"avatarName":"","avatarIds":[]}')
        };
        cachedAvatarsMock.clear();
        vi.mocked(avatarRequest.getAvatar).mockReset();
        vi.mocked(userRequest.getUsers).mockReset();
        vi.mocked(lookupAvatarsByAuthor).mockReset();
        vi.mocked(observedAvatarRequester.run)
            .mockReset()
            .mockImplementation(async (operation, isCancelled) => {
                if (isCancelled()) return { status: 'cancelled' };
                try {
                    const { json } = await operation();
                    return { status: 'ok', json };
                } catch (error) {
                    return {
                        status: error?.status === 429 ? 'rate_limited' : 'error'
                    };
                }
            });
        vi.mocked(observedAvatarRequester.getAvatar)
            .mockReset()
            .mockImplementation(async (avatarId, isCancelled) => {
                if (isCancelled()) return { status: 'cancelled' };
                try {
                    const { json } = await avatarRequest.getAvatar({
                        avatarId
                    });
                    return { status: 'ok', json };
                } catch (error) {
                    return {
                        status: error?.status === 429 ? 'rate_limited' : 'error'
                    };
                }
            });
        currentUserMock.value.id = 'usr_self';
        isLocalUserVrcPlusSupporterMock.value = false;
        copyUserDisplayNameMock.mockReset();
        userImageMock.mockClear();
    });

    test('shows the verified current public avatar from a friend in the same instance', async () => {
        photonLobbyCurrentMock.value.set(1, { id: 'usr_target' });
        photonLobbyAvatarsMock.value.set('usr_target', 'avtr_jelly');
        cachedAvatarsMock.set('avtr_jelly', { authorId: 'usr_creator' });
        vi.mocked(avatarRequest.getAvatar).mockResolvedValue({
            json: {
                id: 'avtr_jelly',
                name: 'Jelly Birb',
                authorId: 'usr_creator',
                releaseStatus: 'public',
                imageUrl: 'https://example.com/jelly.png',
                thumbnailImageUrl: 'https://example.com/jelly-thumb.png'
            }
        });

        const wrapper = mountHeader();
        await flushPromises();

        expect(observedAvatarRequester.getAvatar).toHaveBeenCalledWith(
            'avtr_jelly',
            expect.any(Function)
        );
        expect(
            wrapper
                .findComponent({ name: 'AvatarInfo' })
                .props('observedAvatar')
        ).toMatchObject({
            id: 'avtr_jelly',
            name: 'Jelly Birb'
        });
        expect(
            wrapper
                .find('img[src="https://example.com/jelly-thumb.png"]')
                .exists()
        ).toBe(true);
        wrapper.unmount();
    });

    test('uses a unique public avatar ID matching the current game log name when Photon is unavailable', async () => {
        lastLocationMock.value.playerList.set('usr_target', {
            displayName: 'TargetUser'
        });
        vi.mocked(AppApi.GetObservedAvatarLogData).mockResolvedValue(
            JSON.stringify({
                avatarName: 'Fish v1․0',
                avatarIds: [
                    'avtr_11111111-1111-1111-1111-111111111111',
                    'avtr_22222222-2222-2222-2222-222222222222'
                ]
            })
        );
        vi.mocked(avatarRequest.getAvatar).mockImplementation(({ avatarId }) =>
            Promise.resolve({
                json: {
                    id: avatarId,
                    name:
                        avatarId === 'avtr_22222222-2222-2222-2222-222222222222'
                            ? 'Fish v1.0'
                            : 'Other',
                    authorId: 'usr_creator',
                    releaseStatus: 'public',
                    thumbnailImageUrl: 'https://example.com/fish.png'
                }
            })
        );

        const wrapper = mountHeader();
        await flushPromises();

        expect(
            wrapper
                .findComponent({ name: 'AvatarInfo' })
                .props('observedAvatar')?.id
        ).toBe('avtr_22222222-2222-2222-2222-222222222222');
        wrapper.unmount();
    });

    test('finds the public avatar by its logged creator before its ID appears in the game log', async () => {
        lastLocationMock.value.playerList.set('usr_target', {
            displayName: 'TargetUser'
        });
        vi.mocked(AppApi.GetObservedAvatarLogData).mockResolvedValue(
            JSON.stringify({
                avatarName: '＃Ceru-515N4',
                avatarAuthorName: '515N4',
                avatarIds: []
            })
        );
        vi.mocked(userRequest.getUsers).mockResolvedValue({
            json: [{ id: 'usr_creator', displayName: '515N4' }]
        });
        vi.mocked(lookupAvatarsByAuthor).mockResolvedValue([
            {
                id: 'avtr_public',
                authorId: 'usr_creator',
                name: '#Ceru-515N4',
                releaseStatus: 'public'
            }
        ]);
        vi.mocked(avatarRequest.getAvatar).mockResolvedValue({
            json: {
                id: 'avtr_public',
                authorId: 'usr_creator',
                authorName: '515N4',
                name: '#Ceru-515N4',
                releaseStatus: 'public',
                thumbnailImageUrl: 'https://example.com/ceru.png'
            }
        });

        const wrapper = mountHeader();
        await flushPromises();

        expect(userRequest.getUsers).toHaveBeenCalledWith(
            expect.objectContaining({ search: '515N4' })
        );
        expect(lookupAvatarsByAuthor).toHaveBeenCalledWith(
            'https://example.com/provider',
            'usr_creator',
            { silent: true, honorRateLimit: true }
        );
        expect(
            wrapper
                .findComponent({ name: 'AvatarInfo' })
                .props('observedAvatar')?.id
        ).toBe('avtr_public');
        wrapper.unmount();
    });

    test('does not choose between public avatars with the same creator and name', async () => {
        lastLocationMock.value.playerList.set('usr_target', {
            displayName: 'TargetUser'
        });
        vi.mocked(AppApi.GetObservedAvatarLogData).mockResolvedValue(
            JSON.stringify({
                avatarName: 'Same name',
                avatarAuthorName: 'Creator',
                avatarIds: []
            })
        );
        vi.mocked(userRequest.getUsers).mockResolvedValue({
            json: [{ id: 'usr_creator', displayName: 'Creator' }]
        });
        vi.mocked(lookupAvatarsByAuthor).mockResolvedValue([
            {
                id: 'avtr_a',
                authorId: 'usr_creator',
                name: 'Same name',
                releaseStatus: 'public'
            },
            {
                id: 'avtr_b',
                authorId: 'usr_creator',
                name: 'Same name',
                releaseStatus: 'public'
            }
        ]);

        const wrapper = mountHeader();
        await flushPromises();

        expect(avatarRequest.getAvatar).not.toHaveBeenCalled();
        expect(
            wrapper
                .findComponent({ name: 'AvatarInfo' })
                .props('observedAvatar')
        ).toBe(null);
        wrapper.unmount();
    });

    test('does not guess when multiple public avatar IDs share the logged name', async () => {
        lastLocationMock.value.playerList.set('usr_target', {
            displayName: 'TargetUser'
        });
        vi.mocked(AppApi.GetObservedAvatarLogData).mockResolvedValue(
            JSON.stringify({
                avatarName: 'Same name',
                avatarIds: [
                    'avtr_11111111-1111-1111-1111-111111111111',
                    'avtr_22222222-2222-2222-2222-222222222222'
                ]
            })
        );
        vi.mocked(avatarRequest.getAvatar).mockImplementation(({ avatarId }) =>
            Promise.resolve({
                json: {
                    id: avatarId,
                    name: 'Same name',
                    releaseStatus: 'public'
                }
            })
        );

        const wrapper = mountHeader();
        await flushPromises();

        expect(
            wrapper
                .findComponent({ name: 'AvatarInfo' })
                .props('observedAvatar')
        ).toBe(null);
        wrapper.unmount();
    });

    test('requests logged avatar candidates one at a time', async () => {
        lastLocationMock.value.playerList.set('usr_target', {
            displayName: 'TargetUser'
        });
        vi.mocked(AppApi.GetObservedAvatarLogData).mockResolvedValue(
            JSON.stringify({
                avatarName: 'Fish',
                avatarIds: [
                    'avtr_11111111-1111-1111-1111-111111111111',
                    'avtr_22222222-2222-2222-2222-222222222222'
                ]
            })
        );
        let finishFirstRequest;
        vi.mocked(avatarRequest.getAvatar)
            .mockImplementationOnce(
                () => new Promise((resolve) => (finishFirstRequest = resolve))
            )
            .mockResolvedValueOnce({
                json: {
                    id: 'avtr_22222222-2222-2222-2222-222222222222',
                    name: 'Fish',
                    releaseStatus: 'public'
                }
            });

        const wrapper = mountHeader();
        await flushPromises();
        expect(avatarRequest.getAvatar).toHaveBeenCalledTimes(1);
        finishFirstRequest({
            json: {
                id: 'avtr_11111111-1111-1111-1111-111111111111',
                name: 'Other',
                releaseStatus: 'public'
            }
        });
        wrapper.unmount();
    });

    test('stops checking logged candidates after VRChat rate limits a request', async () => {
        lastLocationMock.value.playerList.set('usr_target', {
            displayName: 'TargetUser'
        });
        vi.mocked(AppApi.GetObservedAvatarLogData).mockResolvedValue(
            JSON.stringify({
                avatarName: 'Fish',
                avatarIds: [
                    'avtr_11111111-1111-1111-1111-111111111111',
                    'avtr_22222222-2222-2222-2222-222222222222'
                ]
            })
        );
        vi.mocked(avatarRequest.getAvatar).mockRejectedValueOnce(
            Object.assign(new Error('rate limited'), {
                status: 429,
                retryAfter: '60'
            })
        );

        const wrapper = mountHeader();
        await flushPromises();
        expect(avatarRequest.getAvatar).toHaveBeenCalledTimes(1);
        expect(
            wrapper
                .findComponent({ name: 'AvatarInfo' })
                .props('observedAvatar')
        ).toBe(null);
        wrapper.unmount();
    });

    test('rejects private log candidates and clears a result when the friend leaves', async () => {
        lastLocationMock.value.playerList.set('usr_target', {
            displayName: 'TargetUser'
        });
        vi.mocked(AppApi.GetObservedAvatarLogData).mockResolvedValue(
            JSON.stringify({
                avatarName: 'Fish v1.0',
                avatarIds: ['avtr_22222222-2222-2222-2222-222222222222']
            })
        );
        vi.mocked(avatarRequest.getAvatar).mockResolvedValueOnce({
            json: {
                id: 'avtr_22222222-2222-2222-2222-222222222222',
                name: 'Fish v1.0',
                releaseStatus: 'private'
            }
        });
        const wrapper = mountHeader();
        await flushPromises();
        expect(
            wrapper
                .findComponent({ name: 'AvatarInfo' })
                .props('observedAvatar')
        ).toBe(null);

        gameLogStateMock.lastLocationAvatarList.set('TargetUser', 'Fish v1.0');
        vi.mocked(avatarRequest.getAvatar).mockResolvedValueOnce({
            json: {
                id: 'avtr_22222222-2222-2222-2222-222222222222',
                name: 'Fish v1.0',
                releaseStatus: 'public'
            }
        });
        await flushPromises();
        expect(
            wrapper
                .findComponent({ name: 'AvatarInfo' })
                .props('observedAvatar')?.releaseStatus
        ).toBe('public');

        lastLocationMock.value.playerList.delete('usr_target');
        await flushPromises();
        expect(
            wrapper
                .findComponent({ name: 'AvatarInfo' })
                .props('observedAvatar')
        ).toBe(null);
        wrapper.unmount();
    });

    test('does not expose a private or mismatched observed avatar', async () => {
        photonLobbyCurrentMock.value.set(1, { id: 'usr_target' });
        photonLobbyAvatarsMock.value.set('usr_target', 'avtr_jelly');
        cachedAvatarsMock.set('avtr_jelly', { authorId: 'usr_creator' });
        vi.mocked(avatarRequest.getAvatar).mockResolvedValueOnce({
            json: {
                id: 'avtr_jelly',
                name: 'Private Avatar',
                authorId: 'usr_creator',
                releaseStatus: 'private',
                thumbnailImageUrl: 'https://example.com/private.png'
            }
        });
        const wrapper = mountHeader();
        await flushPromises();
        expect(
            wrapper
                .findComponent({ name: 'AvatarInfo' })
                .props('observedAvatar')
        ).toBe(null);
        expect(
            wrapper.find('img[src="https://example.com/private.png"]').exists()
        ).toBe(false);

        vi.mocked(avatarRequest.getAvatar).mockResolvedValueOnce({
            json: {
                id: 'avtr_other',
                name: 'Wrong Avatar',
                authorId: 'usr_wrong',
                releaseStatus: 'public'
            }
        });
        cachedAvatarsMock.set('avtr_other', { authorId: 'usr_creator' });
        photonLobbyAvatarsMock.value.set('usr_target', 'avtr_other');
        await flushPromises();
        expect(
            wrapper
                .findComponent({ name: 'AvatarInfo' })
                .props('observedAvatar')
        ).toBe(null);
        wrapper.unmount();
    });

    test('discards an observed avatar response after the friend leaves', async () => {
        photonLobbyCurrentMock.value.set(1, { id: 'usr_target' });
        photonLobbyAvatarsMock.value.set('usr_target', 'avtr_jelly');
        let finishRequest;
        vi.mocked(avatarRequest.getAvatar).mockImplementation(
            () => new Promise((resolve) => (finishRequest = resolve))
        );
        const wrapper = mountHeader();
        photonLobbyCurrentMock.value.delete(1);
        finishRequest({
            json: {
                id: 'avtr_jelly',
                name: 'Jelly Birb',
                authorId: 'usr_creator',
                releaseStatus: 'public'
            }
        });
        await flushPromises();
        expect(
            wrapper
                .findComponent({ name: 'AvatarInfo' })
                .props('observedAvatar')
        ).toBe(null);
        wrapper.unmount();
    });

    test('does not pair the current avatar name with an old profile thumbnail', async () => {
        userDialogMock.value.ref.currentAvatarThumbnailImageUrl =
            'https://example.com/old-avatar.png';
        photonLobbyCurrentMock.value.set(1, { id: 'usr_target' });
        photonLobbyAvatarsMock.value.set('usr_target', 'avtr_jelly');
        vi.mocked(avatarRequest.getAvatar).mockResolvedValue({
            json: {
                id: 'avtr_jelly',
                name: 'Jelly Birb',
                authorId: 'usr_creator',
                releaseStatus: 'public'
            }
        });

        const wrapper = mountHeader();
        await flushPromises();
        expect(
            wrapper
                .findComponent({ name: 'AvatarInfo' })
                .props('observedAvatar')?.name
        ).toBe('Jelly Birb');
        expect(
            wrapper
                .find('img[src="https://example.com/old-avatar.png"]')
                .exists()
        ).toBe(false);
        wrapper.unmount();
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
