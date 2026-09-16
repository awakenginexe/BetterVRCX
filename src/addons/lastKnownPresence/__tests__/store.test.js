import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('../../../services/config', () => ({
    default: { getBool: vi.fn(), setBool: vi.fn() }
}));
import configRepository from '../../../services/config';
import { useLastKnownPresenceStore } from '../store';

const tag = 'wrld_a:4582~friends(usr_owner)~region(jp)';
const otherTag = 'wrld_c:99~private(usr_owner)';
const hidden = {
    id: 'usr_friend',
    status: 'ask me',
    state: 'online',
    location: 'private'
};
const location = {
    location: tag,
    name: 'Rooftop',
    playerList: new Map(),
    friendList: new Map()
};
let store;

beforeEach(async () => {
    vi.useRealTimers();
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    configRepository.getBool.mockReset().mockResolvedValue(false);
    configRepository.setBool.mockReset().mockResolvedValue(undefined);
    setActivePinia(createPinia());
    store = useLastKnownPresenceStore();
    await store.init();
});

function join(user = hidden, loc = location, observedAt = 2000) {
    store.playerJoined(user, loc, { isFriend: true, observedAt });
}
function visible(observedAt = 2000) {
    const user = { ...hidden, status: 'active', location: tag };
    store.onUserUpdate(undefined, user, {
        isFriend: true,
        worldName: 'Rooftop',
        observedAt
    });
    return user;
}

describe('session privacy boundary', () => {
    it('defaults OFF and refuses both capture sources', () => {
        join();
        const user = visible();
        store.onUserUpdate(user, hidden, { isFriend: true, observedAt: 3000 });
        store.leaveLocation(location, new Map([[hidden.id, hidden]]), 4000);
        expect(store.enabled).toBe(false);
        expect(store.observations.size).toBe(0);
        expect(configRepository.getBool).toHaveBeenCalledWith(
            'BetterVRCX_lastKnownPresenceEnabled',
            false
        );
    });

    it('persists only the boolean and clears synchronously when disabled', () => {
        store.setEnabled(true);
        join();
        expect(store.observations.size).toBe(1);
        store.setEnabled(false);
        expect(store.observations.size).toBe(0);
        store.setEnabled(true);
        expect(store.observations.size).toBe(0);
        expect(configRepository.setBool.mock.calls).toEqual([
            ['BetterVRCX_lastKnownPresenceEnabled', true],
            ['BetterVRCX_lastKnownPresenceEnabled', false],
            ['BetterVRCX_lastKnownPresenceEnabled', true]
        ]);
    });

    it('restarting restores enabled preference but no observations', async () => {
        store.setEnabled(true);
        join();
        configRepository.getBool.mockResolvedValue(true);
        setActivePinia(createPinia());
        const restarted = useLastKnownPresenceStore();
        await restarted.init();
        expect(restarted.enabled).toBe(true);
        expect(restarted.observations.size).toBe(0);
    });

    it('does not reconstruct from old player lists or pre-enable API truth', () => {
        store.setEnabled(true);
        const oldLocation = {
            ...location,
            friendList: new Map([[hidden.id, { userId: hidden.id }]])
        };
        store.leaveLocation(oldLocation, new Map([[hidden.id, hidden]]), 3000);
        store.onUserUpdate({ ...hidden, location: tag }, hidden, {
            isFriend: true,
            observedAt: 3000
        });
        expect(store.observations.size).toBe(0);
    });

    it('ignores queued game-log observations from before enable', () => {
        store.setEnabled(true);
        join(hidden, location, 999);
        expect(store.observations.size).toBe(0);
    });

    it('late preference loading cannot re-enable after a user disables', async () => {
        let resolve;
        configRepository.getBool.mockReturnValue(
            new Promise((r) => {
                resolve = r;
            })
        );
        setActivePinia(createPinia());
        const pending = useLastKnownPresenceStore();
        const ready = pending.init();
        pending.setEnabled(false);
        resolve(true);
        await ready;
        expect(pending.enabled).toBe(false);
    });
});

describe('local co-presence', () => {
    beforeEach(() => store.setEnabled(true));

    it.each(['ask me', 'busy'])(
        'captures exact instance for %s without mutating API truth',
        (status) => {
            const user = Object.freeze({
                ...hidden,
                status,
                worldId: 'private',
                instanceId: 'private',
                travelingToLocation: '',
                $location: Object.freeze({ tag: 'private' })
            });
            join(user);
            expect(store.observations.get(user.id)).toEqual({
                userId: user.id,
                worldId: 'wrld_a',
                worldName: 'Rooftop',
                instanceId: '4582~friends(usr_owner)~region(jp)',
                locationTag: tag,
                observedAt: 2000,
                status,
                source: 'local_presence'
            });
            expect(user.location).toBe('private');
            expect(user.$location.tag).toBe('private');
        }
    );

    it('snapshots at our departure time, not their join time', () => {
        join();
        store.leaveLocation(location, new Map([[hidden.id, hidden]]), 46000);
        expect(store.observations.get(hidden.id).observedAt).toBe(46000);
    });

    it('actual friend departure removes observation and prevents later snapshot', () => {
        join();
        store.playerLeft(hidden.id, tag);
        expect(store.observations.size).toBe(0);
        store.leaveLocation(location, new Map([[hidden.id, hidden]]), 46000);
        expect(store.observations.size).toBe(0);
    });

    it('meeting again overwrites rather than accumulating locations', () => {
        join();
        join(hidden, { ...location, location: otherTag, name: 'Shrine' }, 3000);
        expect(store.observations.size).toBe(1);
        expect(store.observations.get(hidden.id).locationTag).toBe(otherTag);
        store.playerLeft(hidden.id, tag);
        expect(store.observations.get(hidden.id).locationTag).toBe(otherTag);
    });

    it('ignores strangers and normal visible friends', () => {
        store.playerJoined(hidden, location, {
            isFriend: false,
            observedAt: 2000
        });
        join({ ...hidden, status: 'active', location: tag });
        expect(store.observations.size).toBe(0);
    });

    it('an older delayed join cannot replace newer co-presence', () => {
        join(hidden, { ...location, location: otherTag }, 4000);
        join(hidden, location, 2000);
        expect(store.observations.get(hidden.id).locationTag).toBe(otherTag);
        expect(store.observations.get(hidden.id).observedAt).toBe(4000);
    });
});

