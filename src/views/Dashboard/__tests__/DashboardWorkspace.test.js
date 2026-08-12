import { beforeEach, describe, expect, test, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';

const mocks = vi.hoisted(() => ({
    dashboard: null,
    dashboards: [],
    editingDashboardId: 'dash-1',
    updateDashboard: vi.fn(),
    deleteDashboard: vi.fn(),
    clearEditingDashboardId: vi.fn(),
    confirm: vi.fn(),
    replace: vi.fn()
}));

mocks.dashboard = ref(null);

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key) => key })
}));

vi.mock('vue-router', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, useRouter: () => ({ replace: mocks.replace }) };
});

vi.mock('vue-sonner', () => ({ toast: vi.fn() }));

vi.mock('@/stores', () => ({
    useDashboardStore: () => ({
        get dashboards() {
            return mocks.dashboards;
        },
        get editingDashboardId() {
            return mocks.editingDashboardId;
        },
        getDashboard: () => mocks.dashboard.value,
        updateDashboard: mocks.updateDashboard,
        deleteDashboard: mocks.deleteDashboard,
        clearEditingDashboardId: mocks.clearEditingDashboardId
    }),
    useModalStore: () => ({ confirm: mocks.confirm })
}));

vi.mock('../components/panelRegistry', () => ({
    panelComponentMap: {
        feed: { template: '<div data-testid="embedded-feed" />' }
    }
}));

import Dashboard from '../Dashboard.vue';
import DashboardPanel from '../components/DashboardPanel.vue';
import DashboardRow from '../components/DashboardRow.vue';
import PanelSelector from '../components/PanelSelector.vue';

const ButtonStub = {
    props: ['ariaLabel'],
    emits: ['click'],
    template:
        '<button :aria-label="ariaLabel" v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>'
};

const InputStub = {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
        '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
};

const dashboardStubs = {
    Button: ButtonStub,
    DashboardEditToolbar: {
        props: ['name'],
        emits: ['save', 'cancel', 'delete', 'update:name'],
        template: `
            <section>
                <input data-testid="dashboard-name" :value="name" @input="$emit('update:name', $event.target.value)" />
                <button data-testid="dashboard-save" @click="$emit('save')">save</button>
                <button data-testid="dashboard-cancel" @click="$emit('cancel')">cancel</button>
                <button data-testid="dashboard-delete" @click="$emit('delete')">delete</button>
            </section>`
    },
    DashboardRow: {
        props: ['row'],
        template:
            '<div data-testid="dashboard-row-stub">{{ row.direction }}:{{ row.panels.length }}</div>'
    },
    ResizablePanelGroup: { template: '<div><slot /></div>' },
    ResizablePanel: { template: '<div><slot /></div>' },
    ResizableHandle: { template: '<div />' }
};

async function mountDashboard() {
    const wrapper = mount(Dashboard, {
        props: { id: 'dash-1' },
        global: { stubs: dashboardStubs }
    });
    await nextTick();
    return wrapper;
}

