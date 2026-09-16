import { beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
vi.mock('../../../services/config', () => ({
    default: { getBool: vi.fn().mockResolvedValue(false), setBool: vi.fn() }
}));
import { useLastKnownPresenceStore } from '../store';
let store;
const tag = 'wrld_a:1';
function seed(count = 1) {
    for (let i = 0; i < count; i++)
        store.playerJoined(
            { id: `usr_${i}`, status: 'busy', location: 'private' },
            { location: `wrld_a:${i + 1}`, name: 'World' },
            { isFriend: true }
        );
}
beforeEach(async () => {
    setActivePinia(createPinia());
    store = useLastKnownPresenceStore();
    await store.init();
    store.setEnabled(true);
});
it.each([1, undefined, null, '0'])(
    'preserves observations for nonzero or unknown occupancy %s',
    (count) => {
        seed();
        store.onInstanceResponse(tag, { userCount: count });
        expect(store.observations.size).toBe(1);
    }
);
it('clears every exact-instance observation, preserving other instances and inputs', () => {
    seed(2);
    store.playerJoined(
        { id: 'usr_extra', status: 'busy', location: 'private' },
        { location: tag, name: 'World' },
        { isFriend: true }
    );
    const response = Object.freeze({ userCount: 0 });
    store.onInstanceResponse(tag, response);
    expect([...store.observations.keys()]).toEqual(['usr_1']);
});
it('records successful verification in RAM and clears it on disable', () => {
    seed();
    store.onInstanceResponse(tag, { userCount: 2 }, 1000);
    expect(store.lastVerifiedAtByInstance.get(tag)).toBe(1000);
    store.setEnabled(false);
    expect(store.lastVerifiedAtByInstance.size).toBe(0);
    expect(store.observations.size).toBe(0);
});
it('deduplicates exact instances and skips recently verified instances', async () => {
    seed();
    store.playerJoined(
        { id: 'usr_extra', status: 'busy', location: 'private' },
        { location: tag, name: 'World' },
        { isFriend: true }
    );
    const get = vi.fn().mockResolvedValue({});
    await store.verifyInstances(get, 1000000);
    expect(get).toHaveBeenCalledTimes(1);
    await store.verifyInstances(get, 1000001);
    expect(get).toHaveBeenCalledTimes(1);
});
it.each([1, 10, 14])(
    'bounds %s instances to ten, then fairly continues',
    async (count) => {
        seed(count);
        const get = vi.fn().mockResolvedValue({});
        await store.verifyInstances(get, 1000000);
        expect(get).toHaveBeenCalledTimes(Math.min(10, count));
        if (count > 10) {
            get.mockClear();
            await store.verifyInstances(get, 1300000);
            expect(
                get.mock.calls.slice(0, 4).map(([p]) => p.instanceId)
            ).toEqual(['11', '12', '13', '14']);
        }
    }
);
it.each([new Error('timeout'), { status: 403 }, { status: 404 }])(
    'preserves observations after failed verification',
    async (error) => {
        seed();
        await store.verifyInstances(vi.fn().mockRejectedValue(error), 1000000);
        expect(store.observations.size).toBe(1);
        expect(store.lastVerifiedAtByInstance.size).toBe(0);
    }
);
it('does no requests while disabled or empty', async () => {
    const get = vi.fn();
    await store.verifyInstances(get);
    store.setEnabled(false);
    await store.verifyInstances(get);
    expect(get).not.toHaveBeenCalled();
});

it('skips an instance invalidated while an earlier verification is in flight', async () => {
    seed(2);
    let release;
    const get = vi
        .fn()
        .mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    release = resolve;
                })
        )
        .mockResolvedValue({});
    const run = store.verifyInstances(get, 1000000);
    store.onInstanceResponse('wrld_a:2', { userCount: 0 });
    release({});
    await run;
    expect(get).toHaveBeenCalledTimes(1);
});
