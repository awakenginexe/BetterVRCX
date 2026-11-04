import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
    account: { id: 'usr_self' },
    snapshots: new Map(),
    friends: new Map(),
    feed: [],
    loggedIn: true,
    database: {
        getUserProfile: vi.fn(),
        setUserProfile: vi.fn(),
        addBioToDatabase: vi.fn()
    }
}));
vi.mock('../../services/database', () => ({ database: mocks.database }));
vi.mock('../../stores/user', () => ({
    useUserStore: () => ({ currentUser: mocks.account })
}));
vi.mock('../../stores/friend', () => ({
    useFriendStore: () => ({ friends: mocks.friends })
}));
vi.mock('../../stores/feed', () => ({
    useFeedStore: () => ({ addFeedEntry: (entry) => mocks.feed.push(entry) })
}));
vi.mock('../../stores/sharedFeed', () => ({
    useSharedFeedStore: () => ({ addEntry: vi.fn() })
}));
vi.mock('../../stores/notification', () => ({
    useNotificationStore: () => ({ queueFeedNoty: vi.fn() })
}));
vi.mock('../../services/watchState', () => ({
    watchState: {
        get isLoggedIn() {
            return mocks.loggedIn;
        }
    }
}));
import { recordUserProfile } from '../profileHistoryCoordinator';

beforeEach(() => {
    mocks.account = { id: 'usr_self' };
    mocks.loggedIn = true;
    mocks.snapshots.clear();
    mocks.friends.clear();
    mocks.feed = [];
    mocks.friends.set('usr_friend', { ref: { displayName: 'Friend' } });
    mocks.database.getUserProfile.mockImplementation(async (id) =>
        mocks.snapshots.get(id)
    );
    mocks.database.setUserProfile.mockImplementation(async (profile) =>
        mocks.snapshots.set(profile.id, structuredClone(profile))
    );
    mocks.database.addBioToDatabase.mockImplementation(async (entry) => ({
        ...entry,
        rowId: 1
    }));
});

describe('profile history', () => {
    it('seeds the first observed profile silently and records link removal with an unchanged bio', async () => {
        await recordUserProfile(
            { bio: 'Hello', bioLinks: ['https://example.com'] },
            'usr_friend'
        );
        expect(mocks.feed).toHaveLength(0);
        await recordUserProfile({ bio: 'Hello', bioLinks: [] }, 'usr_friend');
        expect(mocks.feed).toEqual([
            expect.objectContaining({
                type: 'Bio',
                bio: 'Hello',
                previousBio: 'Hello',
                bioLinks: [],
                previousBioLinks: ['https://example.com']
            })
        ]);
    });
    it('records cleared text and ignores an identical profile', async () => {
        await recordUserProfile({ bio: 'Hello', bioLinks: [] }, 'usr_friend');
        await recordUserProfile({ bio: '', bioLinks: [] }, 'usr_friend');
        await recordUserProfile({ bio: '', bioLinks: [] }, 'usr_friend');
        expect(mocks.feed).toHaveLength(1);
        expect(mocks.feed[0]).toMatchObject({ bio: '', previousBio: 'Hello' });
    });
    it('does not record incomplete payloads or non-friend profiles', async () => {
        await recordUserProfile({ bio: 'Hello' }, 'usr_friend');
        await recordUserProfile({ bio: 'Hello', bioLinks: [] }, 'usr_visitor');
        expect(mocks.snapshots.size).toBe(0);
    });
    it('discards a snapshot read that completes after the account changes', async () => {
        let complete;
        mocks.database.getUserProfile.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    complete = resolve;
                })
        );
        const pending = recordUserProfile(
            { bio: 'Hello', bioLinks: [] },
            'usr_friend'
        );
        await vi.waitFor(() => expect(complete).toBeTypeOf('function'));
        mocks.account = { id: 'usr_other' };
        complete(undefined);
        await pending;
        expect(mocks.snapshots.size).toBe(0);
        expect(mocks.feed).toHaveLength(0);
    });
});
