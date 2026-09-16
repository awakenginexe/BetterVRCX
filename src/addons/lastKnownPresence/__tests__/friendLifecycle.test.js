import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { reactive, ref } from 'vue';

const dependencies = vi.hoisted(() => ({
    user: {
        userDialog: { visible: false },
        currentUser: { id: 'usr_me' },
        cachedUsers: new Map()
    },
    appearance: { sidebarSortMethods: [], isSidebarGroupByInstance: false },
    location: { lastLocation: { friendList: new Map(), location: '' } }
}));
vi.mock('../../../stores/user', () => ({
    useUserStore: () => dependencies.user
}));
vi.mock('../../../stores/settings/appearance', () => ({
    useAppearanceSettingsStore: () => dependencies.appearance
}));
vi.mock('../../../stores/settings/general', () => ({
    useGeneralSettingsStore: () => ({})
}));
vi.mock('../../../stores/group', () => ({
    useGroupStore: () => ({ clearGroupInstances: vi.fn() })
}));
vi.mock('../../../stores/location', () => ({
    useLocationStore: () => dependencies.location
}));
vi.mock('../../../stores/dashboard', () => ({ useDashboardStore: () => ({}) }));
vi.mock('../../../stores/notification', () => ({
    useNotificationStore: () => ({})
}));
vi.mock('../../../stores/sharedFeed', () => ({
    useSharedFeedStore: () => ({})
}));
vi.mock('../../../stores/ui', () => ({ useUiStore: () => ({}) }));

vi.mock('vue-i18n', async (original) => ({
    ...(await original()),
    useI18n: () => ({ t: (key) => key, locale: ref('en') })
}));
vi.mock('vue-router', async (original) => ({
    ...(await original()),
    useRouter: () => ({ push: vi.fn(), currentRoute: ref({ path: '/' }) })
}));
vi.mock('../../../plugins/router', () => ({
    router: {
        beforeEach: vi.fn(),
        push: vi.fn(),
        replace: vi.fn(),
        currentRoute: ref({ path: '/' })
    },
    initRouter: vi.fn()
}));
vi.mock('../../../plugins/interopApi', () => ({ initInteropApi: vi.fn() }));
vi.mock('../../../services/watchState', () => ({
    watchState: reactive({ isLoggedIn: false, isFriendsLoaded: false })
}));
vi.mock('../../../services/database', () => ({
    database: new Proxy({}, { get: () => vi.fn().mockResolvedValue([]) })
}));
vi.mock('../../../services/config', () => ({
    default: {
        getBool: vi
            .fn()
            .mockImplementation((_k, d) => Promise.resolve(d ?? false)),
        setBool: vi.fn(),
        getString: vi
            .fn()
            .mockImplementation((_k, d) => Promise.resolve(d ?? '{}')),
        setString: vi.fn(),
        getInt: vi.fn().mockImplementation((_k, d) => Promise.resolve(d ?? 0)),
        setInt: vi.fn(),
        getFloat: vi
            .fn()
            .mockImplementation((_k, d) => Promise.resolve(d ?? 0)),
        setFloat: vi.fn(),
        getArray: vi.fn().mockResolvedValue([]),
        setArray: vi.fn(),
        getObject: vi.fn().mockResolvedValue(null),
        remove: vi.fn(),
        init: vi.fn()
    }
}));
vi.mock('../../../coordinators/friendSyncCoordinator', () => ({
    runInitFriendsListFlow: vi.fn()
}));

import { useFriendStore } from '../../../stores/friend';
import { handleFriendDelete } from '../../../coordinators/friendRelationshipCoordinator';
import { useUserStore } from '../../../stores/user';
import { useLastKnownPresenceStore } from '../store';
import { watchState } from '../../../services/watchState';

let presence;
let friends;
const user = {
    id: 'usr_presence_test',
    status: 'busy',
    state: 'online',
    location: 'private'
};

beforeEach(async () => {
    setActivePinia(createPinia());
    friends = useFriendStore();
    presence = useLastKnownPresenceStore();
    await presence.init();
    presence.setEnabled(true);
    friends.friends.set(user.id, { id: user.id, ref: user, state: 'online' });
    presence.playerJoined(
        user,
        { location: 'wrld_a:12', name: 'Rooftop' },
        { isFriend: true }
    );
    expect(presence.observations.size).toBe(1);
});

describe('friend lifecycle', () => {
    it('deleteFriend clears remembered data alongside the friend', () => {
        friends.deleteFriend(user.id);
        expect(friends.friends.has(user.id)).toBe(false);
        expect(presence.observations.size).toBe(0);
    });

    it('unfriend API callback clears observation even when the user dialog is closed', () => {
        useUserStore().userDialog.visible = false;
        handleFriendDelete({ params: { userId: user.id } });
        expect(presence.observations.size).toBe(0);
        expect(friends.friends.has(user.id)).toBe(false);
    });

    it('account/session reset clears RAM without disabling the preference', () => {
        watchState.isLoggedIn = !watchState.isLoggedIn;
        expect(presence.observations.size).toBe(0);
        expect(presence.enabled).toBe(true);
    });
});
