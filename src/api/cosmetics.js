import { request } from '../services/request';

const cosmeticsRequest = {
    getProfileEffects() {
        return request('cosmetics/index/profileEffect', {
            method: 'GET'
        }).then((json) => ({ json }));
    },

    getIconFrames() {
        return request('cosmetics/index/iconFrame', {
            method: 'GET'
        }).then((json) => ({ json }));
    },

    getNameplateEffects() {
        return request('cosmetics/index/nameplateEffect', {
            method: 'GET'
        }).then((json) => ({ json }));
    }
};

export default cosmeticsRequest;
