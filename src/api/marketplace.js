import { request } from '../services/request';

const marketplaceRequest = {
    searchAvatars(params) {
        const query = Object.fromEntries(
            Object.entries(params).filter(([, value]) => value !== undefined)
        );
        return request('avatars', { method: 'GET', params: query }).then(
            (json) => ({ json, params })
        );
    },

    getStoreShelves(params) {
        return request('economy/store/shelves', { method: 'GET', params }).then(
            (json) => ({ json, params })
        );
    },

    getStore(params) {
        return request('economy/store', { method: 'GET', params }).then(
            (json) => ({ json, params })
        );
    },

    getProductPurchases(params) {
        return request('economy/purchases', { method: 'GET', params }).then(
            (json) => ({ json, params })
        );
    },

    getLicensedAvatars(params) {
        return request('avatars/licensed', { method: 'GET', params }).then(
            (json) => ({ json, params })
        );
    },

    purchaseListing(params) {
        return request('economy/purchase/listing', {
            method: 'POST',
            params
        }).then((json) => ({ json, params }));
    }
};

export default marketplaceRequest;
