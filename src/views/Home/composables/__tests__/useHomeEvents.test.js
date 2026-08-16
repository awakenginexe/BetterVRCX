import { beforeEach, describe, expect, test, vi } from 'vitest';
import dayjs from 'dayjs';
import { useHomeEvents } from '../useHomeEvents';
import { homeBackgroundState } from '../../../../addons/homeBackground/homeBackgroundStore';

const mockGetGroupCalendars = vi.fn();
const mockGetFollowingGroupCalendars = vi.fn();
const mockGetFeaturedGroupCalendars = vi.fn();
const mockGetGroupSummary = vi.fn();
const mockFormatDateFilter = vi.fn();
const mockConvertFileUrlToImageUrl = vi.fn();

vi.mock('../../../../api/group', () => ({
    default: {
        getGroupCalendars: (...args) => mockGetGroupCalendars(...args),
        getFollowingGroupCalendars: (...args) =>
            mockGetFollowingGroupCalendars(...args),
        getFeaturedGroupCalendars: (...args) =>
            mockGetFeaturedGroupCalendars(...args)
    }
}));

vi.mock('../../../../shared/utils/group', () => ({
    getGroupSummary: (...args) => mockGetGroupSummary(...args),
    getGroupName: vi.fn().mockResolvedValue('Test Group')
}));

vi.mock('../../../../shared/utils/common', () => ({
    convertFileUrlToImageUrl: (...args) => mockConvertFileUrlToImageUrl(...args)
}));

vi.mock('../../../../coordinators/dateCoordinator', () => ({
    formatDateFilter: (...args) => mockFormatDateFilter(...args)
}));

describe('useHomeEvents composable', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetGroupSummary.mockResolvedValue({
            name: 'Test Group',
            iconUrl: 'https://example.com/icon.png',
            bannerUrl: 'https://example.com/banner.png'
        });
        mockFormatDateFilter.mockReturnValue('Formatted Date');
        mockConvertFileUrlToImageUrl.mockImplementation((url) => url);
        mockGetFeaturedGroupCalendars.mockResolvedValue({ results: [] });
        homeBackgroundState.eventsDaysAhead = 7;
    });

    test('fetches upcoming events from CalendarResponse objects with { results: [] } and sorts them chronologically', async () => {
        const futureDate1 = dayjs().add(2, 'day').toISOString();
        const futureDate2 = dayjs().add(5, 'day').toISOString();
        const pastDate = dayjs().subtract(2, 'day').toISOString();

        mockGetGroupCalendars.mockResolvedValueOnce({
            results: [
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
            ]
        });

        mockGetFollowingGroupCalendars.mockResolvedValueOnce({
            results: [
                {
                    id: 'evt_1',
                    title: 'Sooner Event',
                    ownerId: 'grp_2',
                    startsAt: futureDate1,
                    endsAt: dayjs(futureDate1).add(1, 'hour').toISOString()
                }
            ]
        });

        // Next month mocks
        mockGetGroupCalendars.mockResolvedValueOnce({ results: [] });
        mockGetFollowingGroupCalendars.mockResolvedValueOnce({ results: [] });

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
        expect(events.value[0].groupIconUrl).toBe('https://example.com/icon.png');
        expect(events.value[0].imageUrl).toBe('https://example.com/icon.png');
        expect(events.value[1].id).toBe('evt_2');
        expect(events.value[1].name).toBe('Later Event');
    });

    test('filters events according to eventsDaysAhead setting', async () => {
        homeBackgroundState.eventsDaysAhead = 3;

        const eventIn2Days = dayjs().add(2, 'day').toISOString();
        const eventIn6Days = dayjs().add(6, 'day').toISOString();

        mockGetGroupCalendars.mockResolvedValueOnce({
            results: [
                {
                    id: 'evt_within_3d',
                    title: 'Within 3 Days',
                    ownerId: 'grp_1',
                    startsAt: eventIn2Days,
                    endsAt: dayjs(eventIn2Days).add(1, 'hour').toISOString()
                },
                {
                    id: 'evt_after_6d',
                    title: 'After 6 Days',
                    ownerId: 'grp_1',
                    startsAt: eventIn6Days,
                    endsAt: dayjs(eventIn6Days).add(1, 'hour').toISOString()
                }
            ]
        });
        mockGetFollowingGroupCalendars.mockResolvedValueOnce({ results: [] });
        mockGetGroupCalendars.mockResolvedValueOnce({ results: [] });
        mockGetFollowingGroupCalendars.mockResolvedValueOnce({ results: [] });

        const { events, fetchEvents } = useHomeEvents();
        await fetchEvents();

        expect(events.value.length).toBe(1);
        expect(events.value[0].id).toBe('evt_within_3d');
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

        mockGetGroupCalendars.mockResolvedValueOnce({ results: [eventData] });
        mockGetFollowingGroupCalendars.mockResolvedValueOnce({
            results: [eventData]
        });
        mockGetGroupCalendars.mockResolvedValueOnce({ results: [] });
        mockGetFollowingGroupCalendars.mockResolvedValueOnce({ results: [] });

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
        mockGetFollowingGroupCalendars.mockRejectedValueOnce(
            new Error('Network error')
        );

        const { events, isLoading, hasLoaded, error, fetchEvents } =
            useHomeEvents();
        await fetchEvents();

        expect(isLoading.value).toBe(false);
        expect(hasLoaded.value).toBe(true);
        expect(events.value).toEqual([]);
    });
});
