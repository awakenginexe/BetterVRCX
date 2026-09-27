import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    getAvatarName: vi.fn(),
    addFeedEntry: vi.fn(),
    addEntry: vi.fn(),
    queueFeedNoty: vi.fn(),
    addAvatarToDatabase: vi.fn(),
    friends: new Map()
}));

vi.mock('../avatarCoordinator', () => ({
    getAvatarName: (...args) => mocks.getAvatarName(...args)
}));
vi.mock('../../shared/utils', () => ({
    getGroupName: vi.fn(),
    getWorldName: vi.fn(),
    parseLocation: () => ({ tag: '', worldId: '', groupId: '' })
}));
vi.mock('../../services/appConfig', () => ({
    AppDebug: { debugFriendState: false }
}));
vi.mock('../../services/database', () => ({
    database: {
        addAvatarToDatabase: (...args) => mocks.addAvatarToDatabase(...args)
    }
}));
vi.mock('../../stores/feed', () => ({
    useFeedStore: () => ({ addFeedEntry: mocks.addFeedEntry })
}));
vi.mock('../../stores/sharedFeed', () => ({
    useSharedFeedStore: () => ({ addEntry: mocks.addEntry })
}));
vi.mock('../../stores/notification', () => ({
    useNotificationStore: () => ({ queueFeedNoty: mocks.queueFeedNoty })
}));
vi.mock('../../stores/friend', () => ({
    useFriendStore: () => ({ friends: mocks.friends })
}));
vi.mock('../../stores/user', () => ({
    useUserStore: () => ({
        state: { instancePlayerCount: new Map() },
        userDialog: { $location: {} },
        applyUserDialogLocation: vi.fn(),
        checkNote: vi.fn()
    })
}));
vi.mock('../../stores/world', () => ({
    useWorldStore: () => ({ worldDialog: {} })
}));
vi.mock('../../stores/group', () => ({
    useGroupStore: () => ({ groupDialog: {} })
}));
vi.mock('../../stores/instance', () => ({ useInstanceStore: () => ({}) }));
vi.mock('../../stores/settings/general', () => ({
    useGeneralSettingsStore: () => ({ logEmptyAvatars: false })
}));

import { runHandleUserUpdateFlow } from '../userEventCoordinator';

function user(overrides = {}) {
    return {
        id: 'usr_friend',
        displayName: 'Friend',
        iconUrl: 'avatar-new',
        bannerType: 'color',
        ...overrides
    };
}

function avatarInfo(url) {
    return url?.startsWith('avatar-')
        ? { ownerId: 'usr_author', avatarName: url, isAvatarImage: true }
        : { ownerId: '', avatarName: '', isAvatarImage: false };
}

describe('avatar feed user updates', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.friends.clear();
        mocks.friends.set('usr_friend', {});
        mocks.getAvatarName.mockImplementation(async (url) => avatarInfo(url));
    });

    test('emits one verified avatar icon event through feed, notification and database', async () => {
        await runHandleUserUpdateFlow(user(), {
            iconUrl: ['avatar-new', 'avatar-old']
        });

        expect(mocks.addFeedEntry).toHaveBeenCalledOnce();
        expect(mocks.addEntry).toHaveBeenCalledOnce();
        expect(mocks.queueFeedNoty).toHaveBeenCalledOnce();
        expect(mocks.addAvatarToDatabase).toHaveBeenCalledOnce();
        expect(mocks.addFeedEntry.mock.calls[0][0]).toMatchObject({
            type: 'Avatar',
            currentAvatarImageUrl: 'avatar-new',
            previousCurrentAvatarImageUrl: 'avatar-old'
        });
    });

    test('does not call a custom profile icon an avatar', async () => {
        await runHandleUserUpdateFlow(user({ iconUrl: 'custom-icon' }), {
            iconUrl: ['custom-icon', 'avatar-old']
        });
        expect(mocks.addFeedEntry).not.toHaveBeenCalled();
    });

    test('does not duplicate the same avatar transition', async () => {
        const ref = user();
        const props = { iconUrl: ['avatar-new', 'avatar-old'] };
        await runHandleUserUpdateFlow(ref, props);
        await runHandleUserUpdateFlow(ref, props);
        expect(mocks.addFeedEntry).toHaveBeenCalledOnce();
    });

    test('prefers avatar banner and emits once when icon and banner change together', async () => {
        await runHandleUserUpdateFlow(
            user({ bannerType: 'avatarBanner', bannerUrl: 'avatar-banner' }),
            {
                bannerUrl: ['avatar-banner', 'avatar-old'],
                iconUrl: ['avatar-new', 'avatar-older']
            }
        );
        expect(mocks.addFeedEntry).toHaveBeenCalledOnce();
        expect(mocks.addFeedEntry.mock.calls[0][0].currentAvatarImageUrl).toBe(
            'avatar-banner'
        );
    });

    test('falls back to a verified avatar icon when the changed banner is custom', async () => {
        await runHandleUserUpdateFlow(
            user({ bannerType: 'avatarBanner', bannerUrl: 'custom-banner' }),
            {
                bannerUrl: ['custom-banner', 'avatar-old'],
                iconUrl: ['avatar-new', 'avatar-older']
            }
        );
        expect(mocks.addFeedEntry).toHaveBeenCalledOnce();
        expect(mocks.addFeedEntry.mock.calls[0][0].currentAvatarImageUrl).toBe(
            'avatar-new'
        );
    });

    test('still accepts a verified legacy currentAvatarImageUrl change', async () => {
        await runHandleUserUpdateFlow(
            user({ currentAvatarImageUrl: 'avatar-new' }),
            { currentAvatarImageUrl: ['avatar-new', 'avatar-old'] }
        );
        expect(mocks.addFeedEntry).toHaveBeenCalledOnce();
    });

    test('does not let an older asynchronous lookup write over a newer event', async () => {
        let resolveOld;
        let firstOldLookup = true;
        mocks.getAvatarName.mockImplementation((url) => {
            if (url === 'avatar-old-event' && firstOldLookup) {
                firstOldLookup = false;
                return new Promise((resolve) => {
                    resolveOld = resolve;
                });
            }
            return Promise.resolve(avatarInfo(url));
        });
        const ref = user({ iconUrl: 'avatar-old-event' });
        const oldFlow = runHandleUserUpdateFlow(ref, {
            iconUrl: ['avatar-old-event', 'avatar-before']
        });
        ref.iconUrl = 'avatar-new';
        await runHandleUserUpdateFlow(ref, {
            iconUrl: ['avatar-new', 'avatar-old-event']
        });
        resolveOld(avatarInfo('avatar-old-event'));
        await oldFlow;

        expect(mocks.addFeedEntry).toHaveBeenCalledOnce();
        expect(mocks.addFeedEntry.mock.calls[0][0].currentAvatarImageUrl).toBe(
            'avatar-new'
        );
    });

    test('skips incomplete and failed avatar lookups', async () => {
        mocks.getAvatarName.mockRejectedValueOnce(new Error('lookup failed'));
        await runHandleUserUpdateFlow(user(), {
            iconUrl: ['avatar-new', 'avatar-old']
        });
        await runHandleUserUpdateFlow(user(), { iconUrl: ['', 'avatar-old'] });
        expect(mocks.addFeedEntry).not.toHaveBeenCalled();
    });
});
