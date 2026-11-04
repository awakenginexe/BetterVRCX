import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { reactive } from 'vue';

const mocks = vi.hoisted(() => ({
    getLicensedAvatars: vi.fn(),
    showAvatarDialog: vi.fn(),
    economy: { ownershipRevision: 0 }
}));
vi.mock('../../../api/marketplace', () => ({
    default: { getLicensedAvatars: mocks.getLicensedAvatars }
}));
vi.mock('../../../stores/economy', () => ({
    useEconomyStore: () => reactive(mocks.economy)
}));
vi.mock('../../../coordinators/avatarCoordinator', () => ({
    showAvatarDialog: mocks.showAvatarDialog
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
import PurchasedAvatars from '../PurchasedAvatars.vue';

let wrapper;
afterEach(() => wrapper?.unmount());
beforeEach(() => {
    vi.clearAllMocks();
});

describe('purchased avatars', () => {
    it('shows licensed avatars separately, filters by name and opens their avatar dialog', async () => {
        mocks.getLicensedAvatars.mockResolvedValue({
            json: [
                {
                    id: 'avtr_b',
                    name: 'Birb',
                    thumbnailImageUrl: 'https://example.com/birb.png'
                },
                { id: 'avtr_a', name: 'Aardvark' },
                { id: 'grp_invalid', name: 'Unrelated' }
            ]
        });
        wrapper = mount(PurchasedAvatars, {
            props: { searchQuery: '', sorting: 'name' }
        });
        await flushPromises();
        expect(
            wrapper.findAll('[data-licensed-avatar]').map((row) => row.text())
        ).toEqual(['Aardvark', 'Birb']);
        await wrapper.setProps({ searchQuery: 'bir' });
        await wrapper.get('[data-licensed-avatar]').trigger('click');
        expect(mocks.showAvatarDialog).toHaveBeenCalledWith('avtr_b');
        expect(wrapper.findAll('[data-licensed-avatar]')).toHaveLength(1);
    });

    it('loads each page and removes duplicate ids', async () => {
        const page = Array.from({ length: 100 }, (_, index) => ({
            id: `avtr_${index}`,
            name: `Avatar ${index}`
        }));
        mocks.getLicensedAvatars
            .mockResolvedValueOnce({ json: page })
            .mockResolvedValueOnce({
                json: [page[0], { id: 'avtr_last', name: 'Last' }]
            });
        wrapper = mount(PurchasedAvatars);
        await flushPromises();
        expect(mocks.getLicensedAvatars).toHaveBeenNthCalledWith(2, {
            n: 100,
            offset: 100
        });
        expect(wrapper.findAll('[data-licensed-avatar]')).toHaveLength(101);
    });

    it('shows failure and retries instead of presenting a failed request as an empty library', async () => {
        mocks.getLicensedAvatars
            .mockRejectedValueOnce(new Error('offline'))
            .mockResolvedValueOnce({ json: [] });
        wrapper = mount(PurchasedAvatars);
        await flushPromises();
        expect(wrapper.get('[role="alert"]').text()).toContain(
            'profile_improvements.licensed_error'
        );
        await wrapper.get('[data-refresh-licensed]').trigger('click');
        await flushPromises();
        expect(wrapper.find('[role="alert"]').exists()).toBe(false);
        expect(wrapper.text()).toContain('profile_improvements.licensed_empty');
    });

    it('refreshes the licensed library after ownership synchronization', async () => {
        mocks.getLicensedAvatars.mockResolvedValue({ json: [] });
        wrapper = mount(PurchasedAvatars);
        await flushPromises();
        mocks.getLicensedAvatars.mockResolvedValue({
            json: [{ id: 'avtr_new', name: 'New purchase' }]
        });
        reactive(mocks.economy).ownershipRevision++;
        await flushPromises();
        expect(wrapper.text()).toContain('New purchase');
    });
});
