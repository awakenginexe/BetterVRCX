import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const mocks = vi.hoisted(() => ({
    configRepository: {
        getString: vi.fn(),
        getBool: vi.fn(),
        setString: vi.fn(),
        setBool: vi.fn()
    }
}));

vi.mock('../../services/database', () => ({
    database: {}
}));

vi.mock('../../services/config', () => ({
    default: mocks.configRepository
}));

vi.mock('../../services/watchState', () => ({
    watchState: {
        isLoggedIn: false,
        isFavoritesLoaded: false
    }
}));

vi.mock('../friend', () => ({
    useFriendStore: () => ({
        localFavoriteFriends: new Set()
    })
}));

vi.mock('../vrcx', () => ({
    useVrcxStore: () => ({
        maxTableSize: 500,
        searchLimit: 5000
    })
}));

import { useFeedStore } from '../feed';

describe('useFeedStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        mocks.configRepository.getString.mockResolvedValue('[]');
        mocks.configRepository.getBool.mockResolvedValue(false);
    });

    test('assigns unique discriminators to duplicate live entries', () => {
        const store = useFeedStore();
        const liveEntry = {
            type: 'Online',
            created_at: '2026-03-01T00:00:00.000Z',
            userId: 'usr_123',
            location: 'wrld_abc',
            message: 'hello'
        };

        store.addFeedEntry({ ...liveEntry });
        store.addFeedEntry({ ...liveEntry });

        const discriminators = store.feedTableData.map(
            (entry) => entry._feedEntryId
        );

        expect(discriminators).toEqual([2, 1]);
        expect(new Set(discriminators).size).toBe(2);
    });
});
