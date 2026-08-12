import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key) => key })
}));

vi.mock('vue-sonner', () => ({ toast: { success: vi.fn() } }));

vi.mock('@/components/ui/button', () => ({
    Button: { template: '<button><slot /></button>' }
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
    DropdownMenu: { template: '<div><slot /></div>' },
    DropdownMenuTrigger: { template: '<div><slot /></div>' },
    DropdownMenuContent: { template: '<div><slot /></div>' },
    DropdownMenuSeparator: { template: '<hr />' },
    DropdownMenuItem: {
        props: ['disabled'],
        emits: ['click'],
        template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
    }
}));

vi.mock('lucide-vue-next', () => ({ ArrowLeft: { template: '<i />' } }));

vi.mock('../../../../api', () => ({
    favoriteRequest: { addFavorite: vi.fn(), deleteFavorite: vi.fn() }
}));

import FavoritesMoveDropdown from '../FavoritesMoveDropdown.vue';

describe('FavoritesMoveDropdown', () => {
    it('keeps a local favorite origin distinct and marks full remote destinations', () => {
        const wrapper = mount(FavoritesMoveDropdown, {
            props: {
                favoriteGroup: [
                    { name: 'Available', displayName: 'Available', type: 'friend', count: 1, capacity: 16 },
                    { name: 'Full', displayName: 'Full', type: 'friend', count: 16, capacity: 16 }
                ],
                currentGroup: { name: 'Local group' },
                currentFavorite: { id: 'usr_1' },
                isLocalFavorite: true,
                type: 'friend'
            }
        });

        expect(wrapper.get('[data-favorites-move-origin]').attributes('data-favorites-move-origin')).toBe('local');
        expect(wrapper.get('[data-favorites-destination="Full"]').attributes('data-capacity-state')).toBe('full');
    });
});
