import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key) => key
    })
}));

vi.mock('lucide-vue-next', () => ({
    ChevronRight: { template: '<i class="chevron-icon" />' }
}));

vi.mock('@/components/ui/sidebar', () => ({
    SidebarMenuItem: {
        template: '<div class="sidebar-menu-item"><slot /></div>'
    },
    SidebarMenuButton: {
        props: ['isActive', 'dataNavKey', 'dataState'],
        template:
            '<button data-testid="folder-btn" :data-active="isActive" :data-state="dataState" :data-nav-key="dataNavKey"><slot /></button>'
    },
    SidebarMenuSub: {
        template: '<div class="sidebar-menu-sub"><slot /></div>'
    },
    SidebarMenuSubItem: {
        template: '<div class="sidebar-menu-sub-item"><slot /></div>'
    },
    SidebarMenuSubButton: {
        props: ['isActive', 'dataNavKey', 'dataActive'],
        emits: ['click'],
        template:
            '<button data-testid="submenu-btn" :data-active="dataActive" :data-nav-key="dataNavKey" @click="$emit(\'click\')"><slot /></button>'
    }
}));

vi.mock('@/components/ui/collapsible', () => ({
    Collapsible: { template: '<div><slot :open="true" /></div>' },
    CollapsibleTrigger: { template: '<div><slot /></div>' },
    CollapsibleContent: { template: '<div><slot /></div>' }
}));

vi.mock('@/components/ui/context-menu', () => ({
    ContextMenu: { template: '<div><slot /></div>' },
    ContextMenuTrigger: { template: '<div><slot /></div>' },
    ContextMenuContent: { template: '<div><slot /></div>' },
    ContextMenuItem: { template: '<button><slot /></button>' },
    ContextMenuSeparator: { template: '<hr />' }
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
    DropdownMenu: {
        emits: ['update:open'],
        template: '<div><slot /></div>'
    },
    DropdownMenuTrigger: { template: '<div><slot /></div>' },
    DropdownMenuContent: { template: '<div><slot /></div>' },
    DropdownMenuItem: { template: '<button><slot /></button>' }
}));

import NavMenuFolderItem from '../NavMenuFolderItem.vue';

const sampleFolder = {
    index: 'favorites',
    icon: 'ri-star-line',
    title: 'Favorites',
    titleIsCustom: true,
    children: [
        {
            index: 'favorite-friends',
            label: 'nav_tooltip.favorite_friends',
            icon: 'ri-user-star-line',
            titleIsCustom: false
        },
        {
            index: 'favorite-worlds',
            label: 'nav_tooltip.favorite_worlds',
            icon: 'ri-earth-line',
            titleIsCustom: false
        }
    ]
};

describe('Navigation Item States & Zero-Layout-Shift', () => {
    it('does not mark parent folder as active when a child is selected in expanded mode', () => {
        const wrapper = mount(NavMenuFolderItem, {
            props: {
                item: sampleFolder,
                isCollapsed: false,
                activeMenuIndex: 'favorite-worlds',
                collapsedDropdownOpenId: null,
                hasNotifications: false,
                isEntryNotified: () => false,
                isNavItemNotified: () => false,
                isDashboardItem: () => false,
                isToolItem: () => false
            }
        });

        const folderBtn = wrapper.find('[data-testid="folder-btn"]');
        expect(folderBtn.classes()).toContain('bv-nav-folder-trigger');
        expect(folderBtn.classes()).toContain('is-expanded');
        expect(folderBtn.classes()).not.toContain('bv-nav-item-active');
        expect(folderBtn.classes()).not.toContain('is-selected');

        const submenuBtns = wrapper.findAll('[data-testid="submenu-btn"]');
        expect(submenuBtns).toHaveLength(2);

        // Child 0 (favorite-friends): not active
        expect(submenuBtns[0].classes()).not.toContain('is-selected');

        // Child 1 (favorite-worlds): active/selected
        expect(submenuBtns[1].classes()).toContain('bv-nav-sub-item');
        expect(submenuBtns[1].classes()).toContain('is-selected');
        expect(submenuBtns[1].attributes('data-active')).toBe('true');
    });

    it('marks collapsed folder icon button with active highlight when a child is active', () => {
        const wrapper = mount(NavMenuFolderItem, {
            props: {
                item: sampleFolder,
                isCollapsed: true,
                activeMenuIndex: 'favorite-worlds',
                collapsedDropdownOpenId: null,
                hasNotifications: false,
                isEntryNotified: () => false,
                isNavItemNotified: () => false,
                isDashboardItem: () => false,
                isToolItem: () => false
            }
        });

        const folderBtn = wrapper.find('[data-testid="folder-btn"]');
        expect(folderBtn.classes()).toContain('bv-nav-item');
        expect(folderBtn.classes()).toContain('bv-nav-item-active');
    });

    it('asserts stylesheet contains zero-layout-shift ::before indicators for selected states', () => {
        const stylesheetPath = resolve(
            import.meta.dirname,
            '../../../styles/bettervrcx.css'
        );
        const stylesheet = readFileSync(stylesheetPath, 'utf8');

        // ::before indicator on selected
        expect(stylesheet).toContain('.bv-interactive.is-selected::before');
        expect(stylesheet).toContain('.bv-nav-item.is-selected::before');
        expect(stylesheet).toContain('.bv-nav-sub-item.is-selected::before');
        expect(stylesheet).toContain('position: absolute');
        expect(stylesheet).toContain('inset-inline-start: 0');

        // Folder trigger neutral styles
        expect(stylesheet).toContain(
            ".bv-nav-folder-trigger[data-state='open']"
        );
        expect(stylesheet).toContain(
            'background-color: var(--bv-bg-surface-raised)'
        );

        // Reduced motion
        expect(stylesheet).toContain('.bv-nav-item');
        expect(stylesheet).toContain('.bv-nav-sub-item');
    });
});
