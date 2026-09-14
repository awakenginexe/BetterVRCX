import { beforeEach, describe, expect, test, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mocks = vi.hoisted(() => ({
    notificationTable: null,
    isNotificationsLoading: null,
    unseenNotifications: null,
    pagination: null,
    columnHandlers: null,
    refreshNotifications: vi.fn(),
    refreshInviteMessageTableData: vi.fn(),
    clearInviteImageUpload: vi.fn(),
    showFullscreenImageDialog: vi.fn(),
    configSetString: vi.fn(),
    translate: vi.fn(),
    modalConfirm: vi.fn().mockResolvedValue({ ok: true }),
    handleNotificationAccept: vi.fn(),
    handleNotificationHide: vi.fn(),
    handleNotificationV2Hide: vi.fn(),
    handleNotificationSee: vi.fn(),
    handleNotificationV2Update: vi.fn(),
    deleteNotificationLog: vi.fn(),
    friendRequestApi: {
        deleteHiddenFriendRequest: vi.fn().mockResolvedValue({})
    },
    notificationRequestApi: {
        acceptFriendRequestNotification: vi.fn().mockResolvedValue({}),
        hideNotification: vi.fn().mockResolvedValue({}),
        sendInvite: vi.fn().mockResolvedValue({}),
        sendNotificationResponse: vi.fn().mockResolvedValue({}),
        seeNotification: vi.fn().mockResolvedValue({}),
        seeNotificationV2: vi.fn().mockResolvedValue({ json: {} })
    },
    queryRequestApi: {
        fetch: vi.fn().mockResolvedValue({ ref: { name: 'World Name' } })
    },
    toast: {
        success: vi.fn(),
        warning: vi.fn(),
        error: vi.fn()
    }
}));

vi.mock('pinia', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        storeToRefs: (store) => store
    };
});

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (...args) => mocks.translate(...args),
        locale: ref('en')
    })
}));

vi.mock('vue-sonner', () => ({
    toast: mocks.toast
}));

vi.mock('../../../stores', () => ({
    useAppearanceSettingsStore: () => ({
        tablePageSizes: [10, 25, 50],
        tablePageSize: 25
    }),
    useGalleryStore: () => ({
        clearInviteImageUpload: (...args) =>
            mocks.clearInviteImageUpload(...args),
        showFullscreenImageDialog: (...args) =>
            mocks.showFullscreenImageDialog(...args)
    }),
    useInviteStore: () => ({
        refreshInviteMessageTableData: (...args) =>
            mocks.refreshInviteMessageTableData(...args)
    }),
    useNotificationStore: () => ({
        notificationTable: mocks.notificationTable,
        isNotificationsLoading: mocks.isNotificationsLoading,
        unseenNotifications: mocks.unseenNotifications,
        refreshNotifications: (...args) => mocks.refreshNotifications(...args),
        acceptFriendRequestNotification: vi.fn(),
        hideNotification: vi.fn(),
        hideNotificationPrompt: vi.fn(),
        acceptRequestInvite: vi.fn(),
        sendNotificationResponse: vi.fn(),
        deleteNotificationLog: (...args) => mocks.deleteNotificationLog(...args),
        deleteNotificationLogPrompt: vi.fn(),
        openNotificationLink: vi.fn(),
        isNotificationExpired: vi.fn((row) => Boolean(row?.$isExpired)),
        handleNotificationAccept: (...args) =>
            mocks.handleNotificationAccept(...args),
        handleNotificationHide: (...args) =>
            mocks.handleNotificationHide(...args),
        handleNotificationV2Hide: (...args) =>
            mocks.handleNotificationV2Hide(...args),
        handleNotificationSee: (...args) => mocks.handleNotificationSee(...args),
        handleNotificationV2Update: (...args) =>
            mocks.handleNotificationV2Update(...args)
    }),
    useVrcxStore: () => ({ maxTableSize: 100 }),
    useUserStore: () => ({
        currentUser: ref({ id: 'user-self' })
    }),
    useLocationStore: () => ({
        lastLocation: ref({ location: 'wrld_123:456' }),
        lastLocationDestination: ''
    }),
    useGameStore: () => ({
        isGameRunning: ref(true)
    }),
    useInstanceStore: () => ({
        cachedInstances: new Map()
    }),
    useModalStore: () => ({
        confirm: (...args) => mocks.modalConfirm(...args)
    })
}));

