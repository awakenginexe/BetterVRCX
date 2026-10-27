import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { reactive } from 'vue';
import { flushPromises } from '@vue/test-utils';

const native = vi.hoisted(() => ({
    execute: vi.fn(),
    executeNonQuery: vi.fn()
}));
const remote = vi.hoisted(() => ({
    lookupAvatars: vi.fn(),
    selectAvatarWithoutConfirmation: vi.fn(),
    getAvatar: vi.fn()
}));
const cache = vi.hoisted(() => ({
    getCachedAvatarById: vi.fn(),
    getFoundAvatarHistory: vi.fn()
}));
const requests = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock('../../api', () => ({
    avatarRequest: { getAvatar: remote.getAvatar }
}));
vi.mock('../../services/observedAvatarRequest', async (original) => ({
    ...(await original()),
    observedAvatarRequester: requests
}));
vi.mock('../../services/sqlite', () => ({ default: native }));
vi.mock('../../services/database', async () => ({
    database: {
        ...(await import('../../services/database/foundAvatars')).foundAvatars,
        ...cache
    }
}));
vi.mock('../../coordinators/avatarCoordinator', () => remote);
vi.mock('../user', () => ({ useUserStore: () => user }));
vi.mock('../friend', () => ({ useFriendStore: () => friends }));
vi.mock('../settings/advanced', () => ({
    useAdvancedSettingsStore: () => settings
}));
const savedConfig = new Map();
vi.mock('../../services/config', () => ({
    default: {
        getBool: vi.fn(
            async (key, fallback) => savedConfig.get(key) ?? fallback
        ),
        setBool: vi.fn(async (key, value) => savedConfig.set(key, value))
    }
}));

import { foundAvatars } from '../../services/database/foundAvatars';
import { useFoundAvatarsStore } from '../foundAvatars';
import { watchState } from '../../services/watchState';
import { createObservedAvatarRequester } from '../../services/observedAvatarRequest';

const A = 'usr_11111111-1111-1111-1111-111111111111';
const B = 'usr_22222222-2222-2222-2222-222222222222';
const FRIEND = 'usr_33333333-3333-3333-3333-333333333333';
const ID = 'avtr_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ID2 = 'avtr_bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const user = reactive({ currentUser: { id: A, displayName: 'Me' } });
const friends = reactive({ friends: new Map() });
const settings = reactive({ avatarRemoteDatabase: true });
let db;
let pinia;
const bind = (args = {}) =>
    Object.fromEntries(
        Object.entries(args).map(([key, value]) => [
            key.replace(/^@/, ''),
            value
        ])
    );
const start = async () => {
    const store = useFoundAvatarsStore();
    await flushPromises();
    return store;
};
const sighting = (extra = {}) => ({
    avatarId: ID,
    observedAt: '2026-10-27T10:00:00Z',
    source: 'log',
    ...extra
});

beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime('2026-10-27T12:00:00Z');
    requests.run.mockImplementation(
        createObservedAvatarRequester({ request: vi.fn() }).run
    );
    db = new DatabaseSync(':memory:');
    native.execute.mockImplementation(async (callback, sql, args) => {
        const statement = db.prepare(sql);
        statement.setReturnArrays(true);
        statement.all(bind(args)).forEach(callback);
    });
    native.executeNonQuery.mockImplementation(async (sql, args) =>
        db.prepare(sql).run(bind(args))
    );
    await foundAvatars.initFoundAvatarTables(A);
    await foundAvatars.initFoundAvatarTables(B);
    cache.getCachedAvatarById.mockResolvedValue(null);
    cache.getFoundAvatarHistory.mockResolvedValue([]);
    remote.getAvatar.mockResolvedValue({
        json: { id: ID, releaseStatus: 'public' }
    });
    remote.selectAvatarWithoutConfirmation.mockResolvedValue();
    savedConfig.clear();
    user.currentUser.id = A;
    user.currentUser.currentAvatar = '';
    friends.friends.clear();
    settings.avatarRemoteDatabase = true;
    watchState.isLoggedIn = true;
    watchState.isFriendsLoaded = true;
    pinia = createPinia();
    setActivePinia(pinia);
    remote.lookupAvatars.mockImplementation(async (_type, _id, options) => {
        options?.onState?.({
            attemptedProviders: ['avtrdb'],
            failedProviders: []
        });
        return new Map([[ID, { id: ID, name: 'Avatar' }]]);
    });
    globalThis.AppApi = {
        GetFoundAvatarLogData: vi.fn(async () =>
            JSON.stringify({
                observations: [],
                filesRead: 1,
                filesSkipped: 0,
                errors: 0
            })
        )
    };
});
afterEach(() => {
    pinia?._s.forEach((s) => s.$dispose());
    db.close();
    vi.useRealTimers();
    delete globalThis.AppApi;
});

