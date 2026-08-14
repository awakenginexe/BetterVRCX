import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key) => key
    })
}));

vi.mock('lucide-vue-next', () => ({
    Heart: { template: '<i />' },
    Plus: { template: '<i />' }
}));

vi.mock('@/components/ui/tooltip', () => ({
    TooltipWrapper: { template: '<span><slot /></span>' }
}));

vi.mock('@/components/ui/sidebar', () => ({
    SidebarFooter: { template: '<div><slot /></div>' },
    SidebarMenu: { template: '<div><slot /></div>' },
    SidebarMenuItem: { template: '<div><slot /></div>' },
    SidebarMenuButton: {
        emits: ['click'],
        template:
            '<button data-testid="sidebar-menu-btn" @click="$emit(\'click\')"><slot /></button>'
    }
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
    DropdownMenu: { template: '<div><slot /></div>' },
    DropdownMenuTrigger: { template: '<div><slot /></div>' },
    DropdownMenuContent: { template: '<div><slot /></div>' },
    DropdownMenuItem: {
        emits: ['click', 'select'],
        template:
            '<button data-testid="dd-item" @click="$emit(\'click\')" @mousedown="$emit(\'select\')"><slot /></button>'
    },
    DropdownMenuLabel: { template: '<div><slot /></div>' },
    DropdownMenuSeparator: { template: '<div />' },
    DropdownMenuSub: { template: '<div><slot /></div>' },
    DropdownMenuSubTrigger: { template: '<div><slot /></div>' },
    DropdownMenuSubContent: { template: '<div><slot /></div>' },
    DropdownMenuCheckboxItem: {
        emits: ['select'],
        template:
            '<button data-testid="dd-check" @click="$emit(\'select\')"><slot /></button>'
    }
}));

import NavMenuFooter from '../NavMenuFooter.vue';

const baseProps = {
    isCollapsed: false,
    isDarkMode: false,
    hasPendingUpdate: false,
    hasPendingInstall: false,
    version: '2026.01.01',
    vrcxLogo: 'logo.png',
    themes: ['system'],
    themeMode: 'system',
    tableDensity: 'standard',
    themeColors: [{ key: 'blue', label: 'Blue', swatch: '#00f' }],
    currentThemeColor: 'blue',
    isApplyingThemeColor: false,
    themeDisplayName: (value) => value,
    themeColorDisplayName: (value) => value?.key || ''
};

describe('NavMenuFooter', () => {
    it('renders version and supports collapse toggle', async () => {
        const wrapper = mount(NavMenuFooter, { props: baseProps });

        expect(wrapper.text()).toContain('2026.01.01');

        const buttons = wrapper.findAll('[data-testid="sidebar-menu-btn"]');
        const collapseBtn = buttons[buttons.length - 1];
        await collapseBtn.trigger('click');

        expect(wrapper.emitted('toggle-nav-collapse')).toHaveLength(1);
    });

    it('renders new dashboard button and emits quick-create-dashboard on click', async () => {
        const wrapper = mount(NavMenuFooter, {
            props: { ...baseProps, showNewDashboardButton: true }
        });

        const newDashboardBtn = wrapper.get('.bv-new-dashboard-btn');
        await newDashboardBtn.trigger('click');

        expect(wrapper.emitted('quick-create-dashboard')).toHaveLength(1);
    });

    it('labels the pending update marker with the non-color danger variant', () => {
        const wrapper = mount(NavMenuFooter, {
            props: { ...baseProps, hasPendingUpdate: true }
        });

        const updateIndicator = wrapper.get('.bv-status-dot');

        expect(updateIndicator.attributes()).toMatchObject({
            'data-status': 'danger',
            role: 'img',
            'aria-label': 'nav_menu.update_available'
        });
        expect(updateIndicator.classes()).not.toContain('bg-red-500');
    });
});
