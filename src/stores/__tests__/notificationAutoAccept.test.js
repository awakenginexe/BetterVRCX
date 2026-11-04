import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const mocks = vi.hoisted(() => ({
    settings: {
        autoAcceptInviteRequests: 'All Favorites',
        autoAcceptInviteStatuses: []
    },
    user: { currentUser: { id: 'usr_me', status: 'active' } },
    fetch: vi.fn().mockResolvedValue({ ref: { name: 'World' } }),
    sendInvite: vi.fn().mockResolvedValue({}),
    canInvite: vi.fn(() => true),
    getJoinCount: vi.fn(),
    hide: vi.fn().mockResolvedValue({})
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock('../../shared/utils', () => ({
    checkCanInvite: mocks.canInvite,
    parseLocation: () => ({ worldId: 'wrld_test', tag: 'wrld_test:123' })
}));
vi.mock('../../shared/utils/notificationMessage', () => ({}));
vi.mock('../../coordinators/memoCoordinator', () => ({}));
vi.mock('../../coordinators/groupCoordinator', () => ({}));
vi.mock('../../coordinators/userCoordinator', () => ({}));
vi.mock('../../coordinators/friendRelationshipCoordinator', () => ({}));
vi.mock('../../api', () => ({
    queryRequest: { fetch: mocks.fetch },
    notificationRequest: {
        sendInvite: mocks.sendInvite,
        hideNotification: mocks.hide
    }
}));
vi.mock('../../services/database', () => ({
    database: { getJoinCount: mocks.getJoinCount },
    dbVars: {}
}));
vi.mock('../../services/watchState', () => ({
    watchState: { isLoggedIn: true }
}));
vi.mock('../../services/config', () => ({
    default: { getString: (_key, fallback) => Promise.resolve(fallback) }
}));
vi.mock('../settings/general', () => ({
    useGeneralSettingsStore: () => mocks.settings
}));
vi.mock('../user', () => ({ useUserStore: () => mocks.user }));
vi.mock('../location', () => ({
    useLocationStore: () => ({ lastLocation: { location: 'wrld_test:123' } })
}));
vi.mock('../favorite', () => ({
    useFavoriteStore: () => ({
        state: { favoriteFriends_: [{ id: 'usr_sender' }] }
    })
}));
vi.mock('../friend', () => ({ useFriendStore: () => ({}) }));
vi.mock('../instance', () => ({
    useInstanceStore: () => ({ cachedInstances: new Map() })
}));
vi.mock('../settings/notifications', () => ({
    useNotificationsSettingsStore: () => ({})
}));
vi.mock('../settings/advanced', () => ({
    useAdvancedSettingsStore: () => ({})
}));
vi.mock('../settings/wristOverlay', () => ({
    useWristOverlaySettingsStore: () => ({})
}));
vi.mock('../game', () => ({ useGameStore: () => ({}) }));
vi.mock('../ui', () => ({ useUiStore: () => ({}) }));
vi.mock('../sharedFeed', () => ({ useSharedFeedStore: () => ({}) }));
vi.mock('../modal', () => ({ useModalStore: () => ({}) }));

import { useNotificationStore } from '../notification';

describe('automatic invite status restrictions', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
        mocks.settings.autoAcceptInviteRequests = 'All Favorites';
        mocks.settings.autoAcceptInviteStatuses = ['join me', 'active'];
        mocks.user.currentUser.status = 'active';
    });

    test.each(['busy', 'ask me', 'offline', undefined])(
        'does not send an invite while status is %s',
        async (status) => {
            mocks.user.currentUser.status = status;
            useNotificationStore().handlePipelineNotification({
                json: { type: 'requestInvite', senderUserId: 'usr_sender' }
            });
            await Promise.resolve();
            expect(mocks.fetch).not.toHaveBeenCalled();
            expect(mocks.sendInvite).not.toHaveBeenCalled();
        }
    );

    test('keeps the existing favourite and location checks for an allowed status', async () => {
        useNotificationStore().handlePipelineNotification({
            json: { type: 'requestInvite', senderUserId: 'usr_sender' }
        });
        await vi.waitFor(() =>
            expect(mocks.sendInvite).toHaveBeenCalledTimes(1)
        );
        expect(mocks.canInvite).toHaveBeenCalled();
    });

    test('an empty selection disables automatic acceptance', () => {
        mocks.settings.autoAcceptInviteStatuses = [];
        useNotificationStore().handlePipelineNotification({
            json: { type: 'requestInvite', senderUserId: 'usr_sender' }
        });
        expect(mocks.fetch).not.toHaveBeenCalled();
    });
});

describe('optional friend request filtering', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
        mocks.user.currentUser.id = 'usr_me';
        mocks.settings.autoDeclineFriendRequests = false;
        mocks.getJoinCount.mockResolvedValue({ joinCount: 0 });
    });
    const notification = {
        type: 'friendRequest',
        id: 'not_request',
        senderUserId: 'usr_sender',
        senderUsername: 'Sender'
    };
    test('keeps requests by default', async () => {
        await useNotificationStore().handlePipelineNotification({
            json: notification
        });
        expect(mocks.getJoinCount).not.toHaveBeenCalled();
        expect(mocks.hide).not.toHaveBeenCalled();
    });
    test.each([0, '0'])(
        'hides a request with zero recorded encounters (%s)',
        async (joinCount) => {
            mocks.settings.autoDeclineFriendRequests = true;
            mocks.getJoinCount.mockResolvedValue({ joinCount });
            await useNotificationStore().handlePipelineNotification({
                json: notification
            });
            expect(mocks.hide).toHaveBeenCalledWith({
                notificationId: notification.id
            });
        }
    );
    test.each([1, undefined])(
        'keeps requests when encounter count is %s',
        async (joinCount) => {
            mocks.settings.autoDeclineFriendRequests = true;
            mocks.getJoinCount.mockResolvedValue({ joinCount });
            await useNotificationStore().handlePipelineNotification({
                json: notification
            });
            expect(mocks.hide).not.toHaveBeenCalled();
        }
    );
    test('discards a lookup completed after switching accounts', async () => {
        mocks.settings.autoDeclineFriendRequests = true;
        let resolve;
        mocks.getJoinCount.mockReturnValue(
            new Promise((done) => {
                resolve = done;
            })
        );
        const pending = useNotificationStore().handlePipelineNotification({
            json: notification
        });
        mocks.user.currentUser.id = 'usr_other';
        resolve({ joinCount: 0 });
        await pending;
        expect(mocks.hide).not.toHaveBeenCalled();
    });
});
