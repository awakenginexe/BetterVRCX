import { createPinia, setActivePinia } from 'pinia';
import { nextTick, reactive } from 'vue';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    sendInvite: vi.fn(),
    sendInvitePhoto: vi.fn(),
    selfInvite: vi.fn(),
    recentAction: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    userStore: null,
    watchState: { isLoggedIn: true }
}));

vi.mock('../../api', () => ({
    instanceRequest: { selfInvite: mocks.selfInvite },
    notificationRequest: {
        sendInvite: mocks.sendInvite,
        sendInvitePhoto: mocks.sendInvitePhoto
    },
    inviteMessagesRequest: { refreshInviteMessageTableData: vi.fn() }
}));
vi.mock('../user', () => ({ useUserStore: () => mocks.userStore }));
vi.mock('../friend', () => ({
    useFriendStore: () => ({ friends: new Map() })
}));
vi.mock('../game', () => ({ useGameStore: () => ({ isGameRunning: false }) }));
vi.mock('../settings/advanced', () => ({
    useAdvancedSettingsStore: () => ({ selfInviteOverride: false })
}));
vi.mock('../../services/watchState', () => ({ watchState: mocks.watchState }));
vi.mock('../../plugins/i18n', () => ({
    i18n: { global: { t: (key) => key } }
}));
vi.mock('../../shared/utils', () => ({
    parseLocation: () => ({ worldId: 'wrld_1', instanceId: '123' })
}));
vi.mock('../../composables/useRecentActions', () => ({
    recordRecentAction: mocks.recentAction
}));
vi.mock('vue-sonner', () => ({
    toast: {
        success: mocks.success,
        warning: mocks.warning,
        error: mocks.error
    }
}));

import { useInviteStore } from '../invite';

describe('Invite store batch routing', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
        mocks.watchState.isLoggedIn = true;
        mocks.userStore = reactive({
            currentUser: { id: 'usr_me', displayName: 'Me' }
        });
        mocks.sendInvite.mockResolvedValue({});
        mocks.sendInvitePhoto.mockResolvedValue({});
        mocks.selfInvite.mockResolvedValue({});
    });

    test('uses existing self and photo requests with a captured image', async () => {
        const store = useInviteStore();
        await store.startInviteBatch({
            instanceId: 'wrld_1:123',
            worldName: 'World',
            recipients: ['usr_me', 'usr_a', 'usr_a'],
            messageSlot: 2,
            imageData: 'captured'
        });
        expect(mocks.selfInvite).toHaveBeenCalledWith({
            instanceId: '123',
            worldId: 'wrld_1'
        });
        expect(mocks.sendInvitePhoto).toHaveBeenCalledWith(
            {
                instanceId: 'wrld_1:123',
                worldId: 'wrld_1:123',
                worldName: 'World',
                messageSlot: 2
            },
            'usr_a',
            'captured'
        );
        expect(mocks.sendInvite).not.toHaveBeenCalled();
        expect(store.inviteBatchSummary).toMatchObject({
            total: 2,
            succeeded: 2
        });
        expect(mocks.success).toHaveBeenCalledTimes(1);
    });

    test('never emits a full-success toast for partial failure', async () => {
        mocks.sendInvite.mockRejectedValueOnce(
            Object.assign(new Error('Forbidden'), { status: 403 })
        );
        const store = useInviteStore();
        await store.startInviteBatch({
            instanceId: 'wrld_1:123',
            worldName: 'World',
            recipients: ['usr_me', 'usr_a']
        });
        expect(store.inviteBatch.status).toBe('partial');
        expect(mocks.success).not.toHaveBeenCalled();
        expect(mocks.warning).toHaveBeenCalledTimes(1);
    });

    test('account switch cancels unstarted sends and suppresses the old account toast', async () => {
        let resolve;
        mocks.sendInvite.mockImplementationOnce(
            () =>
                new Promise((done) => {
                    resolve = done;
                })
        );
        const store = useInviteStore();
        const done = store.startInviteBatch({
            instanceId: 'wrld_1:123',
            worldName: 'World',
            recipients: ['usr_a', 'usr_b']
        });
        mocks.userStore.currentUser.id = 'usr_other';
        await nextTick();
        resolve({});
        await done;
        expect(mocks.sendInvite).toHaveBeenCalledTimes(1);
        expect(store.inviteBatch.status).toBe('cancelled');
        expect(store.inviteBatchSummary).toMatchObject({
            succeeded: 1,
            cancelled: 1
        });
        expect(mocks.success).not.toHaveBeenCalled();
    });
});
