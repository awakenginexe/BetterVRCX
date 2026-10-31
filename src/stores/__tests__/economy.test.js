import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { reactive } from 'vue';

const mocks = vi.hoisted(() => ({
    purchases: vi.fn(),
    shelves: vi.fn(),
    balance: vi.fn(),
    buy: vi.fn()
}));
const user = reactive({
    currentUser: { id: 'usr_a' },
    isLocalUserVrcPlusSupporter: false
});
const state = reactive({ isLoggedIn: false });
const settings = reactive({ freeStoreItemNotifications: true });
vi.mock('../user', () => ({ useUserStore: () => user }));
vi.mock('../settings/notifications', () => ({
    useNotificationsSettingsStore: () => settings
}));
vi.mock('../../services/watchState', () => ({ watchState: state }));
vi.mock('../../api/marketplace', () => ({
    default: {
        getProductPurchases: mocks.purchases,
        getStoreShelves: mocks.shelves,
        purchaseListing: mocks.buy
    }
}));
vi.mock('../../api/misc', () => ({
    default: { getVRChatCredits: mocks.balance }
}));

const { useEconomyStore } = await import('../economy');

const free = {
    id: 'free',
    active: true,
    priceTokens: 0,
    productIds: ['product']
};
describe('account economy synchronization', () => {
    beforeEach(() => {
        state.isLoggedIn = false;
        user.currentUser.id = 'usr_a';
        settings.freeStoreItemNotifications = true;
        setActivePinia(createPinia());
        vi.clearAllMocks();
        mocks.purchases.mockResolvedValue({ json: [] });
        mocks.balance.mockResolvedValue({ json: { balance: 100 } });
        mocks.shelves.mockResolvedValue({ json: [{ listings: [free] }] });
        mocks.buy.mockResolvedValue({ json: {} });
    });

    it('paginates ownership and excludes inactive or other-account purchases', async () => {
        const store = useEconomyStore();
        state.isLoggedIn = true;
        await store.refresh();
        mocks.purchases
            .mockResolvedValueOnce({
                json: Array.from({ length: 50 }, (_, i) => ({
                    purchaseId: i,
                    buyerId: 'usr_a',
                    purchaseActive: true,
                    listingId: `listing${i}`
                }))
            })
            .mockResolvedValueOnce({
                json: [
                    {
                        buyerId: 'usr_a',
                        purchaseActive: false,
                        listingId: 'inactive'
                    },
                    {
                        buyerId: 'usr_b',
                        purchaseActive: true,
                        listingId: 'wrong'
                    }
                ]
            });
        await store.refreshPurchases();
        expect(store.ownedListingIds.size).toBe(50);
        expect(store.ownedListingIds.has('wrong')).toBe(false);
        expect(mocks.purchases).toHaveBeenLastCalledWith(
            expect.objectContaining({ buyerId: 'usr_a', offset: 50 })
        );
    });

    it('discards late results and clears reminders and balance when the account logs out', async () => {
        const store = useEconomyStore();
        state.isLoggedIn = true;
        await store.refresh();
        let finish;
        mocks.purchases.mockReturnValueOnce(
            new Promise((resolve) => {
                finish = resolve;
            })
        );
        const pending = store.refreshPurchases();
        state.isLoggedIn = false;
        finish({
            json: [{ buyerId: 'usr_a', purchaseActive: true, listingId: 'old' }]
        });
        await pending;
        expect(store.purchases).toEqual([]);
        expect(store.balance).toBeNull();
        expect(store.freeStoreItemDialog.visible).toBe(false);
    });

    it('updates live wallet balance and refreshes ownership after economy events', async () => {
        const store = useEconomyStore();
        state.isLoggedIn = true;
        await store.refresh();
        mocks.purchases.mockClear();
        await store.handleEvent({ walletBalance: 250 });
        expect(store.balance).toBe(250);
        expect(mocks.purchases).toHaveBeenCalled();
        await store.handleEvent({ walletBalance: -1 });
        expect(store.balance).toBe(250);
    });

    it('never replaces the new account ownership with a previous account response', async () => {
        const store = useEconomyStore();
        state.isLoggedIn = true;
        await store.refresh();
        let finish;
        mocks.purchases
            .mockReturnValueOnce(
                new Promise((resolve) => {
                    finish = resolve;
                })
            )
            .mockResolvedValue({
                json: [
                    { buyerId: 'usr_b', purchaseActive: true, listingId: 'new' }
                ]
            });
        const previous = store.refreshPurchases();
        user.currentUser.id = 'usr_b';
        await store.refresh();
        finish({
            json: [{ buyerId: 'usr_a', purchaseActive: true, listingId: 'old' }]
        });
        await previous;
        expect([...store.ownedListingIds]).toEqual(['new']);
    });

    it('only offers known zero-price unowned listings and suppresses bundle children', async () => {
        const store = useEconomyStore();
        mocks.shelves.mockResolvedValue({
            json: [
                {
                    listings: [
                        free,
                        {
                            id: 'bundle',
                            active: true,
                            priceTokens: 0,
                            productIds: ['product', 'extra']
                        },
                        { id: 'missing', active: true },
                        { id: 'paid', active: true, priceTokens: 1 }
                    ]
                }
            ]
        });
        state.isLoggedIn = true;
        await store.refresh();
        expect(
            store.freeStoreItemDialog.listings.map((item) => item.id)
        ).toEqual(['bundle']);
        expect(store.freeStoreItemDialog.visible).toBe(true);
    });

    it('claims only explicit zero-priced items and keeps failed claims available to retry', async () => {
        const store = useEconomyStore();
        state.isLoggedIn = true;
        await store.refresh();
        mocks.buy.mockRejectedValueOnce(new Error('network'));
        expect(await store.claimFreeListings()).toBe(0);
        expect(store.freeStoreItemDialog.visible).toBe(true);
        expect(await store.claimFreeListings()).toBe(1);
        expect(mocks.buy).toHaveBeenLastCalledWith({
            listingId: 'free',
            totalPrice: 0,
            quantity: 1
        });
        expect(store.freeStoreItemDialog.visible).toBe(false);
    });

    it('stops a batch before the next claim if the account changes', async () => {
        const store = useEconomyStore();
        state.isLoggedIn = true;
        await store.refresh();
        store.freeStoreItemDialog.listings.push({ ...free, id: 'another' });
        mocks.buy.mockImplementationOnce(async () => {
            state.isLoggedIn = false;
        });
        await store.claimFreeListings();
        expect(mocks.buy).toHaveBeenCalledTimes(1);
    });
});
