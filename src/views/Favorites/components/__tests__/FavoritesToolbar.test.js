import { describe, expect, it, vi } from 'vitest';
import { shallowMount } from '@vue/test-utils';

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key) => key })
}));

import FavoritesToolbar from '../FavoritesToolbar.vue';

describe('FavoritesToolbar', () => {
    it('uses the supplied route-specific label for its toolbar role', () => {
        const wrapper = shallowMount(FavoritesToolbar, {
            props: {
                ariaLabel: 'view.favorite.avatars.search'
            }
        });

        expect(wrapper.props('ariaLabel')).toBe('view.favorite.avatars.search');
        expect(wrapper.get('[role="toolbar"]').attributes('aria-label')).toBe(
            'view.favorite.avatars.search'
        );
    });

    it('falls back to the existing localized world search label', () => {
        const wrapper = shallowMount(FavoritesToolbar);

        expect(wrapper.get('[role="toolbar"]').attributes('aria-label')).toBe(
            'view.favorite.worlds.search'
        );
    });
});
