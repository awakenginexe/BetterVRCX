import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
    execute: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    autoLogin: vi.fn()
}));
vi.mock('../../stores', () => ({
    useAuthStore: () => ({ handleAutoLogin: mocks.autoLogin }),
    useModalStore: () => ({}),
    useNotificationStore: () => ({}),
    useUpdateLoopStore: () => ({})
}));
vi.mock('../../coordinators/userCoordinator', () => ({
    getCurrentUser: vi.fn()
}));
vi.mock('../../services/webapi', () => ({
    default: { execute: mocks.execute }
}));
vi.mock('../../services/appConfig', () => ({
    AppDebug: { endpointDomain: 'https://api.vrchat.cloud/api/1' },
    isApiLogSuppressed: () => true
}));
vi.mock('../../services/watchState', () => ({
    watchState: { isLoggedIn: true }
}));
vi.mock('../../plugins/i18n', () => ({
    i18n: { global: { t: (key) => key } }
}));
vi.mock('../../queries', () => ({ queryClient: {}, queryKeys: {} }));
vi.mock('vue-sonner', () => ({
    toast: { error: mocks.error, success: mocks.success }
}));
import miscRequest from '../misc';
import { failedGetRequests } from '../../services/request';
const params = {
    fileId: 'file_ce35d830-e20a-4df0-a6d4-5aaef4508044',
    version: 65,
    variant: 'security'
};
beforeEach(() => {
    vi.clearAllMocks();
    failedGetRequests.clear();
});
it('keeps the authenticated transport and existing variant route', async () => {
    mocks.execute.mockResolvedValue({
        status: 200,
        data: '{"success":true,"avatarStats":{"totalVertices":12}}'
    });
    expect(
        (await miscRequest.getFileAnalysis(params)).json.avatarStats
            .totalVertices
    ).toBe(12);
    expect(mocks.execute).toHaveBeenCalledWith(
        expect.objectContaining({
            method: 'GET',
            url: `https://api.vrchat.cloud/api/1/analysis/${params.fileId}/65/security`
        })
    );
});
it('supports the unqualified analysis endpoint without appending undefined', async () => {
    mocks.execute.mockResolvedValue({ status: 200, data: '{}' });
    await miscRequest.getFileAnalysis({ fileId: params.fileId, version: 65 });
    expect(mocks.execute.mock.calls[0][0].url).toBe(
        `https://api.vrchat.cloud/api/1/analysis/${params.fileId}/65`
    );
});
it.each([202, 404, 401, 403])(
    'preserves HTTP %s for friendly inline handling without toasts or unhandled cleanup rejection',
    async (status) => {
        mocks.execute.mockResolvedValue({
            status,
            data: JSON.stringify({
                error: { message: 'not available', status_code: status }
            })
        });
        await expect(miscRequest.getFileAnalysis(params)).rejects.toMatchObject(
            { status }
        );
        expect(mocks.error).not.toHaveBeenCalled();
    }
);
it('manual refresh bypasses the existing failed-GET cooldown', async () => {
    failedGetRequests.set(`analysis/${params.fileId}/65/security`, Date.now());
    mocks.execute.mockResolvedValue({ status: 200, data: '{"success":true}' });
    await miscRequest.getFileAnalysis(params, { forceRefresh: true });
    expect(mocks.execute).toHaveBeenCalledTimes(1);
});
