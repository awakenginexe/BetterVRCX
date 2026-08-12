import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
    selectResult: vi.fn(),
    userImage: vi.fn(() => 'https://example.com/u.png'),
    isOpen: { value: true },
    query: { value: '' },
    friendResults: { value: [] },
    ownAvatarResults: { value: [] },
    favoriteAvatarResults: { value: [] },
    ownWorldResults: { value: [] },
    favoriteWorldResults: { value: [] },
    ownGroupResults: { value: [] },
    joinedGroupResults: { value: [] },
    hasResults: { value: false }
}));

vi.mock('pinia', async (i) => ({ ...(await i()), storeToRefs: (s) => s }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k) => k }) }));
vi.mock('../../stores/quickSearch', () => ({
    useQuickSearchStore: () => ({
        isOpen: mocks.isOpen,
        query: mocks.query,
        friendResults: mocks.friendResults,
        ownAvatarResults: mocks.ownAvatarResults,
        favoriteAvatarResults: mocks.favoriteAvatarResults,
        ownWorldResults: mocks.ownWorldResults,
        favoriteWorldResults: mocks.favoriteWorldResults,
        ownGroupResults: mocks.ownGroupResults,
        joinedGroupResults: mocks.joinedGroupResults,
        hasResults: mocks.hasResults,
        selectResult: (...args) => mocks.selectResult(...args)
    })
}));
vi.mock('../../composables/useUserDisplay', () => ({
    useUserDisplay: () => ({ userImage: (...a) => mocks.userImage(...a) })
}));
vi.mock('../QuickSearchSync.vue', () => ({
    default: { template: '<div data-testid="sync" />' }
}));
vi.mock('@/components/ui/dialog', () => ({
    Dialog: { template: '<div><slot /></div>' },
    DialogContent: { template: '<div v-bind="$attrs"><slot /></div>' },
    DialogHeader: { template: '<div><slot /></div>' },
    DialogTitle: { template: '<div><slot /></div>' },
    DialogDescription: { template: '<div><slot /></div>' }
}));
vi.mock('@/components/ui/command', () => ({
    Command: { template: '<div><slot /></div>' },
    CommandInput: { template: '<input v-bind="$attrs" />' },
    CommandList: { template: '<div v-bind="$attrs"><slot /></div>' },
    CommandGroup: { template: '<div v-bind="$attrs"><slot /></div>' },
    CommandItem: {
        emits: ['select'],
        template:
            '<button data-testid="cmd-item" @click="$emit(\'select\')"><slot /></button>'
    }
}));
vi.mock('lucide-vue-next', () => ({
    Globe: { template: '<i />' },
    Image: { template: '<i />' },
    Users: { template: '<i />' }
}));

import QuickSearchDialog from '../QuickSearchDialog.vue';

describe('QuickSearchDialog.vue', () => {
    beforeEach(() => {
        mocks.selectResult.mockClear();
        mocks.query.value = '';
        mocks.hasResults.value = false;
        mocks.friendResults.value = [];
    });

    it('renders search dialog structure', () => {
        const wrapper = mount(QuickSearchDialog);
        expect(wrapper.text()).toContain('side_panel.search_placeholder');
        expect(wrapper.find('[data-testid="sync"]').exists()).toBe(true);
    });

    it('exposes a focused command surface with an accessible empty state', () => {
        const queryRef = mocks.query;
        const hasResultsRef = mocks.hasResults;
        mocks.query = 'missing';
        mocks.hasResults = false;

        const wrapper = mount(QuickSearchDialog);

        expect(wrapper.get('[data-surface="quick-search"]')).toBeTruthy();
        expect(wrapper.get('[data-slot="quick-search-header"]')).toBeTruthy();
        expect(
            wrapper.get('input[aria-label="side_panel.search_placeholder"]')
        ).toBeTruthy();
        expect(
            wrapper.get('[data-empty-state="quick-search"]').attributes('role')
        ).toBe('status');

        mocks.query = queryRef;
        mocks.hasResults = hasResultsRef;
    });

    it('keeps grouped result activation delegated to the quick-search store', async () => {
        const queryRef = mocks.query;
        const hasResultsRef = mocks.hasResults;
        const friendResultsRef = mocks.friendResults;
        const result = { id: 'usr_1', name: 'Alice', type: 'friend' };
        mocks.query = 'alice';
        mocks.hasResults = true;
        mocks.friendResults = [result];

        const wrapper = mount(QuickSearchDialog);

        await wrapper.get('[data-testid="cmd-item"]').trigger('click');

        expect(mocks.selectResult).toHaveBeenCalledWith(result);

        mocks.query = queryRef;
        mocks.hasResults = hasResultsRef;
        mocks.friendResults = friendResultsRef;
    });
});
