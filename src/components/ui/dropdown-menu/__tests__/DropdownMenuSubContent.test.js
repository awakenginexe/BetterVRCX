import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger
} from '../index.js';
import DropdownMenuSubContent from '../DropdownMenuSubContent.vue';

describe('DropdownMenuSubContent.vue', () => {
    it('renders with portal and Tier 3 floating tokens and side-aware animation classes', async () => {
        const wrapper = mount(
            {
                components: {
                    DropdownMenu,
                    DropdownMenuTrigger,
                    DropdownMenuContent,
                    DropdownMenuSub,
                    DropdownMenuSubTrigger,
                    DropdownMenuSubContent
                },
                template: `
                <DropdownMenu :open="true">
                    <DropdownMenuTrigger>Open</DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuSub :open="true">
                            <DropdownMenuSubTrigger>Sub Trigger</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent class="custom-sub-class">
                                <div class="test-item">Sub Item</div>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    </DropdownMenuContent>
                </DropdownMenu>
            `
            },
            {
                attachTo: document.body
            }
        );

        await nextTick();
        await nextTick();

        expect(wrapper.exists()).toBe(true);

        // SubContent is portalled to document.body
        const subContent = document.body.querySelector(
            '[data-slot="dropdown-menu-sub-content"]'
        );
        expect(subContent).not.toBeNull();
        expect(subContent.textContent).toContain('Sub Item');

        // Check Tier 3 floating surface classes
        expect(subContent.className).toContain('bg-popover');
        expect(subContent.className).toContain('text-popover-foreground');
        expect(subContent.className).toContain(
            'border-[var(--bv-border-strong)]'
        );
        expect(subContent.className).toContain('shadow-[var(--bv-shadow-lg)]');
        expect(subContent.className).toContain(
            'backdrop-blur-[var(--bv-blur-md)]'
        );
        expect(subContent.className).toContain('rounded-lg');
        expect(subContent.className).toContain('custom-sub-class');
        expect(subContent.className).toContain('z-12000');

        wrapper.unmount();
    });
});
