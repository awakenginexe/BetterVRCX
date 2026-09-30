import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { useAvatarPerformance } from '../useAvatarPerformance';
const mocks = vi.hoisted(() => ({
    fetchAvatarPerformance: vi.fn(),
    cacheOfficialAvatar: vi.fn(),
    getCachedPerformance: vi.fn(),
    resolveOfficialAvatar: vi.fn()
}));
vi.mock('../../../../services/avatarPerformance/service', () => mocks);
const fileId = 'file_ce35d830-e20a-4df0-a6d4-5aaef4508044';
const metadata = (id = 'avtr_one', version = 42) => ({
    id,
    authorId: 'usr_someone_else',
    unityPackages: ['standalonewindows', 'android'].map((platform) => ({
        platform,
        assetUrl: `https://api.vrchat.cloud/api/1/file/${fileId}/${version}/file`
    }))
});
let scope;
function setup(initial = null, visible = true) {
    const avatar = ref(initial),
        enabled = ref(visible),
        onAnalysis = vi.fn(),
        onMetadata = vi.fn();
    scope = effectScope();
    const state = scope.run(() =>
        useAvatarPerformance(
            () => avatar.value,
            () => enabled.value,
            onAnalysis,
            onMetadata
        )
    );
    return { avatar, enabled, onAnalysis, onMetadata, ...state };
}
beforeEach(() => {
    vi.resetAllMocks();
    mocks.fetchAvatarPerformance.mockResolvedValue({
        status: 'available',
        stats: { meshCount: 1 }
    });
});
afterEach(() => scope.stop());
it('does not update a disposed detail consumer', async () => {
    let resolve;
    mocks.fetchAvatarPerformance.mockImplementation(
        () =>
            new Promise((r) => {
                resolve = r;
            })
    );
    const state = setup(metadata());
    scope.stop();
    resolve({ status: 'available', stats: {} });
    await flushPromises();
    expect(state.onAnalysis).not.toHaveBeenCalled();
});
it('waits for official metadata and open detail, then automatically loads both non-owned platforms', async () => {
    const state = setup();
    expect(mocks.fetchAvatarPerformance).not.toHaveBeenCalled();
    expect(state.selectedResult.value.status).toBe('loading');
    state.avatar.value = metadata();
    await flushPromises();
    expect(mocks.fetchAvatarPerformance).toHaveBeenCalledTimes(2);
    expect(state.selectedPlatform.value).toBe('standalonewindows');
    state.selectedPlatform.value = 'android';
    expect(state.selectedResult.value.status).toBe('available');
    state.enabled.value = false;
    await nextTick();
    state.avatar.value = metadata('avtr_two');
    await flushPromises();
    expect(mocks.fetchAvatarPerformance).toHaveBeenCalledTimes(2);
});
it('ignores a response from a replaced or closed dialog', async () => {
    let resolve;
    mocks.fetchAvatarPerformance.mockImplementationOnce(
        () =>
            new Promise((r) => {
                resolve = r;
            })
    );
    const state = setup(metadata());
    state.avatar.value = metadata('avtr_two');
    await flushPromises();
    resolve({ status: 'available', stats: { meshCount: 999 } });
    await flushPromises();
    expect(state.selectedResult.value.stats.meshCount).toBe(1);
    expect(state.onAnalysis).not.toHaveBeenCalledWith(
        'standalonewindows',
        expect.objectContaining({ stats: { meshCount: 999 } })
    );
});
it('refresh resolves current official packages first and forces the selected platform', async () => {
    const state = setup(metadata());
    await flushPromises();
    state.selectedPlatform.value = 'android';
    mocks.resolveOfficialAvatar.mockResolvedValue(metadata('avtr_one', 43));
    await state.refresh();
    await flushPromises();
    expect(mocks.resolveOfficialAvatar).toHaveBeenCalledWith('avtr_one');
    expect(state.onMetadata).toHaveBeenCalledWith(metadata('avtr_one', 43));
    expect(mocks.fetchAvatarPerformance).toHaveBeenLastCalledWith(
        expect.objectContaining({ platform: 'android', versionId: 43 }),
        { force: true }
    );
});
it('metadata refresh failure stays within performance and preserves the original avatar', async () => {
    const state = setup(metadata());
    await flushPromises();
    mocks.resolveOfficialAvatar.mockRejectedValue({ status: 403 });
    await state.refresh();
    expect(state.selectedResult.value.status).toBe('access');
    expect(state.avatar.value.id).toBe('avtr_one');
});
it('refresh forces analysis when official metadata newly exposes a previously missing build', async () => {
    const state = setup({ id: 'avtr_one', unityPackages: [] });
    mocks.resolveOfficialAvatar.mockResolvedValue(metadata());
    await state.refresh();
    await flushPromises();
    expect(mocks.fetchAvatarPerformance).toHaveBeenCalledWith(
        expect.objectContaining({ platform: 'standalonewindows' }),
        { force: true }
    );
});