it('captures the initial self avatar after the account history is ready', async () => {
    user.currentUser.currentAvatar = ID;
    const store = await start();
    expect(store.entries[0]).toMatchObject({
        id: ID,
        source: 'self',
        firstWearerId: A
    });
    expect(store.entries[0].wearers[0].userId).toBe(A);
    expect(remote.lookupAvatars).not.toHaveBeenCalled();
});

it('checks official public availability on explicit selection before changing avatar', async () => {
    const store = await start();
    await store.recordObservation(sighting());
    expect(remote.getAvatar).not.toHaveBeenCalled();
    expect(await store.changeIntoAvatar(ID)).toBe('selected');
    expect(remote.getAvatar).toHaveBeenCalledWith({ avatarId: ID });
    expect(remote.selectAvatarWithoutConfirmation).toHaveBeenCalledWith(ID);
    expect(remote.lookupAvatars).not.toHaveBeenCalled();
    expect(store.entries[0].publicVerifiedAt).toBe(new Date().toISOString());
});

it('never treats cached or third-party public details as verified availability, and clears failed verification', async () => {
    const store = await start();
    await store.recordObservation(
        sighting({ metadata: { releaseStatus: 'public' } })
    );
    expect(store.entries[0].publicVerifiedAt).toBeNull();
    const official = {
        id: ID,
        name: 'Official avatar',
        releaseStatus: 'public'
    };
    remote.lookupAvatars.mockImplementationOnce(async (_type, _id, options) => {
        options.onOfficialAvatar(official);
        return new Map([[ID, official]]);
    });
    await store.lookupAvatar(ID);
    expect(store.entries[0].publicVerifiedAt).toBe(new Date().toISOString());
    remote.lookupAvatars.mockImplementationOnce(async (_type, _id, options) => {
        options.onState({
            attemptedProviders: ['avtrdb'],
            failedProviders: []
        });
        return new Map([[ID, official]]);
    });
    const retry = store.lookupAvatar(ID);
    await vi.advanceTimersByTimeAsync(2_000);
    await retry;
    expect(store.entries[0].metadata.releaseStatus).toBe('public');
    expect(store.entries[0].publicVerifiedAt).toBeNull();
    expect(
        (await foundAvatars.getFoundAvatars(A))[0].publicVerifiedAt
    ).toBeNull();
});

it('clears prior official verification when the next search fails and retains saved details', async () => {
    const store = await start();
    await store.recordObservation(
        sighting({
            metadata: { name: 'Saved avatar', releaseStatus: 'public' }
        })
    );
    store.entries[0].publicVerifiedAt = new Date().toISOString();
    remote.lookupAvatars.mockRejectedValueOnce(new Error('Search failed'));
    await store.lookupAvatar(ID);
    expect(store.entries[0].lookupState).toBe('unavailable');
    expect(store.entries[0].metadata.name).toBe('Saved avatar');
    expect(store.entries[0].publicVerifiedAt).toBeNull();
    expect(
        (await foundAvatars.getFoundAvatars(A))[0].publicVerifiedAt
    ).toBeNull();
});

