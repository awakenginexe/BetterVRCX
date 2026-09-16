import { beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
vi.mock('../../services/config', () => ({
    default: { getBool: vi.fn().mockResolvedValue(false), setBool: vi.fn() }
}));
vi.mock('../../services/request', () => ({ request: vi.fn() }));
vi.mock('../../plugins/i18n', () => ({ i18n: { global: { t: (k) => k } } }));
vi.mock('../../stores', () => ({
    useInstanceStore: () => ({ applyInstance: (json) => json })
}));
import { request } from '../../services/request';
import instanceRequest from '../instance';
import { useLastKnownPresenceStore } from '../../addons/lastKnownPresence/store';
let store;
beforeEach(async () => {
    setActivePinia(createPinia());
    store = useLastKnownPresenceStore();
    await store.init();
    store.setEnabled(true);
    store.playerJoined(
        { id: 'usr_a', status: 'busy', location: 'private' },
        { location: 'wrld_a:1', name: 'A' },
        { isFriend: true }
    );
});
it('existing getInstance refresh invalidates from fresh raw response', async () => {
    request.mockResolvedValue({ userCount: 0 });
    await instanceRequest.getInstance({ worldId: 'wrld_a', instanceId: '1' });
    expect(store.observations.size).toBe(0);
});
it.each([403, 404, 500])(
    'failed refresh %s preserves observations',
    async (status) => {
        request.mockRejectedValue({ status });
        await expect(
            instanceRequest.getInstance({ worldId: 'wrld_a', instanceId: '1' })
        ).rejects.toEqual({ status });
        expect(store.observations.size).toBe(1);
    }
);
it('missing raw userCount never uses cached default zero', async () => {
    request.mockResolvedValue({});
    await instanceRequest.getInstance({ worldId: 'wrld_a', instanceId: '1' });
    expect(store.observations.size).toBe(1);
});
