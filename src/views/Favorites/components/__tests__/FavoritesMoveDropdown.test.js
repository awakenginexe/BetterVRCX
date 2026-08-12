import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
    addFavorite: vi.fn(),
    deleteFavorite: vi.fn()
}));

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
    DropdownMenuContent: {
        template: '<div role="menu" v-bind="$attrs"><slot /></div>'
    },
    DropdownMenuSeparator: { template: '<hr />' },
    DropdownMenuItem: {
        props: ['disabled'],
        emits: ['click'],
        template:
            '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
    }
}));

vi.mock('lucide-vue-next', () => ({ ArrowLeft: { template: '<i />' } }));

vi.mock('../../../../api', () => ({
    favoriteRequest: {
        addFavorite: (...args) => mocks.addFavorite(...args),
        deleteFavorite: (...args) => mocks.deleteFavorite(...args)
    }
}));

import FavoritesMoveDropdown from '../FavoritesMoveDropdown.vue';

describe('FavoritesMoveDropdown', () => {
    it('keeps the current destination for local copies, disables full groups, and copies an avatar', async () => {
        mocks.addFavorite.mockResolvedValue({});
        const wrapper = mount(FavoritesMoveDropdown, {
            props: {
                favoriteGroup: [
                    {
                        name: 'Current',
                        displayName: 'Current',
                        type: 'avatar',
                        count: 1,
                        capacity: 16
                    },
                    {
                        name: 'Available',
                        displayName: 'Available',
                        type: 'friend',
                        count: 1,
                        capacity: 16
                    },
                    {
                        name: 'Full',
                        displayName: 'Full',
                        type: 'avatar',
                        count: 16,
                        capacity: 16
                    }
                ],
                currentGroup: { name: 'Local group' },
                currentFavorite: { id: 'avtr_1' },
                isLocalFavorite: true,
                type: 'avatar'
            }
        });

        expect(wrapper.get('[role="menu"]').attributes('aria-label')).toBe(
            'view.favorite.copy_tooltip'
        );
        expect(
            wrapper.findAll('button').map((button) => button.text())
        ).toContain('Current1 / 16');

        const available = wrapper
            .findAll('button')
            .find((button) => button.text() === 'Available1 / 16');
        const full = wrapper
            .findAll('button')
            .find((button) => button.text() === 'Full16 / 16');
        expect(full.attributes('disabled')).toBeDefined();

        await available.trigger('click');

        expect(mocks.addFavorite).toHaveBeenCalledWith({
            type: 'friend',
            favoriteId: 'avtr_1',
            tags: 'Available'
        });
    });

    it('filters the current remote group and moves only to an available destination', async () => {
        mocks.deleteFavorite.mockResolvedValue({});
        mocks.addFavorite.mockResolvedValue({});
        const wrapper = mount(FavoritesMoveDropdown, {
            props: {
                favoriteGroup: [
                    {
                        name: 'Current',
                        displayName: 'Current',
                        type: 'avatar',
                        count: 1,
                        capacity: 16
                    },
                    {
                        name: 'Available',
                        displayName: 'Available',
                        type: 'avatar',
                        count: 1,
                        capacity: 16
                    },
                    {
                        name: 'Full',
                        displayName: 'Full',
                        type: 'avatar',
                        count: 16,
                        capacity: 16
                    }
                ],
                currentGroup: { name: 'Current' },
                currentFavorite: { ref: { id: 'avtr_2' } },
                isLocalFavorite: false,
                type: 'avatar'
            }
        });

        expect(wrapper.text()).not.toContain('Current1 / 16');
        const available = wrapper
            .findAll('button')
            .find((button) => button.text() === 'Available1 / 16');
        const full = wrapper
            .findAll('button')
            .find((button) => button.text() === 'Full16 / 16');
        expect(full.attributes('disabled')).toBeDefined();

        await available.trigger('click');
        await vi.waitFor(() => {
            expect(mocks.deleteFavorite).toHaveBeenCalledWith({
                objectId: 'avtr_2'
            });
            expect(mocks.addFavorite).toHaveBeenCalledWith({
                type: 'avatar',
                favoriteId: 'avtr_2',
                tags: 'Available'
            });
        });
    });
});