vi.mock('../../../services/config', () => ({
    default: {
        setString: (...args) => mocks.configSetString(...args)
    }
}));

vi.mock('../../../shared/utils', () => ({
    convertFileUrlToImageUrl: (url) => `image:${url}`,
    executeWithBackoff: async (fn) => fn(),
    parseLocation: (loc) => ({
        worldId: loc?.split(':')[0] || '',
        tag: loc || ''
    })
}));

vi.mock('../../../shared/utils/invite', () => ({
    checkCanInvite: () => true
}));

vi.mock('../../../api', () => ({
    friendRequest: mocks.friendRequestApi,
    notificationRequest: mocks.notificationRequestApi,
    queryRequest: mocks.queryRequestApi
}));

vi.mock('../../../lib/table/useVrcxVueTable', () => ({
    useVrcxVueTable: (options) => ({
        table: {
            getFilteredRowModel: () => ({ rows: options.data }),
            getCoreRowModel: () => ({ rows: options.data })
        },
        pagination: mocks.pagination
    })
}));

vi.mock('../columns.jsx', () => ({
    createColumns: (handlers) => {
        mocks.columnHandlers = handlers;
        return [];
    }
}));

vi.mock('@/components/ui/data-table', () => ({
    DataTableEmpty: {
        props: ['type'],
        template:
            '<div :class="$attrs.class" data-testid="notification-empty" />'
    },
    DataTableLayout: {
        props: ['totalItems', 'onPageSizeChange', 'loading'],
        template:
            '<div data-testid="notification-layout" :class="$attrs.class">' +
            '<slot name="toolbar" />' +
            '<slot name="empty" />' +
            '<span data-testid="total-items">{{ totalItems }}</span>' +
            '</div>'
    }
}));

vi.mock('@/components/ui/select', () => ({
    Select: {
        emits: ['update:modelValue'],
        template:
            '<div><button data-testid="set-type-filter" @click="$emit(\'update:modelValue\', [\'invite\'])">set-filter</button><slot /></div>'
    },
    SelectContent: { template: '<div><slot /></div>' },
    SelectGroup: { template: '<div><slot /></div>' },
    SelectItem: { template: '<div><slot /></div>' },
    SelectTrigger: { template: '<div :class="$attrs.class"><slot /></div>' },
    SelectValue: { template: '<div><slot /></div>' }
}));

vi.mock('@/components/ui/input-group', () => ({
    InputGroupField: {
        props: ['modelValue'],
        emits: ['update:modelValue'],
        template:
            '<input :value="modelValue" :class="$attrs.class" @input="$emit(\'update:modelValue\', $event.target.value)" />'
    }
}));

vi.mock('@/components/ui/button', () => ({
    Button: {
        props: ['disabled'],
        emits: ['click'],
        template:
            '<button :disabled="disabled" :class="$attrs.class" :aria-label="$attrs.ariaLabel" @click="$emit(\'click\')"><slot /></button>'
    }
}));

vi.mock('@/components/ui/spinner', () => ({
    Spinner: { template: '<span data-testid="spinner" />' }
}));
vi.mock('lucide-vue-next', () => ({
    RefreshCw: { template: '<span />' },
    Check: { template: '<span />' },
    CheckCheck: { template: '<span />' },
    Trash2: { template: '<span />' },
    X: { template: '<span />' }
}));
vi.mock('@/components/ui/tooltip', () => ({
    TooltipWrapper: { template: '<div><slot /></div>' }
}));

import Notification from '../Notification.vue';

const dialogFiles = [
    '../dialogs/SendInviteRequestResponseDialog.vue',
    '../dialogs/EditAndSendInviteResponseDialog.vue',
    '../dialogs/SendInviteResponseDialog.vue',
    '../dialogs/SendInviteResponseConfirmDialog.vue'
];

