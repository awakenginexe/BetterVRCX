import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key) => key
    })
}));

vi.mock('@/components/ui/button', () => ({
    Button: {
        props: ['disabled'],
        emits: ['click'],
        template:
            '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
    }
}));

vi.mock('@/components/ui/button-group', () => ({
    ButtonGroup: {
        template: '<div v-bind="$attrs"><slot /></div>'
    }
}));

vi.mock('@/components/ui/kbd', () => ({
    Kbd: { template: '<kbd><slot /></kbd>' }
}));

vi.mock('lucide-vue-next', () => ({
    ArrowLeft: { template: '<i />' },
    ArrowRight: { template: '<i />' }
}));

import SearchPagination from '../SearchPagination.vue';

describe('SearchPagination.vue', () => {
    it('exposes a surfaced navigation landmark with labeled controls', async () => {
        const wrapper = mount(SearchPagination, {
            props: {
                show: true,
                prevDisabled: false,
                nextDisabled: false
            }
        });

        expect(wrapper.get('nav').classes()).toContain('bv-surface-raised');
        expect(wrapper.get('nav').attributes('aria-label')).toBe(
            'nav_tooltip.search'
        );

        const buttons = wrapper.findAll('button');
        expect(buttons[0].attributes('aria-label')).toBe(
            'table.pagination.previous'
        );
        expect(buttons[1].attributes('aria-label')).toBe(
            'table.pagination.next'
        );

        await buttons[0].trigger('click');
        await buttons[1].trigger('click');

        expect(wrapper.emitted('prev')).toHaveLength(1);
        expect(wrapper.emitted('next')).toHaveLength(1);
    });
});
