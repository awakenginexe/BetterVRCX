import { beforeEach, describe, expect, test, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
    makeRef: (value) => ({ value, __v_isRef: true }),
    hideUnfriends: null,
    friendLogTable: null,
    pagination: null,
    configSetString: vi.fn(),
    modalConfirm: vi.fn(),
    deleteFriendLogHistory: vi.fn(),
    columnHandlers: null,
    removeFromArray: vi.fn((arr, row) => {
        const idx = arr.indexOf(row);
        if (idx !== -1) {
            arr.splice(idx, 1);
        }
    })
}));

mocks.hideUnfriends = mocks.makeRef(false);
mocks.friendLogTable = mocks.makeRef({
    loading: false,
    data: [],
    filters: [{ value: [] }, { value: '' }, { value: false }]
});
mocks.pagination = mocks.makeRef({
    pageIndex: 3,
    pageSize: 10
});

vi.mock('pinia', () => ({
    storeToRefs: (store) => store
}));

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key) => key,
        locale: require('vue').ref('en')
    })
}));

vi.mock('../../../stores', () => ({
    useAppearanceSettingsStore: () => ({
        tablePageSizes: [10, 25, 50],
        tablePageSize: 25,
        hideUnfriends: mocks.hideUnfriends
    }),
    useFriendStore: () => ({
        friendLogTable: mocks.friendLogTable
    }),
    useModalStore: () => ({
        confirm: (...args) => mocks.modalConfirm(...args)
    }),
    useVrcxStore: () => ({
        maxTableSize: 100
    })
}));

