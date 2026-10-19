import { expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../services/request', () => ({
    request: mocks.request,
    failedGetRequests: new Map()
}));
vi.mock('../../queries', () => ({ queryClient: {}, queryKeys: {} }));
vi.mock('../../stores', () => ({ useUserStore: vi.fn() }));
import miscRequest from '../misc';

it('fetches InfoPush through the authenticated request transport', async () => {
    const params = {
        require: 'user-all',
        include: ['help-article', 'quick-menu-banner', 'loading-screen-banners']
    };
    mocks.request.mockResolvedValue([{ id: 'announcement' }]);
    expect(await miscRequest.getInfoPush(params)).toEqual({
        json: [{ id: 'announcement' }],
        params
    });
    expect(mocks.request).toHaveBeenCalledWith('infoPush', {
        method: 'GET',
        params
    });
});