function readNotificationSource(relativePath) {
    return readFileSync(
        resolve(
            process.cwd(),
            'src/views/Notifications/__tests__',
            relativePath
        ),
        'utf8'
    );
}

function mountNotification() {
    return mount(Notification, {
        global: {
            stubs: {
                SendInviteResponseDialog: { template: '<div />' },
                SendInviteRequestResponseDialog: { template: '<div />' },
                TooltipWrapper: { template: '<div><slot /></div>' }
            }
        }
    });
}

describe('Notification.vue', () => {
    beforeEach(() => {
        mocks.notificationTable = ref({
            data: [],
            filters: [
                { prop: 'type', value: [] },
                { prop: ['senderUsername', 'message'], value: '' }
            ]
        });
        mocks.isNotificationsLoading = ref(false);
        mocks.unseenNotifications = ref([]);
        mocks.pagination = ref({ pageIndex: 2, pageSize: 10 });
        mocks.columnHandlers = null;
        mocks.refreshNotifications.mockReset();
        mocks.refreshInviteMessageTableData.mockReset();
        mocks.clearInviteImageUpload.mockReset();
        mocks.showFullscreenImageDialog.mockReset();
        mocks.configSetString.mockReset();
        mocks.modalConfirm.mockReset().mockResolvedValue({ ok: true });
        mocks.handleNotificationAccept.mockReset();
        mocks.handleNotificationHide.mockReset();
        mocks.handleNotificationV2Hide.mockReset();
        mocks.handleNotificationSee.mockReset();
        mocks.handleNotificationV2Update.mockReset();
        mocks.deleteNotificationLog.mockReset();
        mocks.friendRequestApi.deleteHiddenFriendRequest
            .mockReset()
            .mockResolvedValue({});
        mocks.notificationRequestApi.acceptFriendRequestNotification
            .mockReset()
            .mockResolvedValue({});
        mocks.notificationRequestApi.hideNotification
            .mockReset()
            .mockResolvedValue({});
        mocks.notificationRequestApi.sendInvite
            .mockReset()
            .mockResolvedValue({});
        mocks.notificationRequestApi.sendNotificationResponse
            .mockReset()
            .mockResolvedValue({});
        mocks.notificationRequestApi.seeNotification
            .mockReset()
            .mockResolvedValue({});
        mocks.notificationRequestApi.seeNotificationV2
            .mockReset()
            .mockResolvedValue({ json: {} });
        mocks.toast.success.mockReset();
        mocks.toast.warning.mockReset();
        mocks.toast.error.mockReset();

        mocks.translate.mockImplementation((key, params) => {
            const translations = {
                'view.notification.visible': 'Visible',
                'view.notification.unread': 'Unread',
                'view.notification.bulk.selected': `${params?.count} selected`,
                'view.notification.bulk.accept': 'Accept',
                'view.notification.bulk.decline': 'Decline',
                'view.notification.bulk.mark_as_read': 'Mark as read',
                'view.notification.bulk.delete': 'Delete',
                'view.notification.bulk.clear': 'Clear selection'
            };
            return translations[key] ?? key;
        });
    });

    test('renders an action-oriented activity frame with visible and unread context', () => {
        mocks.notificationTable.value.data = [
            { id: 'n1', type: 'invite', seen: false },
            { id: 'n2', type: 'message', seen: true }
        ];
        mocks.unseenNotifications.value = ['n1'];

        const wrapper = mountNotification();

        const header = wrapper.get('.notification__page-header');
        expect(header.classes()).toContain('bv-surface');
        expect(header.get('h1').text()).toBe('nav_tooltip.notification');
        expect(wrapper.get('.notification__visible-label').text()).toBe(
            'Visible'
        );
        expect(wrapper.get('.notification__unread-label').text()).toBe(
            'Unread'
        );
        expect(wrapper.get('.notification__visible-value').text()).toBe('2');
        expect(wrapper.get('.notification__unread-value').text()).toBe('1');
        expect(mocks.translate).toHaveBeenCalledWith(
            'view.notification.visible'
        );
        expect(mocks.translate).toHaveBeenCalledWith(
            'view.notification.unread'
        );
        expect(
            wrapper.get('.notification__control-surface').classes()
        ).toContain('bv-surface-raised');
        expect(wrapper.get('.notification__table-surface').classes()).toContain(
            'bv-surface'
        );
        expect(wrapper.get('.notification__empty-state').classes()).toContain(
            'bv-empty-state'
        );
    });

    test('does not render the notification empty state while notifications load', () => {
        mocks.isNotificationsLoading.value = true;

        const wrapper = mountNotification();

        expect(
            wrapper.find('[data-testid="notification-empty"]').exists()
        ).toBe(false);
    });

    test('keeps notification filtering, persistence, refresh, and invite action wiring intact', async () => {
        mocks.notificationTable.value.data = [
            { id: 'n1', type: 'invite', senderUsername: 'Alice', seen: false },
            { id: 'n2', type: 'message', senderUsername: 'Bob', seen: true }
        ];
        mocks.notificationTable.value.filters = [
            { prop: 'type', value: ['invite'] },
            { prop: ['senderUsername', 'message'], value: 'ali' }
        ];

        const wrapper = mountNotification();

        expect(wrapper.get('[data-testid="total-items"]').text()).toBe('1');
        await wrapper.get('[data-testid="set-type-filter"]').trigger('click');
        await wrapper
            .get('[aria-label="view.notification.refresh_tooltip"]')
            .trigger('click');

        expect(mocks.notificationTable.value.filters[0].value).toEqual([
            'invite'
        ]);
        expect(mocks.configSetString).toHaveBeenCalledWith(
            'VRCX_notificationTableFilters',
            JSON.stringify(['invite'])
        );
        expect(mocks.refreshNotifications).toHaveBeenCalledTimes(1);
        expect(mocks.columnHandlers.showSendInviteResponseDialog).toBeTypeOf(
            'function'
        );
        expect(
            mocks.columnHandlers.showSendInviteRequestResponseDialog
        ).toBeTypeOf('function');
    });

    test('refreshes invite message tables and clears the upload for both response flows', () => {
        const wrapper = mountNotification();
        const invite = { id: 'invite-1' };

        mocks.columnHandlers.showSendInviteResponseDialog(invite);
        mocks.columnHandlers.showSendInviteRequestResponseDialog(invite);

        expect(mocks.refreshInviteMessageTableData).toHaveBeenNthCalledWith(
            1,
            'response'
        );
        expect(mocks.refreshInviteMessageTableData).toHaveBeenNthCalledWith(
            2,
            'requestResponse'
        );
        expect(mocks.clearInviteImageUpload).toHaveBeenCalledTimes(2);
        expect(wrapper.vm).toBeTruthy();
    });

    test('provides bulk selection handlers to createColumns', () => {
        mountNotification();

        expect(mocks.columnHandlers.selectedNotificationIds).toBeDefined();
        expect(
            mocks.columnHandlers.onToggleNotificationSelection
        ).toBeTypeOf('function');
        expect(mocks.columnHandlers.isAllSelected).toBeDefined();
        expect(mocks.columnHandlers.isSomeSelected).toBeDefined();
        expect(mocks.columnHandlers.onToggleSelectAll).toBeTypeOf('function');
    });

    test('manages selection state and Select All correctly', async () => {
        mocks.notificationTable.value.data = [
            { id: 'n1', type: 'friendRequest', senderUserId: 'u1' },
            { id: 'n2', type: 'invite', senderUserId: 'u2' }
        ];

        const wrapper = mountNotification();
        expect(wrapper.find('.notification__bulk-surface').exists()).toBe(false);

        mocks.columnHandlers.onToggleNotificationSelection('n1');
        await nextTick();

        expect(
            mocks.columnHandlers.selectedNotificationIds.value.has('n1')
        ).toBe(true);
        expect(mocks.columnHandlers.isAllSelected.value).toBe(false);
        expect(mocks.columnHandlers.isSomeSelected.value).toBe(true);
        expect(wrapper.find('.notification__bulk-surface').exists()).toBe(true);
        expect(wrapper.find('.notification__bulk-count').text()).toContain(
            '1 selected'
        );

        mocks.columnHandlers.onToggleSelectAll();
        await nextTick();

        expect(mocks.columnHandlers.isAllSelected.value).toBe(true);
        expect(mocks.columnHandlers.selectedNotificationIds.value.size).toBe(2);
        expect(wrapper.find('.notification__bulk-count').text()).toContain(
            '2 selected'
        );

        mocks.columnHandlers.onToggleSelectAll();
        await nextTick();

        expect(mocks.columnHandlers.selectedNotificationIds.value.size).toBe(0);
        expect(wrapper.find('.notification__bulk-surface').exists()).toBe(false);
    });

    test('computes applicable action counts and handles bulk accept', async () => {
        mocks.notificationTable.value.data = [
            { id: 'fr-1', type: 'friendRequest', senderUserId: 'u1' },
            { id: 'req-1', type: 'requestInvite', senderUserId: 'u2' },
            {
                id: 'grp-1',
                type: 'group.invite',
                senderUserId: 'u3',
                responses: [{ type: 'accept', data: 'join' }]
            },
            { id: 'msg-1', type: 'message', senderUserId: 'u4' }
        ];

        const wrapper = mountNotification();

        mocks.columnHandlers.onToggleSelectAll();
        await nextTick();

        const buttons = wrapper.findAll('.notification__bulk-actions button');
        const acceptBtn = buttons[0];
        expect(acceptBtn.text()).toContain('Accept (3)');
        // Trigger Accept
        await acceptBtn.trigger('click');
        expect(mocks.modalConfirm).toHaveBeenCalled();

        await flushPromises();
        expect(
            mocks.notificationRequestApi.acceptFriendRequestNotification
        ).toHaveBeenCalledWith({ notificationId: 'fr-1' });
        expect(mocks.notificationRequestApi.sendInvite).toHaveBeenCalled();
        expect(
            mocks.notificationRequestApi.sendNotificationResponse
        ).toHaveBeenCalledWith({
            notificationId: 'grp-1',
            responseType: 'accept',
            responseData: 'join'
        });
        expect(mocks.toast.success).toHaveBeenCalled();
    });

    test('computes declinable counts and handles bulk decline', async () => {
        mocks.notificationTable.value.data = [
            { id: 'inv-1', type: 'invite', senderUserId: 'u1' },
            { id: 'ign-1', type: 'ignoredFriendRequest', senderUserId: 'u2' },
            {
                id: 'grp-1',
                type: 'group.invite',
                senderUserId: 'u3',
                responses: [{ type: 'decline', data: 'no' }]
            },
            { id: 'msg-1', type: 'message', senderUserId: 'u4' }
        ];

        const wrapper = mountNotification();
        mocks.columnHandlers.onToggleSelectAll();
        await nextTick();

        const buttons = wrapper.findAll('.notification__bulk-actions button');
        const declineBtn = buttons[1];
        expect(declineBtn.text()).toContain('Decline (3)');

        await declineBtn.trigger('click');
        await flushPromises();

        expect(
            mocks.notificationRequestApi.hideNotification
        ).toHaveBeenCalledWith({ notificationId: 'inv-1' });
        expect(
            mocks.friendRequestApi.deleteHiddenFriendRequest
        ).toHaveBeenCalledWith({ notificationId: 'ign-1' }, 'u2');
        expect(
            mocks.notificationRequestApi.sendNotificationResponse
        ).toHaveBeenCalledWith({
            notificationId: 'grp-1',
            responseType: 'decline',
            responseData: 'no'
        });
        expect(mocks.toast.success).toHaveBeenCalled();
    });

    test('handles bulk mark as read for unread items', async () => {
        mocks.notificationTable.value.data = [
            { id: 'n1', type: 'message', seen: false, version: 1 },
            { id: 'n2', type: 'boop', seen: false, version: 2 },
            { id: 'n3', type: 'message', seen: true }
        ];
        mocks.unseenNotifications.value = ['n1', 'n2'];

        const wrapper = mountNotification();
        mocks.columnHandlers.onToggleSelectAll();
        await nextTick();

        const buttons = wrapper.findAll('.notification__bulk-actions button');
        const markReadBtn = buttons[2];
        expect(markReadBtn.text()).toContain('Mark as read (2)');

        await markReadBtn.trigger('click');
        await flushPromises();

        expect(mocks.notificationRequestApi.seeNotification).toHaveBeenCalledWith(
            { notificationId: 'n1' }
        );
        expect(
            mocks.notificationRequestApi.seeNotificationV2
        ).toHaveBeenCalledWith({ notificationId: 'n2' });
        expect(mocks.toast.success).toHaveBeenCalled();
    });

    test('handles bulk delete for eligible notification logs', async () => {
        mocks.notificationTable.value.data = [
            { id: 'n1', type: 'message' },
            { id: 'n2', type: 'friendRequest' }
        ];

        const wrapper = mountNotification();
        mocks.columnHandlers.onToggleSelectAll();
        await nextTick();

        const buttons = wrapper.findAll('.notification__bulk-actions button');
        const deleteBtn = buttons[3];
        expect(deleteBtn.text()).toContain('Delete (1)');

        await deleteBtn.trigger('click');
        await flushPromises();

        expect(mocks.deleteNotificationLog).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'n1' })
        );
        expect(mocks.toast.success).toHaveBeenCalled();
    });

    test('handles partial failure and reports warning toast', async () => {
        mocks.notificationTable.value.data = [
            { id: 'fr-1', type: 'friendRequest', senderUserId: 'u1' },
            { id: 'fr-2', type: 'friendRequest', senderUserId: 'u2' }
        ];

        mocks.notificationRequestApi.acceptFriendRequestNotification
            .mockResolvedValueOnce({})
            .mockRejectedValueOnce(new Error('Network error'));

        const wrapper = mountNotification();
        mocks.columnHandlers.onToggleSelectAll();
        await nextTick();

        const buttons = wrapper.findAll('.notification__bulk-actions button');
        await buttons[0].trigger('click');
        await flushPromises();

        expect(mocks.toast.warning).toHaveBeenCalled();
        expect(
            mocks.columnHandlers.selectedNotificationIds.value.has('fr-2')
        ).toBe(true);
        expect(
            mocks.columnHandlers.selectedNotificationIds.value.has('fr-1')
        ).toBe(false);
    });
});