vi.mock('../../../lib/table/useVrcxVueTable', () => ({
    useVrcxVueTable: (options) => ({
        table: {
            getFilteredRowModel: () => ({ rows: options.data })
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

vi.mock('../../../components/ui/data-table', () => ({
    DataTableLayout: {
        props: ['totalItems', 'onPageSizeChange'],
        template:
            '<div data-testid="friend-log-layout">' +
            '<slot name="toolbar" />' +
            '<button data-testid="page-size-50" @click="onPageSizeChange?.(50)">page-size</button>' +
            '<span data-testid="total-items">{{ totalItems }}</span>' +
            '</div>'
    }
}));

vi.mock('../../../components/ui/select', () => ({
    Select: {
        emits: ['update:modelValue'],
        template:
            '<div><button data-testid="set-type-filter" @click="$emit(\'update:modelValue\', [\'Friend\'])">set-filter</button><slot /></div>'
    },
    SelectContent: { template: '<div><slot /></div>' },
    SelectGroup: { template: '<div><slot /></div>' },
    SelectItem: { template: '<div><slot /></div>' },
    SelectTrigger: { template: '<div><slot /></div>' },
    SelectValue: { template: '<div><slot /></div>' }
}));

vi.mock('../../../components/ui/input-group', () => ({
    InputGroupField: {
        props: ['modelValue'],
        emits: ['update:modelValue'],
        template:
            '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
    }
}));

vi.mock('../../../services/config', () => ({
    default: {
        setString: (...args) => mocks.configSetString(...args)
    }
}));

vi.mock('../../../services/database', () => ({
    database: {
        deleteFriendLogHistory: (...args) =>
            mocks.deleteFriendLogHistory(...args)
    }
}));

vi.mock('../../../shared/utils', () => ({
    removeFromArray: (...args) => mocks.removeFromArray(...args)
}));

import FriendLog from '../FriendLog.vue';

describe('FriendLog.vue', () => {
    beforeEach(() => {
        mocks.hideUnfriends.value = false;
        mocks.friendLogTable.value = {
            loading: false,
            data: [],
            filters: [{ value: [] }, { value: '' }, { value: false }]
        };
        mocks.pagination.value = {
            pageIndex: 3,
            pageSize: 10
        };
        mocks.configSetString.mockReset();
        mocks.modalConfirm.mockReset();
        mocks.modalConfirm.mockResolvedValue({ ok: true });
        mocks.deleteFriendLogHistory.mockReset();
        mocks.removeFromArray.mockClear();
        mocks.columnHandlers = null;
    });

    test('syncs hideUnfriends setting to table filter via watcher', () => {
        mocks.hideUnfriends.value = true;
        mount(FriendLog);

        expect(mocks.friendLogTable.value.filters[2].value).toBe(true);
    });

    test('filters and sorts friend log data', () => {
        mocks.friendLogTable.value.data = [
            {
                rowId: 1,
                type: 'Friend',
                displayName: 'Alice',
                created_at: '2026-03-08T00:00:00.000Z'
            },
            {
                rowId: 2,
                type: 'Friend',
                displayName: 'Bob',
                created_at: '2026-03-09T00:00:00.000Z'
            },
            {
                rowId: 3,
                type: 'Unfriend',
                displayName: 'Alice2',
                created_at: '2026-03-10T00:00:00.000Z'
            }
        ];
        mocks.friendLogTable.value.filters = [
            { value: ['Friend'] },
            { value: 'ali' },
            { value: true }
        ];
        const wrapper = mount(FriendLog);

        expect(wrapper.vm.friendLogDisplayData).toEqual([
            {
                rowId: 1,
                type: 'Friend',
                displayName: 'Alice',
                created_at: '2026-03-08T00:00:00.000Z'
            }
        ]);
    });

    test('updates type filter and persists filter selection', async () => {
        const wrapper = mount(FriendLog);

        await wrapper.get('[data-testid="set-type-filter"]').trigger('click');

        expect(mocks.friendLogTable.value.filters[0].value).toEqual(['Friend']);
        expect(mocks.configSetString).toHaveBeenCalledWith(
            'VRCX_friendLogTableFilters',
            JSON.stringify(['Friend'])
        );
    });

    test('deletes friend log row and writes to database', () => {
        const row = { rowId: 55 };
        mocks.friendLogTable.value.data = [row];
        const wrapper = mount(FriendLog);

        wrapper.vm.deleteFriendLog(row);

        expect(mocks.removeFromArray).toHaveBeenCalledWith(
            mocks.friendLogTable.value.data,
            row
        );
        expect(mocks.deleteFriendLogHistory).toHaveBeenCalledWith(row);
    });

    test('confirms before deleting a friend log row', async () => {
        const row = { rowId: 55 };
        mocks.friendLogTable.value.data = [row];
        mount(FriendLog);

        await mocks.columnHandlers.onDeletePrompt(row);
        await Promise.resolve();

        expect(mocks.modalConfirm).toHaveBeenCalledTimes(1);
        expect(mocks.deleteFriendLogHistory).toHaveBeenCalledWith(row);
    });

    test('resets page index when page size changes', async () => {
        const wrapper = mount(FriendLog);

        await wrapper.get('[data-testid="page-size-50"]').trigger('click');

        expect(mocks.pagination.value).toEqual({
            pageIndex: 0,
            pageSize: 50
        });
    });

    test('renders a surfaced history hierarchy with filtered row context', () => {
        mocks.friendLogTable.value.data = [
            { rowId: 1, type: 'Friend', displayName: 'Alice' },
            { rowId: 2, type: 'Unfriend', displayName: 'Bob' }
        ];
        mocks.friendLogTable.value.filters[0].value = ['Friend'];
        const wrapper = mount(FriendLog);

        const header = wrapper.get('.friend-log__page-header');
        expect(header.classes()).toContain('bv-surface');
        expect(header.get('h1').text()).toBe('nav_tooltip.friend_log');
        expect(header.get('.friend-log__record-count').text()).toBe('1');
        expect(wrapper.get('.friend-log__control-surface').classes()).toContain(
            'bv-surface-raised'
        );
        expect(wrapper.get('.friend-log__table-surface').classes()).toContain(
            'bv-surface'
        );
    });
});