describe('Dashboard workspace behavior', () => {
    beforeEach(() => {
        mocks.dashboard.value = {
            id: 'dash-1',
            name: 'Original',
            rows: [{ panels: ['feed'], direction: 'horizontal' }]
        };
        mocks.dashboards = [mocks.dashboard.value];
        mocks.editingDashboardId = 'dash-1';
        mocks.updateDashboard.mockReset().mockResolvedValue(undefined);
        mocks.deleteDashboard.mockReset().mockResolvedValue(undefined);
        mocks.clearEditingDashboardId.mockReset();
        mocks.confirm.mockReset().mockResolvedValue({ ok: true });
        mocks.replace.mockReset();
    });

    test('saves the edited name and cloned builder rows, while cancel leaves the persisted dashboard unchanged', async () => {
        const wrapper = await mountDashboard();

        await wrapper.get('[data-testid="dashboard-name"]').setValue('Focus');
        await wrapper.get('[data-testid="dashboard-save"]').trigger('click');

        expect(mocks.updateDashboard).toHaveBeenCalledWith('dash-1', {
            name: 'Focus',
            rows: [{ panels: ['feed'], direction: 'horizontal' }]
        });

        mocks.updateDashboard.mockClear();
        mocks.editingDashboardId = 'dash-1';
        const cancelWrapper = await mountDashboard();
        await cancelWrapper
            .get('[data-testid="dashboard-cancel"]')
            .trigger('click');

        expect(mocks.updateDashboard).not.toHaveBeenCalled();
        expect(mocks.dashboard.value.name).toBe('Original');
    });

    test('uses a native expanded add-row trigger and adds the selected vertical split to the edit draft', async () => {
        const wrapper = await mountDashboard();

        const trigger = wrapper.get(
            'button[data-testid="dashboard-builder-add-row"]'
        );
        expect(trigger.attributes('aria-expanded')).toBe('false');

        await trigger.trigger('click');
        expect(trigger.attributes('aria-expanded')).toBe('true');
        await wrapper.get('button[data-layout="vertical"]').trigger('click');
        await wrapper.get('[data-testid="dashboard-save"]').trigger('click');

        expect(mocks.updateDashboard).toHaveBeenLastCalledWith('dash-1', {
            name: 'Original',
            rows: [
                { panels: ['feed'], direction: 'horizontal' },
                { panels: [null, null], direction: 'vertical' }
            ]
        });
    });

    test('confirms deletion before removing the dashboard and routing away', async () => {
        const wrapper = await mountDashboard();

        await wrapper.get('[data-testid="dashboard-delete"]').trigger('click');
        await flushPromises();

        expect(mocks.deleteDashboard).toHaveBeenCalledWith('dash-1');
        expect(mocks.replace).toHaveBeenCalledWith({ name: 'feed' });
    });

    test('selects widget configuration and exposes the selected row direction with visible layout chrome', async () => {
        const selector = mount(PanelSelector, {
            props: { open: true },
            global: {
                stubs: {
                    Button: ButtonStub,
                    Dialog: { template: '<div><slot /></div>' },
                    DialogContent: { template: '<div><slot /></div>' },
                    DialogHeader: { template: '<div><slot /></div>' },
                    DialogTitle: { template: '<h2><slot /></h2>' },
                    DialogFooter: { template: '<div><slot /></div>' }
                }
            }
        });

        await selector.get('[data-panel-key="widget:feed"]').trigger('click');
        expect(selector.emitted('select')[0]).toEqual([
            { key: 'widget:feed', config: { filters: [] } }
        ]);
        expect(
            selector.get('[data-panel-kind="widget:feed"]').text()
        ).toContain('dashboard.selector.widgets');

        const row = mount(DashboardRow, {
            props: {
                row: { panels: ['feed', 'game-log'], direction: 'vertical' },
                rowIndex: 0,
                dashboardId: 'dash-1',
                isEditing: true
            },
            global: {
                stubs: {
                    DashboardPanel: { template: '<div />' },
                    ResizablePanelGroup: { template: '<div><slot /></div>' },
                    ResizablePanel: { template: '<div><slot /></div>' },
                    ResizableHandle: { template: '<div />' }
                }
            }
        });

        expect(
            row
                .get('[data-testid="dashboard-row"]')
                .attributes('data-direction')
        ).toBe('vertical');
        expect(
            row.get('[data-testid="dashboard-row-layout"]').text()
        ).toContain('dashboard.actions.add_vertical_row');
    });

    test('gives the panel remove control a localized accessible name and renders compact panel metadata', async () => {
        const editor = mount(DashboardPanel, {
            props: { panelData: 'feed', isEditing: true, showRemove: true },
            global: {
                stubs: {
                    Button: ButtonStub,
                    PanelSelector: { template: '<div />' }
                }
            }
        });
        await editor
            .get('[aria-label="common.actions.remove"]')
            .trigger('click');
        expect(editor.emitted('remove')).toHaveLength(1);

        const rendered = mount(DashboardPanel, {
            props: { panelData: 'feed' },
            global: {
                stubs: {
                    Button: ButtonStub,
                    PanelSelector: { template: '<div />' }
                }
            }
        });
        expect(rendered.get('.dashboard-panel__header').text()).toContain(
            'nav_tooltip.feed'
        );
        expect(rendered.get('.dashboard-panel__header').text()).toContain(
            'dashboard.selector.pages'
        );
    });
});
