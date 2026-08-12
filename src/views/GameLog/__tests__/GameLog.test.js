import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';

const mocks = vi.hoisted(() => ({
    lookup: vi.fn(),
    makeRef: (value) => ({ value, __v_isRef: true }),
    setSessionsViewMode: vi.fn(),
    table: { value: { vip: false, filter: [], search: '' } },
    tableData: { value: [], __v_isRef: true },
    sessionsViewMode: { value: 'table', __v_isRef: true },
    sessionsSegments: { value: [], __v_isRef: true },
    filteredRows: []
}));

vi.mock('pinia', async (i) => ({ ...(await i()), storeToRefs: (s) => s }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k) => k }) }));
vi.mock('../../../stores', () => ({
    useGameLogStore: () => ({
        gameLogTableLookup: (...a) => mocks.lookup(...a),
        setSessionsViewMode: (...a) => mocks.setSessionsViewMode(...a),
        gameLogTable: mocks.table,
        gameLogTableData: mocks.tableData,
        sessionsViewMode: mocks.sessionsViewMode,
        sessionsSegments: mocks.sessionsSegments
    }),
    useAppearanceSettingsStore: () => ({
        tablePageSizes: [20, 50],
        tablePageSize: 20
    }),
    useVrcxStore: () => ({ maxTableSize: 500 }),
    useModalStore: () => ({ confirm: vi.fn() })
}));
vi.mock('../../../components/ui/data-table', () => ({
    DataTableLayout: { template: '<div><slot name="toolbar" /></div>' }
}));
vi.mock('../../../components/ui/tooltip', () => ({
    TooltipWrapper: { template: '<div><slot /></div>' }
}));
vi.mock('../../../components/ui/input-group', () => ({
    InputGroupField: { template: '<input />' }
}));
vi.mock('@/components/ui/select', () => ({
    Select: {
        emits: ['update:modelValue'],
        template:
            '<button data-testid="sel" @click="$emit(\'update:modelValue\', [\'Event\'])"><slot /></button>'
    },
    SelectTrigger: { template: '<div><slot /></div>' },
    SelectValue: { template: '<div><slot /></div>' },
    SelectContent: { template: '<div><slot /></div>' },
    SelectGroup: { template: '<div><slot /></div>' },
    SelectItem: { template: '<div><slot /></div>' }
}));
vi.mock('@/components/ui/toggle', () => ({
    Toggle: { template: '<button><slot /></button>' }
}));
vi.mock('@/components/ui/toggle-group', () => ({
    ToggleGroup: {
        emits: ['update:model-value'],
        template: '<div><slot /></div>'
    },
    ToggleGroupItem: {
        props: ['value'],
        template: '<button :data-value="value"><slot /></button>'
    }
}));
vi.mock('lucide-vue-next', () => ({
    Star: { template: '<i />' },
    Logs: { template: '<i />' },
    Table2: { template: '<i />' }
}));
vi.mock('../components/GameLogSessions.vue', () => ({
    default: { template: '<div />' }
}));
vi.mock('../../../services/database', () => ({
    database: { deleteGameLogEntry: vi.fn() }
}));
vi.mock('../../../shared/utils', () => ({ removeFromArray: vi.fn() }));
vi.mock('../../../lib/table/useVrcxVueTable', () => ({
    useVrcxVueTable: () => ({
        table: { getFilteredRowModel: () => ({ rows: mocks.filteredRows }) },
        pagination: ref({ pageIndex: 0, pageSize: 20 })
    })
}));
vi.mock('../columns.jsx', () => ({ createColumns: () => [] }));

import GameLog from '../GameLog.vue';

describe('GameLog.vue', () => {
    beforeEach(() => {
        mocks.lookup.mockReset();
        mocks.setSessionsViewMode.mockReset();
        mocks.table.value = { vip: false, filter: [], search: '' };
        mocks.tableData.value = [];
        mocks.sessionsViewMode.value = 'table';
        mocks.sessionsSegments.value = [];
        mocks.filteredRows = [];
    });

    it('updates filter and triggers lookup when filter changes', async () => {
        const wrapper = mount(GameLog);
        await wrapper.get('[data-testid="sel"]').trigger('click');

        expect(mocks.lookup).toHaveBeenCalled();
        expect(mocks.table.value.filter).toEqual(['Event']);
    });

    it('renders a surfaced log hierarchy with live table context', () => {
        mocks.filteredRows = [{ rowId: 1 }, { rowId: 2 }];
        const wrapper = mount(GameLog);

        const header = wrapper.get('.game-log__page-header');
        expect(header.classes()).toContain('bv-surface');
        expect(header.get('h1').text()).toBe('nav_tooltip.game_log');
        expect(header.get('.game-log__record-count').text()).toBe('2');
        expect(wrapper.get('.game-log__control-surface').classes()).toContain(
            'bv-surface-raised'
        );
        expect(wrapper.get('.game-log__table-surface').classes()).toContain(
            'bv-surface'
        );
    });

    it('uses the active sessions count instead of table rows in sessions mode', () => {
        mocks.sessionsViewMode.value = 'sessions';
        mocks.sessionsSegments.value = [{}, {}, {}];
        mocks.filteredRows = [{ rowId: 1 }];

        const wrapper = mount(GameLog);

        expect(wrapper.get('.game-log__record-count').text()).toBe('3');
    });

    it('keeps table and sessions mode changes routed through the store', () => {
        const wrapper = mount(GameLog);

        wrapper.vm.handleViewModeChange('sessions');
        wrapper.vm.handleViewModeChange('table');
        wrapper.vm.handleViewModeChange(undefined);

        expect(mocks.setSessionsViewMode.mock.calls).toEqual([
            ['sessions'],
            ['table']
        ]);
    });
});