it('clears and persists a prior public verification after an inaccessible avatar selection', async () => {
    const store = await start();
    await store.recordObservation(
        sighting({ metadata: { releaseStatus: 'public' } })
    );
    store.entries[0].publicVerifiedAt = new Date().toISOString();
    remote.getAvatar.mockRejectedValue({ status: 404 });
    expect(await store.changeIntoAvatar(ID)).toBe('unavailable');
    expect(store.entries[0].publicVerifiedAt).toBeNull();
    expect(
        (await foundAvatars.getFoundAvatars(A))[0].publicVerifiedAt
    ).toBeNull();
});

it.each([
    { json: { id: ID, releaseStatus: 'private' }, result: 'not_public' },
    { json: { id: ID2, releaseStatus: 'public' }, result: 'unavailable' },
    { json: { id: ID }, result: 'unavailable' }
])(
    'never selects an avatar without an exact, currently public official result: %j',
    async ({ json, result }) => {
        const store = await start();
        await store.recordObservation(
            sighting({ metadata: { releaseStatus: 'public' } })
        );
        remote.getAvatar.mockResolvedValue({ json });
        expect(await store.changeIntoAvatar(ID)).toBe(result);
        expect(remote.selectAvatarWithoutConfirmation).not.toHaveBeenCalled();
    }
);

it('does not select inaccessible, rate-limited or failed avatars', async () => {
    const store = await start();
    await store.recordObservation(sighting());
    remote.getAvatar.mockRejectedValue({ status: 404 });
    expect(await store.changeIntoAvatar(ID)).toBe('unavailable');
    await vi.advanceTimersByTimeAsync(2_000);
    remote.getAvatar.mockRejectedValue({ status: 429, retryAfter: '60' });
    expect(await store.changeIntoAvatar(ID)).toBe('unavailable');
    expect(remote.selectAvatarWithoutConfirmation).not.toHaveBeenCalled();
});

it('reports a failed change after successful public verification', async () => {
    const store = await start();
    await store.recordObservation(sighting());
    store.entries[0].publicVerifiedAt = new Date().toISOString();
    remote.selectAvatarWithoutConfirmation.mockRejectedValueOnce(
        new Error('Selection failed')
    );
    expect(await store.changeIntoAvatar(ID)).toBe('unavailable');
    expect(remote.selectAvatarWithoutConfirmation).toHaveBeenCalledTimes(1);
    expect(store.entries[0].publicVerifiedAt).toBeNull();
});

it('rejects non-discoveries and cancels selection when the account changes during verification', async () => {
    const store = await start();
    expect(await store.changeIntoAvatar('invalid')).toBe('unavailable');
    expect(await store.changeIntoAvatar(ID)).toBe('unavailable');
    expect(remote.getAvatar).not.toHaveBeenCalled();
    await store.recordObservation(sighting());
    let finish;
    remote.getAvatar.mockImplementation(
        () =>
            new Promise((resolve) => {
                finish = resolve;
            })
    );
    const change = store.changeIntoAvatar(ID);
    await flushPromises();
    user.currentUser.id = B;
    await flushPromises();
    finish({ json: { id: ID, releaseStatus: 'public' } });
    expect(await change).toBe('unavailable');
    expect(remote.selectAvatarWithoutConfirmation).not.toHaveBeenCalled();
});

it('persists exact IDs with unknown wearer across restarts and isolates accounts', async () => {
    let store = await start();
    await store.recordObservation(sighting());
    await store.recordObservation(sighting({ avatarId: 'Avatar name' }));
    expect(store.entries).toHaveLength(1);
    expect(store.entries[0]).toMatchObject({
        id: ID,
        firstSeenAt: '2026-10-27T10:00:00.000Z',
        firstWearerId: null,
        wearers: [],
        lookupState: 'not_searched'
    });
    expect(remote.lookupAvatars).not.toHaveBeenCalled();
    store.$dispose();
    pinia = createPinia();
    setActivePinia(pinia);
    store = await start();
    expect(store.entries[0].id).toBe(ID);
    user.currentUser.id = B;
    await flushPromises();
    expect(store.entries).toEqual([]);
    user.currentUser.id = A;
    await flushPromises();
    expect(store.entries[0].id).toBe(ID);
});

