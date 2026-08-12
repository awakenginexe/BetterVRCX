import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key) => key })
}));

vi.mock('@/components/ui/button', () => ({
    Button: {
        props: ['disabled'],
        emits: ['click'],
        template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
    }
}));

vi.mock('@/components/ui/switch', () => ({
    Switch: { template: '<button><slot /></button>' }
}));

import FavoritesContentHeader from '../FavoritesContentHeader.vue';

describe('FavoritesContentHeader', () => {
    it('marks active edit selections and routes the bulk unfavorite action', async () => {
        const wrapper = mount(FavoritesContentHeader, {
            props: {
                editMode: true,
                editModeVisible: true,
                hasSelection: true
            },
            slots: {
                title: 'Friends'
            }
        });

        expect(wrapper.get('[data-favorites-selection]').attributes('data-favorites-selection')).toBe('active');

        const bulkAction = wrapper
            .findAll('button')
            .find((button) => button.text() === 'view.favorite.bulk_unfavorite');
        await bulkAction.trigger('click');

        expect(wrapper.emitted('bulk-unfavorite')).toEqual([[]]);
    });
});
