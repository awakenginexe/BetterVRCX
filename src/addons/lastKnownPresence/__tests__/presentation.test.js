import { describe, expect, it, vi } from 'vitest';
import {
    getPresenceHints,
    groupPresenceHints,
    resolveWorldArtwork
} from '../presentation';

const a = {
    userId: 'usr_a',
    locationTag: 'wrld_a:1~friends(usr_x)',
    worldId: 'wrld_a',
    instanceId: '1~friends(usr_x)',
    worldName: 'Rooftop',
    observedAt: 1000
};
const b = { ...a, userId: 'usr_b' };
const c = { ...a, userId: 'usr_c', locationTag: 'wrld_a:2', instanceId: '2' };
const friends = new Map(
    ['usr_a', 'usr_b', 'usr_c'].map((id) => [
        id,
        {
            id,
            state: 'online',
            ref: { id, status: 'ask me', location: 'private' }
        }
    ])
);
const observations = new Map([a, b, c].map((o) => [o.userId, o]));

describe('historical presentation selection', () => {
    it('groups by exact instance without modifying observations or friend fields', () => {
        const hints = getPresenceHints(true, observations, friends, new Map());
        const groups = groupPresenceHints(hints);
        expect(groups.map((g) => g.observations.map((o) => o.userId))).toEqual([
            ['usr_a', 'usr_b'],
            ['usr_c']
        ]);
        expect(groups[0].locationTag).toBe('wrld_a:1~friends(usr_x)');
        expect(friends.get('usr_a').ref.location).toBe('private');
        expect(observations.size).toBe(3);
    });

    it('disabled never renders retained props or malformed external state', () => {
        expect(
            getPresenceHints(false, observations, friends, new Map())
        ).toEqual([]);
    });

    it('excludes locally present, visible, inactive and no-longer-friend users', () => {
        const changed = new Map(friends);
        changed.set('usr_b', {
            ...friends.get('usr_b'),
            ref: { status: 'busy', location: 'wrld_a:1' }
        });
        changed.set('usr_c', { ...friends.get('usr_c'), state: 'active' });
        expect(
            getPresenceHints(
                true,
                observations,
                changed,
                new Map([['usr_a', {}]])
            )
        ).toEqual([]);
        expect(
            getPresenceHints(true, observations, new Map(), new Map())
        ).toEqual([]);
    });
});

describe('resolveWorldArtwork', () => {
    it('returns thumbnailImageUrl when available, preferring it over imageUrl', () => {
        const store = {
            cachedWorlds: new Map([
                [
                    'wrld_a',
                    {
                        thumbnailImageUrl: 'https://example.com/thumb.png',
                        imageUrl: 'https://example.com/full.png'
                    }
                ]
            ])
        };
        expect(resolveWorldArtwork(store, 'wrld_a')).toBe(
            'https://example.com/thumb.png'
        );
    });

    it('falls back to imageUrl when thumbnailImageUrl is missing', () => {
        const store = {
            cachedWorlds: new Map([
                ['wrld_a', { imageUrl: 'https://example.com/full.png' }]
            ])
        };
        expect(resolveWorldArtwork(store, 'wrld_a')).toBe(
            'https://example.com/full.png'
        );
    });

    it('extracts worldId from locationTag when worldId is not provided', () => {
        const store = {
            cachedWorlds: new Map([
                [
                    'wrld_a',
                    { thumbnailImageUrl: 'https://example.com/thumb.png' }
                ]
            ])
        };
        expect(resolveWorldArtwork(store, null, 'wrld_a:1234~region(us)')).toBe(
            'https://example.com/thumb.png'
        );
    });

    it('triggers queryClient fetch when world is not cached and returns null', () => {
        const store = { cachedWorlds: new Map() };
        const queryClient = {
            fetch: vi.fn().mockReturnValue(Promise.resolve({}))
        };
        const result = resolveWorldArtwork(
            store,
            'wrld_uncached',
            null,
            queryClient
        );
        expect(result).toBeNull();
        expect(queryClient.fetch).toHaveBeenCalledWith('world.dialog', {
            worldId: 'wrld_uncached'
        });
    });

    it('returns null safely without error when world is not cached and queryClient is missing', () => {
        const store = { cachedWorlds: new Map() };
        expect(resolveWorldArtwork(store, 'wrld_uncached')).toBeNull();
    });

    it('returns null when neither worldId nor locationTag is provided', () => {
        const store = { cachedWorlds: new Map() };
        expect(resolveWorldArtwork(store, null, null)).toBeNull();
    });
});
