import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
    api: {
        searchAvatars: vi.fn(),
        getStore: vi.fn(),
        getStoreShelves: vi.fn(),
        getProductPurchases: vi.fn(),
        purchaseListing: vi.fn()
    },
    confirm: vi.fn(),
    balance: vi.fn(),
    openAvatar: vi.fn(),
    user: {
        currentUser: { id: 'usr_me' },
        isLocalUserVrcPlusSupporter: false
    }
}));
vi.mock('../../../api/marketplace', () => ({ default: mocks.api }));
vi.mock('../../../coordinators/avatarCoordinator', () => ({
    showAvatarDialog: mocks.openAvatar
}));
vi.mock('../../../api/misc', () => ({
    default: { getVRChatCredits: mocks.balance }
}));
vi.mock('../../../services/appConfig', () => ({
    AppDebug: { endpointDomain: 'https://api.vrchat.test' }
}));
vi.mock('../../../stores', () => ({
    useUserStore: () => mocks.user,
    useModalStore: () => ({ confirm: mocks.confirm }),
    useAvatarStore: () => ({ showAvatarDialog: mocks.openAvatar })
}));
vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key, params) => (params ? `${key} ${JSON.stringify(params)}` : key)
    })
}));

import MarketplaceSearch from '../MarketplaceSearch.vue';
import StoreBrowser from '../StoreBrowser.vue';

const listing = {
    id: 'listing',
    displayName: 'Cat',
    priceTokens: 100,
    active: true,
    productIds: ['product']
};
const mountComponent = (component, props = {}) => mount(component, { props });
const deferred = () => {
    let resolve;
    const promise = new Promise((r) => {
        resolve = r;
    });
    return { promise, resolve };
};

beforeEach(() => {
    vi.clearAllMocks();
    mocks.api.searchAvatars.mockResolvedValue({
        json: { results: [{ id: 'avtr_cat', name: 'Cat' }], hasNext: true }
    });
    mocks.api.getStore.mockResolvedValue({ json: { listings: [listing] } });
    mocks.api.getStoreShelves.mockResolvedValue({
        json: [{ id: 'shelf', displayName: 'Shelf', listings: [listing] }]
    });
    mocks.api.getProductPurchases.mockResolvedValue({ json: [] });
    mocks.api.purchaseListing.mockResolvedValue({ json: {} });
    mocks.balance.mockResolvedValue({ json: { balance: 500 } });
    mocks.confirm.mockResolvedValue({ ok: false });
});

describe('MarketplaceSearch', () => {
    it('loads official marketplace results and opens the existing avatar dialog', async () => {
        const wrapper = mountComponent(MarketplaceSearch, { search: 'cat' });
        await flushPromises();
        expect(mocks.api.searchAvatars).toHaveBeenCalledWith(
            expect.objectContaining({
                search: 'cat',
                marketplace: 'all',
                metadata: true,
                offset: 0
            })
        );
        await wrapper.get('[data-testid="avatar-avtr_cat"]').trigger('click');
        expect(mocks.openAvatar).toHaveBeenCalledWith('avtr_cat');
        await wrapper.get('[data-testid="next"]').trigger('click');
        await flushPromises();
        expect(mocks.api.searchAvatars).toHaveBeenLastCalledWith(
            expect.objectContaining({ offset: 50 })
        );
    });

    it('ignores an older response after query changes and resets pagination', async () => {
        const old = deferred();
        mocks.api.searchAvatars.mockReturnValueOnce(old.promise);
        const wrapper = mountComponent(MarketplaceSearch, { search: 'old' });
        await wrapper.setProps({ search: 'new' });
        await flushPromises();
        old.resolve({
            json: {
                results: [{ id: 'old', name: 'Old result' }],
                hasNext: false
            }
        });
        await flushPromises();
        expect(wrapper.text()).toContain('Cat');
        expect(wrapper.text()).not.toContain('Old result');
    });

    it('shows request errors and allows retry', async () => {
        mocks.api.searchAvatars.mockRejectedValueOnce(new Error('offline'));
        const wrapper = mountComponent(MarketplaceSearch);
        await flushPromises();
        expect(wrapper.get('[role="alert"]').text()).toContain(
            'marketplace.load_error'
        );
        await wrapper.get('[data-testid="retry"]').trigger('click');
        await flushPromises();
        expect(wrapper.text()).toContain('Cat');
    });

    it('validates credit filters before requesting a new search', async () => {
        const wrapper = mountComponent(MarketplaceSearch);
        await flushPromises();
        await wrapper.get('[data-testid="min-price"]').setValue('200');
        await wrapper.get('[data-testid="max-price"]').setValue('100');
        await wrapper.get('form').trigger('submit');
        expect(mocks.api.searchAvatars).toHaveBeenCalledTimes(1);
        expect(wrapper.get('[role="alert"]').text()).toContain(
            'marketplace.invalid_filters'
        );
        await wrapper.get('[data-testid="max-price"]').setValue('300');
        await wrapper.get('form').trigger('submit');
        await flushPromises();
        expect(mocks.api.searchAvatars).toHaveBeenLastCalledWith(
            expect.objectContaining({ minPrice: 200, maxPrice: 300, offset: 0 })
        );
    });
});