describe('API truth and invalidation', () => {
    beforeEach(() => store.setEnabled(true));

    it.each(['ask me', 'busy'])(
        'captures last real API location before %s hides it',
        (status) => {
            const user = Object.freeze(visible());
            const patch = Object.freeze({
                id: hidden.id,
                status,
                location: 'private'
            });
            store.onUserUpdate(user, patch, {
                isFriend: true,
                observedAt: 3000
            });
            expect(store.observations.get(hidden.id)).toMatchObject({
                locationTag: tag,
                worldName: 'Rooftop',
                observedAt: 2000,
                source: 'last_visible_api',
                status
            });
            expect(user.location).toBe(tag);
            expect(patch.location).toBe('private');
        }
    );

    it.each(['status-first', 'location-first'])(
        'handles separate websocket patches: %s',
        (order) => {
            const user = visible();
            const patches =
                order === 'status-first'
                    ? [{ status: 'busy' }, { location: 'private' }]
                    : [{ location: 'private' }, { status: 'busy' }];
            for (const patch of patches) {
                store.onUserUpdate(
                    user,
                    { id: user.id, ...patch },
                    { isFriend: true, observedAt: 3000 }
                );
                Object.assign(user, patch);
            }
            expect(store.observations.get(hidden.id)).toMatchObject({
                locationTag: tag,
                status: 'busy'
            });
        }
    );

    it.each(['active', 'offline'])(
        'immediately clears %s and does not recreate at our departure',
        (state) => {
            join();
            store.onUserUpdate(
                hidden,
                { id: hidden.id, state },
                { isFriend: true, observedAt: 3000 }
            );
            store.leaveLocation(
                location,
                new Map([[hidden.id, hidden]]),
                46000
            );
            expect(store.observations.size).toBe(0);
        }
    );

    it('a new real location wins even if status is still hidden', () => {
        join();
        store.onUserUpdate(
            hidden,
            { id: hidden.id, location: otherTag },
            { isFriend: true, observedAt: 3000 }
        );
        expect(store.observations.size).toBe(0);
    });

    it('normal visible status removes stale hints', () => {
        join();
        store.onUserUpdate(
            hidden,
            { id: hidden.id, status: 'join me', location: tag },
            { isFriend: true, observedAt: 3000 }
        );
        expect(store.observations.size).toBe(0);
    });

    it('unfriend and session clear remove every candidate too', () => {
        visible();
        join();
        store.invalidate(hidden.id);
        store.onUserUpdate(hidden, hidden, {
            isFriend: false,
            observedAt: 3000
        });
        store.leaveLocation(location, new Map([[hidden.id, hidden]]), 46000);
        expect(store.observations.size).toBe(0);
        join();
        store.clear();
        expect(store.observations.size).toBe(0);
    });

    it('never captures traveling destinations as last-seen locations', () => {
        const user = visible();
        store.onUserUpdate(
            user,
            {
                id: user.id,
                location: 'traveling',
                travelingToLocation: otherTag
            },
            { isFriend: true, observedAt: 3000 }
        );
        store.onUserUpdate({ ...user, location: 'traveling' }, hidden, {
            isFriend: true,
            observedAt: 4000
        });
        expect(store.observations.size).toBe(0);
    });

    it('older API hint never replaces newer physical observation', () => {
        const user = visible();
        join(hidden, { ...location, location: otherTag }, 4000);
        store.onUserUpdate(user, hidden, { isFriend: true, observedAt: 5000 });
        expect(store.observations.get(hidden.id).locationTag).toBe(otherTag);
    });

    it('a new uncached world never inherits the previous world name', () => {
        const user = visible();
        store.onUserUpdate(
            user,
            { id: user.id, location: otherTag },
            { isFriend: true, observedAt: 3000 }
        );
        store.onUserUpdate({ ...user, location: otherTag }, hidden, {
            isFriend: true,
            observedAt: 4000
        });
        expect(store.observations.get(hidden.id)).toMatchObject({
            worldId: 'wrld_c',
            worldName: 'wrld_c'
        });
    });
});