it('keeps unknown initial wearer while deduplicating explicit wearer sightings and renames', async () => {
    const store = await start();
    await store.setAutoLookupFriends(false);
    await store.recordObservation(sighting());
    await store.recordObservation(
        sighting({
            observedAt: '2026-10-27T11:00:00Z',
            wearerId: FRIEND,
            displayName: 'Old',
            source: 'photon'
        })
    );
    await store.recordObservation(
        sighting({
            observedAt: '2026-10-27T12:00:00Z',
            wearerId: FRIEND,
            displayName: 'New',
            source: 'photon'
        })
    );
    await store.recordObservation(
        sighting({
            observedAt: '2026-10-27T11:00:00Z',
            wearerId: FRIEND,
            displayName: 'Old',
            source: 'photon'
        })
    );
    expect(store.entries[0].firstWearerId).toBeNull();
    expect(store.entries[0].wearers).toEqual([
        {
            userId: FRIEND,
            displayName: 'New',
            firstSeenAt: '2026-10-27T11:00:00.000Z',
            lastSeenAt: '2026-10-27T12:00:00.000Z'
        }
    ]);
    expect((await foundAvatars.getFoundAvatars(A))[0].wearers).toEqual(
        store.entries[0].wearers
    );
});

it('imports original log times idempotently without bulk searches and enriches only discovered IDs', async () => {
    const store = await start();
    AppApi.GetFoundAvatarLogData.mockResolvedValue(
        JSON.stringify({
            observations: [
                {
                    avatarId: ID,
                    firstSeenAt: '2026-10-20T10:00:00Z',
                    lastSeenAt: '2026-10-21T10:00:00Z'
                }
            ],
            filesRead: 2,
            filesSkipped: 1,
            errors: 0
        })
    );
    cache.getCachedAvatarById.mockImplementation(async (id) => ({
        id,
        name: 'Cached avatar'
    }));
    await store.importHistory();
    await store.importHistory();
    expect(store.entries).toHaveLength(1);
    expect(store.entries[0]).toMatchObject({
        firstSeenAt: '2026-10-20T10:00:00.000Z',
        lastSeenAt: '2026-10-21T10:00:00.000Z',
        metadata: { name: 'Cached avatar' },
        wearers: []
    });
    expect(store.importState.status).toBe('complete');
    expect(remote.lookupAvatars).not.toHaveBeenCalled();
});

it('adopts log provenance when worn history was imported before a reliable discovery timestamp', async () => {
    const store = await start();
    cache.getFoundAvatarHistory.mockResolvedValue([
        { avatarId: ID, lastSeenAt: '2026-10-20T10:00:00Z' }
    ]);
    AppApi.GetFoundAvatarLogData.mockResolvedValue(
        JSON.stringify({
            observations: [
                {
                    avatarId: ID,
                    firstSeenAt: '2026-10-17T10:00:00Z',
                    lastSeenAt: '2026-10-18T10:00:00Z'
                }
            ],
            errors: 0
        })
    );
    await store.importHistory();
    await store.importHistory();
    expect(store.entries[0]).toMatchObject({
        firstSeenAt: '2026-10-17T10:00:00.000Z',
        source: 'log',
        firstWearerId: null
    });
    expect((await foundAvatars.getFoundAvatars(A))[0].source).toBe('log');
});

it('imports worn history as last-use evidence without inventing first discovery time', async () => {
    const store = await start();
    cache.getFoundAvatarHistory.mockResolvedValue([
        { avatarId: ID, lastSeenAt: '2026-10-20T10:00:00Z' }
    ]);
    await store.importHistory();
    expect(store.entries[0]).toMatchObject({
        firstSeenAt: null,
        firstWearerId: null,
        lastSeenAt: '2026-10-20T10:00:00.000Z'
    });
    expect(store.entries[0].wearers[0]).toMatchObject({
        userId: A,
        firstSeenAt: null,
        lastSeenAt: '2026-10-20T10:00:00.000Z'
    });
});

