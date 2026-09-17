import { beforeEach, describe, expect, test, vi } from 'vitest';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('../../services/request', () => ({
    request: (...args) => requestMock(...args)
}));

import cosmeticsRequest from '../cosmetics';

describe('cosmeticsRequest', () => {
    beforeEach(() => {
        requestMock.mockReset().mockResolvedValue([]);
    });

    test.each([
        ['getProfileEffects', 'cosmetics/index/profileEffect'],
        ['getIconFrames', 'cosmetics/index/iconFrame'],
        ['getNameplateEffects', 'cosmetics/index/nameplateEffect']
    ])('%s retrieves the matching cosmetic index', async (method, endpoint) => {
        await expect(cosmeticsRequest[method]()).resolves.toEqual({ json: [] });
        expect(requestMock).toHaveBeenCalledWith(endpoint, { method: 'GET' });
    });
});
