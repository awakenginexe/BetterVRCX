import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../../../queries/client';
import { cacheOfficialAvatar, fetchAvatarPerformance } from '../service';
import { queryKeys } from '../../../queries/keys';
const mocks = vi.hoisted(() => ({ getFileAnalysis: vi.fn() }));
vi.mock('../../../api/misc', () => ({ default: mocks }));
const pkg = {
    avatarId: 'avtr_one',
    platform: 'standalonewindows',
    fileId: 'file_ce35d830-e20a-4df0-a6d4-5aaef4508044',
    versionId: 42,
    variant: 'security'
};
const success = () => ({
    json: {
        success: true,
        performanceRating: 'Good',
        avatarStats: { totalPolygons: 120 }
    }
});
beforeEach(() => {
    queryClient.clear();
    vi.resetAllMocks();
    mocks.getFileAnalysis.mockResolvedValue(success());
});

describe('performance requests and cache', () => {
    it('retains newly resolved official packages in the shared avatar metadata cache', () => {
        const metadata = {
            id: pkg.avatarId,
            unityPackages: [{ platform: 'standalonewindows', assetUrl: null }]
        };
        cacheOfficialAvatar(metadata);
        expect(
            queryClient.getQueryData(queryKeys.avatar(pkg.avatarId)).json
        ).toEqual(metadata);
    });
    it('handles session cache clearing during an in-flight request', async () => {
        let resolve;
        mocks.getFileAnalysis.mockImplementationOnce(
            () =>
                new Promise((r) => {
                    resolve = r;
                })
        );
        const request = fetchAvatarPerformance(pkg);
        await vi.waitFor(() =>
            expect(mocks.getFileAnalysis).toHaveBeenCalledTimes(1)
        );
        queryClient.clear();
        expect(await request).toEqual({ status: 'error' });
        resolve(success());
        expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    });
    it('caches success for identical avatar/platform/file/version', async () => {
        const first = await fetchAvatarPerformance(pkg);
        expect(first).toMatchObject({ status: 'available', rating: 'Good' });
        expect(await fetchAvatarPerformance(pkg)).toEqual(first);
        expect(mocks.getFileAnalysis).toHaveBeenCalledTimes(1);
    });
    it('refetches for a new file or version and separates platforms/avatars', async () => {
        await fetchAvatarPerformance(pkg);
        await fetchAvatarPerformance({ ...pkg, versionId: 43 });
        await fetchAvatarPerformance({ ...pkg, fileId: 'file_new' });
        await fetchAvatarPerformance({ ...pkg, platform: 'android' });
        await fetchAvatarPerformance({ ...pkg, avatarId: 'avtr_two' });
        expect(mocks.getFileAnalysis).toHaveBeenCalledTimes(5);
    });
    it('manual refresh bypasses cache and requests HTTP failure-cache bypass', async () => {
        await fetchAvatarPerformance(pkg);
        mocks.getFileAnalysis.mockResolvedValue({
            json: { avatarStats: { totalPolygons: 200 } }
        });
        expect(
            (await fetchAvatarPerformance(pkg, { force: true })).stats
                .totalPolygons
        ).toBe(200);
        expect(mocks.getFileAnalysis).toHaveBeenLastCalledWith(
            { fileId: pkg.fileId, version: 42, variant: 'security' },
            { forceRefresh: true }
        );
        expect((await fetchAvatarPerformance(pkg)).stats.totalPolygons).toBe(
            200
        );
        expect(mocks.getFileAnalysis).toHaveBeenCalledTimes(2);
    });
    it('deduplicates simultaneous consumers and simultaneous refreshes', async () => {
        let resolve;
        mocks.getFileAnalysis.mockImplementationOnce(
            () =>
                new Promise((r) => {
                    resolve = r;
                })
        );
        const requests = [
            fetchAvatarPerformance(pkg),
            fetchAvatarPerformance(pkg),
            fetchAvatarPerformance(pkg, { force: true })
        ];
        await vi.waitFor(() =>
            expect(mocks.getFileAnalysis).toHaveBeenCalledTimes(1)
        );
        resolve(success());
        const values = await Promise.all(requests);
        expect(values[0]).toEqual(values[1]);
        expect(values[1]).toEqual(values[2]);
    });
    it.each([
        [202, 'pending'],
        [404, 'unavailable'],
        [401, 'access'],
        [403, 'access'],
        [0, 'error'],
        [500, 'error']
    ])('handles HTTP %s without rejecting detail', async (status, expected) => {
        mocks.getFileAnalysis.mockRejectedValue(
            Object.assign(new Error('API failure'), { status })
        );
        expect(await fetchAvatarPerformance(pkg)).toEqual({ status: expected });
    });
    it('handles a raw network rejection', async () => {
        mocks.getFileAnalysis.mockRejectedValue(new Error('offline'));
        expect(await fetchAvatarPerformance(pkg)).toEqual({ status: 'error' });
    });
    it('briefly caches pending/unavailable without polling and refresh retries them', async () => {
        mocks.getFileAnalysis.mockRejectedValue({ status: 202 });
        await fetchAvatarPerformance(pkg);
        await fetchAvatarPerformance(pkg);
        expect(mocks.getFileAnalysis).toHaveBeenCalledTimes(1);
        await fetchAvatarPerformance(pkg, { force: true });
        expect(mocks.getFileAnalysis).toHaveBeenCalledTimes(2);
    });
    it('does not request analysis without a file identity', async () => {
        expect(await fetchAvatarPerformance({ ...pkg, fileId: null })).toEqual({
            status: 'unavailable'
        });
        expect(mocks.getFileAnalysis).not.toHaveBeenCalled();
    });
});
