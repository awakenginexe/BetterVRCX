import { beforeEach, describe, expect, test, vi } from 'vitest';
import dayjs from 'dayjs';
import { useHomeEvents } from '../useHomeEvents';

const mockGetGroupCalendars = vi.fn();
const mockGetFollowingGroupCalendars = vi.fn();
const mockGetGroupName = vi.fn();
const mockFormatDateFilter = vi.fn();

vi.mock('../../../../api/group', () => ({
    default: {
        getGroupCalendars: (...args) => mockGetGroupCalendars(...args),
        getFollowingGroupCalendars: (...args) =>
            mockGetFollowingGroupCalendars(...args)
    }
}));

vi.mock('../../../../shared/utils/group', () => ({
    getGroupName: (...args) => mockGetGroupName(...args)
}));

vi.mock('../../../../coordinators/dateCoordinator', () => ({
    formatDateFilter: (...args) => mockFormatDateFilter(...args)
}));

describe('useHomeEvents composable', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetGroupName.mockResolvedValue('Test Group');
        mockFormatDateFilter.mockReturnValue('Formatted Date');
    });

    test('fetches upcoming events from group and following calendars and sorts them chronologically', async () => {
        const futureDate1 = dayjs().add(2, 'day').toISOString();
        const futureDate2 = dayjs().add(5, 'day').toISOString();
        const pastDate = dayjs().subtract(2, 'day').toISOString();

        mockGetGroupCalendars.mockResolvedValueOnce([
            {
                id: 'evt_2',
                title: 'Later Event',
                ownerId: 'grp_1',
                startsAt: futureDate2,
                endsAt: dayjs(futureDate2).add(1, 'hour').toISOString()
            },
            {
                id: 'evt_past',
                title: 'Past Event',
                ownerId: 'grp_1',
                startsAt: pastDate,
                endsAt: dayjs(pastDate).add(1, 'hour').toISOString()
            }
        ]);

        mockGetFollowingGroupCalendars.mockResolvedValueOnce([
            {
                id: 'evt_1',
                title: 'Sooner Event',
                ownerId: 'grp_2',
                startsAt: futureDate1,
                endsAt: dayjs(futureDate1).add(1, 'hour').toISOString()
            }
        ]);

        // Next month mock
        mockGetGroupCalendars.mockResolvedValueOnce([]);

        const { events, isLoading, hasLoaded, fetchEvents } = useHomeEvents();

        expect(isLoading.value).toBe(false);
        expect(hasLoaded.value).toBe(false);

        await fetchEvents();

        expect(isLoading.value).toBe(false);
        expect(hasLoaded.value).toBe(true);
        expect(events.value.length).toBe(2);

        // evt_1 is sooner than evt_2
        expect(events.value[0].id).toBe('evt_1');
        expect(events.value[0].name).toBe('Sooner Event');
        expect(events.value[0].groupName).toBe('Test Group');
        expect(events.value[1].id).toBe('evt_2');
        expect(events.value[1].name).toBe('Later Event');
    });

    test('deduplicates events present in both group and following calendars', async () => {
        const futureDate = dayjs().add(3, 'day').toISOString();
        const eventData = {
            id: 'evt_shared',
            title: 'Shared Event',
            ownerId: 'grp_1',
            startsAt: futureDate,
            endsAt: dayjs(futureDate).add(2, 'hour').toISOString()
        };

        mockGetGroupCalendars.mockResolvedValueOnce([eventData]);
        mockGetFollowingGroupCalendars.mockResolvedValueOnce([eventData]);
        mockGetGroupCalendars.mockResolvedValueOnce([]);

        const { events, fetchEvents } = useHomeEvents();
        await fetchEvents();

        expect(events.value.length).toBe(1);
        expect(events.value[0].id).toBe('evt_shared');
    });

    test('handles errors gracefully without throwing', async () => {
        mockGetGroupCalendars.mockRejectedValueOnce(new Error('Network error'));
        mockGetFollowingGroupCalendars.mockRejectedValueOnce(
            new Error('Network error')
        );
        mockGetGroupCalendars.mockRejectedValueOnce(new Error('Network error'));

        const { events, isLoading, hasLoaded, error, fetchEvents } =
            useHomeEvents();
        await fetchEvents();

        expect(isLoading.value).toBe(false);
        expect(hasLoaded.value).toBe(true);
        expect(events.value).toEqual([]);
    });
});