describe('StoreBrowser', () => {
    it('keeps available shelves visible when another official store fails', async () => {
        mocks.api.getStoreShelves.mockRejectedValueOnce(
            new Error('Store unavailable')
        );
        const wrapper = mountComponent(StoreBrowser);
        await flushPromises();
        expect(wrapper.find('[data-testid="buy-listing"]').exists()).toBe(true);
        expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    });
    it('loads a group/world store and disables already owned listings', async () => {
        mocks.api.getProductPurchases.mockResolvedValue({
            json: [
                {
                    purchaseActive: true,
                    buyerId: 'usr_me',
                    products: [{ id: 'product' }]
                }
            ]
        });
        const wrapper = mountComponent(StoreBrowser, { storeId: 'store' });
        await flushPromises();
        expect(mocks.api.getStore).toHaveBeenCalledWith({
            storeId: 'store',
            hydrateListings: true,
            hydrateContext: false
        });
        expect(
            wrapper.get('[data-testid="buy-listing"]').attributes('disabled')
        ).toBeDefined();
        expect(wrapper.text()).toContain('marketplace.owned');
    });

    it('requires explicit credit-price confirmation and refreshes ownership and balance after success', async () => {
        mocks.confirm.mockResolvedValue({ ok: true });
        const wrapper = mountComponent(StoreBrowser, {
            listings: [listing],
            entityId: 'avatar'
        });
        await flushPromises();
        await wrapper.get('[data-testid="buy-listing"]').trigger('click');
        await flushPromises();
        expect(mocks.confirm).toHaveBeenCalledWith(
            expect.objectContaining({
                description: expect.stringContaining('100')
            })
        );
        expect(mocks.confirm.mock.calls[0][0].description).toContain(
            'marketplace.credits'
        );
        expect(mocks.api.purchaseListing).toHaveBeenCalledExactlyOnceWith({
            listingId: 'listing',
            totalPrice: 100,
            quantity: 1
        });
        expect(mocks.balance).toHaveBeenCalledTimes(2);
        expect(mocks.api.getProductPurchases).toHaveBeenCalledTimes(2);
        expect(
            wrapper.get('[data-testid="buy-listing"]').attributes('disabled')
        ).toBeDefined();
        expect(wrapper.emitted('purchased')).toEqual([
            [{ listingId: 'listing', productId: '' }]
        ]);
    });

    it('does not purchase when confirmation is cancelled', async () => {
        const wrapper = mountComponent(StoreBrowser, { listings: [listing] });
        await flushPromises();
        await wrapper.get('[data-testid="buy-listing"]').trigger('click');
        await flushPromises();
        expect(mocks.api.purchaseListing).not.toHaveBeenCalled();
    });

    it('does not purchase a listing from an entity switched during confirmation', async () => {
        const confirmation = deferred();
        mocks.confirm.mockReturnValue(confirmation.promise);
        const wrapper = mountComponent(StoreBrowser, {
            listings: [listing],
            entityId: 'old'
        });
        await flushPromises();
        await wrapper.get('[data-testid="buy-listing"]').trigger('click');
        await wrapper.setProps({
            entityId: 'new',
            listings: [{ ...listing, id: 'new' }]
        });
        confirmation.resolve({ ok: true });
        await flushPromises();
        expect(mocks.api.purchaseListing).not.toHaveBeenCalled();
    });

    it('keeps purchases disabled when ownership cannot be loaded', async () => {
        mocks.api.getProductPurchases.mockRejectedValueOnce(
            new Error('offline')
        );
        const wrapper = mountComponent(StoreBrowser, { listings: [listing] });
        await flushPromises();
        expect(
            wrapper.get('[data-testid="buy-listing"]').attributes('disabled')
        ).toBeDefined();
        expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    });

    it('checks later ownership pages before enabling a purchase', async () => {
        const second = deferred();
        mocks.api.getProductPurchases
            .mockResolvedValueOnce({
                json: Array.from({ length: 50 }, (_, index) => ({
                    purchaseId: index
                }))
            })
            .mockReturnValueOnce(second.promise);
        const wrapper = mountComponent(StoreBrowser, { listings: [listing] });
        await flushPromises();
        expect(mocks.api.getProductPurchases).toHaveBeenLastCalledWith(
            expect.objectContaining({ offset: 50 })
        );
        second.resolve({
            json: [
                {
                    purchaseActive: true,
                    buyerId: 'usr_me',
                    listingId: 'listing'
                }
            ]
        });
        await flushPromises();
        expect(wrapper.get('[data-testid="buy-listing"]').text()).toContain(
            'marketplace.owned'
        );
        expect(
            wrapper.get('[data-testid="buy-listing"]').attributes('disabled')
        ).toBeDefined();
    });

    it('blocks duplicate confirmations and insufficient-credit purchases', async () => {
        const confirmation = deferred();
        mocks.confirm.mockReturnValueOnce(confirmation.promise);
        const wrapper = mountComponent(StoreBrowser, { listings: [listing] });
        await flushPromises();
        const button = wrapper.get('[data-testid="buy-listing"]');
        await button.trigger('click');
        await button.trigger('click');
        expect(mocks.confirm).toHaveBeenCalledTimes(1);
        confirmation.resolve({ ok: false });
        await flushPromises();
        mocks.balance.mockResolvedValue({ json: { balance: 0 } });
        await wrapper.vm.refresh();
        await flushPromises();
        expect(
            wrapper.get('[data-testid="buy-listing"]').attributes('disabled')
        ).toBeDefined();
    });
});