it('automatically searches only confirmed friends and deduplicates repeated sightings', async () => {
    const store = await start();
    friends.friends.set(FRIEND, {});
    await store.recordObservation(sighting());
    await store.recordObservation(
        sighting({ avatarId: ID2, wearerId: B, source: 'photon' })
    );
    expect(remote.lookupAvatars).not.toHaveBeenCalled();
    await store.recordObservation(
        sighting({ wearerId: FRIEND, source: 'photon' })
    );
    await flushPromises();
    expect(remote.lookupAvatars).toHaveBeenCalledTimes(1);
    expect(store.entries.find((row) => row.id === ID).lookupState).toBe(
        'found'
    );
    await store.recordObservation(
        sighting({ wearerId: FRIEND, source: 'photon' })
    );
    await vi.advanceTimersByTimeAsync(5000);
    expect(remote.lookupAvatars).toHaveBeenCalledTimes(1);
});

it('rechecks friendship and toggle before a queued lookup executes', async () => {
    const store = await start();
    friends.friends.set(FRIEND, {});
    await store.recordObservation(
        sighting({ wearerId: FRIEND, source: 'photon' })
    );
    await flushPromises();
    await store.recordObservation(
        sighting({ avatarId: ID2, wearerId: FRIEND, source: 'photon' })
    );
    friends.friends.delete(FRIEND);
    await vi.advanceTimersByTimeAsync(2500);
    expect(remote.lookupAvatars).toHaveBeenCalledTimes(1);
    friends.friends.set(FRIEND, {});
    await store.setAutoLookupFriends(false);
    await store.recordObservation(
        sighting({ avatarId: ID2, wearerId: FRIEND, source: 'photon' })
    );
    await vi.advanceTimersByTimeAsync(2500);
    expect(remote.lookupAvatars).toHaveBeenCalledTimes(1);
});

it('manual lookup accepts only the exact ID and distinguishes failed providers from no match', async () => {
    const store = await start();
    await store.recordObservation(sighting());
    remote.lookupAvatars.mockImplementation(async (_type, _id, options) => {
        options.onState({
            attemptedProviders: ['avtrdb'],
            failedProviders: []
        });
        return new Map([[ID2, { id: ID2 }]]);
    });
    await store.lookupAvatar(ID);
    expect(store.entries[0].lookupState).toBe('not_found');
    remote.lookupAvatars.mockImplementation(async (_type, _id, options) => {
        options.onState({
            attemptedProviders: ['avtrdb', 'avtricu'],
            failedProviders: ['avtricu']
        });
        return new Map();
    });
    const next = store.lookupAvatar(ID);
    await vi.advanceTimersByTimeAsync(2100);
    await next;
    expect(store.entries[0].lookupState).toBe('unavailable');
});

it('honors official 429 cooldown and ignores late results after account changes', async () => {
    const store = await start();
    await store.recordObservation(sighting());
    remote.lookupAvatars.mockRejectedValue({ status: 429, retryAfter: '120' });
    await store.lookupAvatar(ID);
    expect(store.entries[0].lookupState).toBe('unavailable');
    await store.lookupAvatar(ID);
    expect(remote.lookupAvatars).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(120000);
    let resolve;
    remote.lookupAvatars.mockImplementation(
        () =>
            new Promise((r) => {
                resolve = r;
            })
    );
    const pending = store.lookupAvatar(ID);
    await flushPromises();
    user.currentUser.id = B;
    await flushPromises();
    resolve(new Map([[ID, { id: ID, name: 'Late' }]]));
    await pending;
    expect(store.entries).toEqual([]);
    expect(await foundAvatars.getFoundAvatars(B)).toEqual([]);
    expect(
        (await foundAvatars.getFoundAvatars(A))[0].metadata.name
    ).toBeUndefined();
});