describe('notification invite dialog surfaces', () => {
    test.each(dialogFiles)(
        'keeps semantic shell hooks in %s',
        (relativePath) => {
            const source = readFileSync(
                resolve(
                    process.cwd(),
                    'src/views/Notifications/__tests__',
                    relativePath
                ),
                'utf8'
            );

            expect(source).toContain('bv-dialog-shell');
            expect(source).toContain('bv-focus-ring');
        }
    );

    test('marks the confirmation surface as a danger zone', () => {
        const source = readNotificationSource(
            '../dialogs/SendInviteResponseConfirmDialog.vue'
        );

        expect(source).toContain('bv-danger-zone');
    });

    test('keeps notification row expiration, media preview, and destructive action contracts', () => {
        const source = readNotificationSource('../columns.jsx');

        expect(source).toContain('isNotificationExpired');
        expect(source).toContain('showFullscreenImageDialog');
        expect(source).toContain('getSmallThumbnailUrl');
        expect(source).toContain('hideNotification');
        expect(source).toContain('deleteNotificationLog');
    });

    test('keeps invite refresh, edit, send, image, and emit contracts', () => {
        const sources = dialogFiles.map(readNotificationSource).join('\n');

        expect(sources).toContain("refreshInviteMessageTableData('response')");
        expect(sources).toContain(
            "refreshInviteMessageTableData('requestResponse')"
        );
        expect(sources).toContain('editInviteMessage');
        expect(sources).toContain('sendInviteResponsePhoto');
        expect(sources).toContain('sendInviteResponse');
        expect(sources).toContain('inviteImageUpload');
        expect(sources).toContain('closeInviteDialog');
        expect(sources).toContain('closeResponseConfirmDialog');
    });
});
