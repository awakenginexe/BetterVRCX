import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
    currentUser: { id: 'usr_self' },
    request: vi.fn(),
    recordUserProfile: vi.fn()
}));
vi.mock('../../services/request', () => ({ request: mocks.request }));
vi.mock('../../coordinators/profileHistoryCoordinator', () => ({
    recordUserProfile: mocks.recordUserProfile
}));
vi.mock('../../coordinators/userCoordinator', () => ({
    applyUser: vi.fn(),
    applyCurrentUser: vi.fn(),
    invalidateUserPublicProfile: vi.fn()
}));
vi.mock('../../stores', () => ({
    useUserStore: () => ({ currentUser: mocks.currentUser })
}));
vi.mock('../../queries', () => ({
    patchAndRefetchActiveQuery: vi.fn(),
    queryKeys: {}
}));
import userRequest from '../user';
beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.id = 'usr_self';
});
it('records only the public profile response already fetched by the caller', async () => {
    const profile = { bio: 'Hello', bioLinks: [] };
    mocks.request.mockResolvedValue(profile);
    mocks.recordUserProfile.mockResolvedValue(undefined);
    expect(
        await userRequest.getPublicProfile({ userId: 'usr_friend' })
    ).toEqual({ json: profile, params: { userId: 'usr_friend' } });
    expect(mocks.recordUserProfile).toHaveBeenCalledWith(profile, 'usr_friend');
    expect(mocks.request).toHaveBeenCalledExactlyOnceWith(
        'profile/usr_friend',
        { method: 'GET' }
    );
});
it('uses the signed-in account for client animation settings', async () => {
    mocks.request.mockResolvedValue({ accessReduceDecorAnim: true });
    await userRequest.getClientConfig();
    await userRequest.saveClientConfig({ accessReduceDecorAnim: true });
    expect(mocks.request).toHaveBeenNthCalledWith(
        1,
        'users/usr_self/clientConfig',
        { method: 'GET' }
    );
    expect(mocks.request).toHaveBeenNthCalledWith(
        2,
        'users/usr_self/clientConfig',
        { method: 'PUT', params: { accessReduceDecorAnim: true } }
    );
});

it('does not record a public profile response from the previous signed-in account', async () => {
    let complete;
    mocks.request.mockReturnValue(
        new Promise((resolve) => {
            complete = resolve;
        })
    );
    const pending = userRequest.getPublicProfile({ userId: 'usr_friend' });
    mocks.currentUser.id = 'usr_other';
    complete({ bio: 'Old account view', bioLinks: [] });
    await pending;
    expect(mocks.recordUserProfile).not.toHaveBeenCalled();
});