it('drops a late historical import on logout', async () => {
    const store = await start();
    let resolve;
    AppApi.GetFoundAvatarLogData.mockImplementation(
        () =>
            new Promise((r) => {
                resolve = r;
            })
    );
    const pending = store.importHistory();
    await flushPromises();
    watchState.isLoggedIn = false;
    resolve(
        JSON.stringify({
            observations: [
                {
                    avatarId: ID,
                    firstSeenAt: '2026-10-20T10:00:00Z',
                    lastSeenAt: '2026-10-20T10:00:00Z'
                }
            ],
            errors: 0
        })
    );
    await pending;
    expect(store.entries).toEqual([]);
    expect(await foundAvatars.getFoundAvatars(A)).toEqual([]);
});

it('does not search automatically before friends load or when provider integration is disabled', async () => {
    const store = await start();
    friends.friends.set(FRIEND, {});
    watchState.isFriendsLoaded = false;
    await store.recordObservation(
        sighting({ wearerId: FRIEND, source: 'photon' })
    );
    await flushPromises();
    expect(remote.lookupAvatars).not.toHaveBeenCalled();
    watchState.isFriendsLoaded = true;
    settings.avatarRemoteDatabase = false;
    await store.lookupAvatar(ID);
    expect(store.entries[0].lookupState).toBe('disabled');
    expect(remote.lookupAvatars).not.toHaveBeenCalled();
});

it('ignores an in-flight automatic result after disabling the saved toggle', async () => {
    const store = await start();
    friends.friends.set(FRIEND, {});
    let resolve;
    remote.lookupAvatars.mockImplementation(
        () =>
            new Promise((r) => {
                resolve = r;
            })
    );
    await store.recordObservation(
        sighting({ wearerId: FRIEND, source: 'photon' })
    );
    await flushPromises();
    await store.setAutoLookupFriends(false);
    resolve(new Map([[ID, { id: ID, name: 'Late' }]]));
    await flushPromises();
    expect(store.entries[0]).toMatchObject({
        lookupState: 'not_searched',
        metadata: {}
    });
    store.$dispose();
    pinia = createPinia();
    setActivePinia(pinia);
    expect((await start()).autoLookupFriends).toBe(false);
});

it('an older ID-only observation corrects first discovery without erasing known wearer history', async () => {
    const store = await start();
    await store.setAutoLookupFriends(false);
    await store.recordObservation(
        sighting({ wearerId: FRIEND, source: 'photon' })
    );
    await store.recordObservation(
        sighting({ observedAt: '2026-10-20T10:00:00Z' })
    );
    expect(store.entries[0]).toMatchObject({
        firstSeenAt: '2026-10-20T10:00:00.000Z',
        firstWearerId: null,
        source: 'log'
    });
    expect(store.entries[0].wearers[0].userId).toBe(FRIEND);
});

it('preserves saved metadata when a refresh fails and labels partial search results', async () => {
    const store = await start();
    await store.recordObservation(sighting({ metadata: { name: 'Saved' } }));
    remote.lookupAvatars.mockRejectedValue(new Error('offline'));
    await store.lookupAvatar(ID);
    expect(store.entries[0]).toMatchObject({
        metadata: { name: 'Saved' },
        lookupState: 'unavailable'
    });
    remote.lookupAvatars.mockImplementation(async (_type, _id, options) => {
        options.onState({
            attemptedProviders: ['avtrdb', 'avtricu'],
            failedProviders: ['avtricu']
        });
        return new Map([[ID, { id: ID, name: 'Updated' }]]);
    });
    const pending = store.lookupAvatar(ID);
    await vi.advanceTimersByTimeAsync(2100);
    await pending;
    expect(store.entries[0]).toMatchObject({
        metadata: { name: 'Updated' },
        lookupState: 'partial'
    });
});
