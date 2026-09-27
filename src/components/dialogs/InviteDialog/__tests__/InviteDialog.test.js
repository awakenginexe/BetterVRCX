import { mount } from '@vue/test-utils';
import { nextTick, reactive, toRefs } from 'vue';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    confirm: vi.fn(),
    start: vi.fn(),
    cancel: vi.fn(),
    retry: vi.fn(),
    inviteStore: null
}));

vi.mock('pinia', async (importOriginal) => ({
    ...(await importOriginal()),
    storeToRefs: (store) => toRefs(store)
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock('../../../../stores', () => ({
    useFriendStore: () =>
        reactive({
            vipFriends: [],
            onlineFriends: [],
            activeFriends: [],
            friends: new Map()
        }),
    useFavoriteStore: () =>
        reactive({
            favoriteFriendGroups: [],
            localFriendFavoriteGroups: [],
            localFriendFavorites: {},
            groupedByGroupKeyFavoriteFriends: {}
        }),
    useInviteStore: () => mocks.inviteStore,
    useGalleryStore: () => ({ clearInviteImageUpload: vi.fn() }),
    useModalStore: () => ({ confirm: mocks.confirm }),
    useUserStore: () =>
        reactive({ currentUser: { id: 'usr_me', displayName: 'Me' } })
}));
vi.mock('../../../../composables/useUserDisplay', () => ({
    useUserDisplay: () => ({ userImage: () => '', userStatusClass: () => '' })
}));
vi.mock('../../../ui/virtual-combobox', () => ({
    VirtualCombobox: { template: '<div />' }
}));
vi.mock('../../../ui/dropdown-menu', () => ({
    DropdownMenu: { template: '<div><slot /></div>' },
    DropdownMenuContent: { template: '<div><slot /></div>' },
    DropdownMenuItem: { template: '<div><slot /></div>' },
    DropdownMenuSeparator: { template: '<div />' },
    DropdownMenuTrigger: { template: '<div><slot /></div>' }
}));
vi.mock('../SendInviteDialog.vue', () => ({
    default: { template: '<div />' }
}));
vi.mock('@/components/ui/dialog', () => ({
    Dialog: { template: '<div><slot /></div>' },
    DialogContent: { template: '<div><slot /></div>' },
    DialogFooter: { template: '<div><slot /></div>' },
    DialogHeader: { template: '<div><slot /></div>' },
    DialogTitle: { template: '<div><slot /></div>' }
}));
vi.mock('@/components/ui/button', () => ({
    Button: {
        props: ['disabled'],
        template: '<button :disabled="disabled"><slot /></button>'
    }
}));

import InviteDialog from '../InviteDialog.vue';

const inviteDialog = () =>
    reactive({
        visible: true,
        worldId: 'wrld_1:123',
        worldName: 'World',
        friendsInInstance: [],
        userIds: ['usr_a', 'usr_a', 'usr_b']
    });

describe('InviteDialog batch progress', () => {
    beforeEach(() => {
        mocks.confirm.mockReset().mockResolvedValue({ ok: true });
        mocks.start.mockReset().mockReturnValue(Promise.resolve());
        mocks.cancel.mockReset();
        mocks.retry.mockReset();
        mocks.inviteStore = reactive({
            refreshInviteMessageTableData: vi.fn(),
            startInviteBatch: mocks.start,
            cancelInviteBatch: mocks.cancel,
            retryFailedInviteBatch: mocks.retry,
            inviteBatch: {
                status: 'idle',
                accountId: '',
                instanceId: '',
                worldName: '',
                entries: [],
                retryAfterAt: 0
            },
            inviteBatchSummary: {
                total: 0,
                completed: 0,
                succeeded: 0,
                failed: 0,
                cancelled: 0,
                unknown: 0
            }
        });
    });

    test('submits once and keeps progress visible after dialog remount', async () => {
        const props = { inviteDialog: inviteDialog() };
        const first = mount(InviteDialog, { props });
        await first
            .findAll('button')
            .find((button) => button.text() === 'dialog.invite.invite')
            .trigger('click');
        await nextTick();
        expect(mocks.start).toHaveBeenCalledTimes(1);
        expect(mocks.start.mock.calls[0][0].recipients).toEqual([
            { id: 'usr_a', name: 'usr_a' },
            { id: 'usr_a', name: 'usr_a' },
            { id: 'usr_b', name: 'usr_b' }
        ]);

        mocks.inviteStore.inviteBatch = {
            status: 'running',
            accountId: 'usr_me',
            instanceId: 'wrld_1:123',
            worldName: 'World',
            entries: [{ id: 'usr_a', name: 'Alice', status: 'success' }],
            retryAfterAt: 0
        };
        mocks.inviteStore.inviteBatchSummary = {
            total: 2,
            completed: 1,
            succeeded: 1,
            failed: 0,
            cancelled: 0,
            unknown: 0
        };
        await nextTick();
        expect(first.get('[role="status"]').text()).toContain('Alice');
        first.unmount();
        const reopened = mount(InviteDialog, { props });
        expect(reopened.get('[role="status"]').text()).toContain('Alice');
        await reopened
            .findAll('button')
            .find(
                (button) =>
                    button.text() === 'dialog.invite.batch_cancel_action'
            )
            .trigger('click');
        expect(mocks.cancel).toHaveBeenCalledTimes(1);
    });
});
