import { beforeEach, describe, expect, it, vi } from 'vitest';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../services/request', () => ({ request }));

import marketplaceRequest from '../marketplace';

describe('marketplace API contracts', () => {
    beforeEach(() => request.mockResolvedValue({ results: [] }));

    it.each([
        ['searchAvatars', 'avatars', { search: 'cat', marketplace: 'all' }],
        ['getStoreShelves', 'economy/store/shelves', { storeId: 'store' }],
        ['getStore', 'economy/store', { storeId: 'store' }],
        [
            'getProductPurchases',
            'economy/purchases',
            { buyerId: 'user', n: 50 }
        ],
        ['getLicensedAvatars', 'avatars/licensed', { n: 50 }]
    ])(
        '%s preserves query and response shape',
        async (method, endpoint, params) => {
            const result = await marketplaceRequest[method](params);
            expect(request).toHaveBeenLastCalledWith(endpoint, {
                method: 'GET',
                params
            });
            expect(result).toEqual({ json: { results: [] }, params });
        }
    );

    it('omits undefined search filters from the actual query', async () => {
        await marketplaceRequest.searchAvatars({
            search: 'cat',
            sort: undefined
        });
        expect(request).toHaveBeenLastCalledWith('avatars', {
            method: 'GET',
            params: { search: 'cat' }
        });
    });

    it('posts the exact confirmed listing price and quantity', async () => {
        const params = { listingId: 'listing', totalPrice: 100, quantity: 1 };
        await marketplaceRequest.purchaseListing(params);
        expect(request).toHaveBeenLastCalledWith('economy/purchase/listing', {
            method: 'POST',
            params
        });
    });
});
