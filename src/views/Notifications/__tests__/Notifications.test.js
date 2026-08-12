import { beforeEach, describe, expect, test, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
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
    translate: vi.fn()
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
        deleteNotificationLog: vi.fn(),
        deleteNotificationLogPrompt: vi.fn(),
        openNotificationLink: vi.fn()
    }),
    useVrcxStore: () => ({ maxTableSize: 100 })
}));

vi.mock('../../../services/config', () => ({
    default: {
        setString: (...args) => mocks.configSetString(...args)
    }
}));

vi.mock('../../../shared/utils', () => ({
    convertFileUrlToImageUrl: (url) => `image:${url}`
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
        emits: ['click'],
        template:
            '<button :class="$attrs.class" :aria-label="$attrs.ariaLabel" @click="$emit(\'click\')"><slot /></button>'
    }
}));

vi.mock('@/components/ui/spinner', () => ({
    Spinner: { template: '<span />' }
}));
vi.mock('lucide-vue-next', () => ({ RefreshCw: { template: '<span />' } }));
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
        mocks.translate.mockImplementation((key) => {
            const translations = {
                'view.notification.visible': 'Visible',
                'view.notification.unread': 'Unread'
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
