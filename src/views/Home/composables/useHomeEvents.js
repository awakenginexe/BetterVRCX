import { ref } from 'vue';
import dayjs from 'dayjs';
import groupRequest from '../../../api/group';
import { getGroupName } from '../../../shared/utils/group';
import { formatDateFilter } from '../../../coordinators/dateCoordinator';
import { homeBackgroundState } from '../../../addons/homeBackground/homeBackgroundStore';

export function useHomeEvents() {
    const events = ref([]);
    const isLoading = ref(false);
    const hasLoaded = ref(false);
    const error = ref(null);

    async function fetchEvents() {
        isLoading.value = true;
        error.value = null;
        try {
            const now = new Date();
            const currentMonthIso = dayjs(now).format('YYYY-MM-DDTHH:mm:ss[Z]');
            const nextMonthIso = dayjs(now)
                .add(1, 'month')
                .startOf('month')
                .format('YYYY-MM-DDTHH:mm:ss[Z]');

            const [groupRes, followingRes, nextMonthGroupRes] =
                await Promise.allSettled([
                    groupRequest.getGroupCalendars({ n: 100, date: currentMonthIso }),
                    groupRequest.getFollowingGroupCalendars({ n: 100, date: currentMonthIso }),
                    groupRequest.getGroupCalendars({ n: 100, date: nextMonthIso })
                ]);

            const allRaw = [];
            if (groupRes.status === 'fulfilled' && Array.isArray(groupRes.value)) {
                allRaw.push(...groupRes.value);
            }
            if (followingRes.status === 'fulfilled' && Array.isArray(followingRes.value)) {
                allRaw.push(...followingRes.value);
            }
            if (nextMonthGroupRes.status === 'fulfilled' && Array.isArray(nextMonthGroupRes.value)) {
                allRaw.push(...nextMonthGroupRes.value);
            }

            const uniqueMap = new Map();
            for (const evt of allRaw) {
                if (evt && evt.id && !uniqueMap.has(evt.id)) {
                    uniqueMap.set(evt.id, evt);
                }
            }

            const daysAhead = Number(homeBackgroundState?.eventsDaysAhead ?? 7);

            const upcoming = Array.from(uniqueMap.values()).filter((evt) => {
                if (!evt || !evt.startsAt) return false;
                const start = dayjs(evt.startsAt);
                const end = evt.endsAt
                    ? dayjs(evt.endsAt)
                    : start.add(2, 'hour');

                if (!end.isAfter(dayjs())) return false;

                if (daysAhead > 0) {
                    const maxDate = dayjs().add(daysAhead, 'day').endOf('day');
                    if (start.isAfter(maxDate)) return false;
                }

                return true;
            });

            upcoming.sort((a, b) => dayjs(a.startsAt).diff(dayjs(b.startsAt)));

            const topEvents = upcoming.slice(0, 10);
            const mapped = await Promise.all(
                topEvents.map(async (evt) => {
                    const groupId = evt.ownerId || evt.groupId;
                    let groupName = '';
                    if (groupId) {
                        try {
                            groupName = await getGroupName(groupId);
                        } catch {
                            // ignore error
                        }
                    }
                    return {
                        id: evt.id,
                        name: evt.title || evt.name || 'Untitled Event',
                        description: evt.description || '',
                        groupId,
                        groupName: groupName || 'VRChat Group',
                        startsAt: evt.startsAt,
                        endsAt: evt.endsAt,
                        formattedTime: evt.startsAt
                            ? formatDateFilter(evt.startsAt, 'long')
                            : '',
                        imageUrl: evt.imageUrl || evt.image_url || null,
                        location: evt.location || evt.worldId || null
                    };
                })
            );

            events.value = mapped;
            hasLoaded.value = true;
        } catch (err) {
            console.warn('Could not load upcoming events:', err);
            error.value = err;
            hasLoaded.value = true;
        } finally {
            isLoading.value = false;
        }
    }

    return {
        events,
        isLoading,
        hasLoaded,
        error,
        fetchEvents
    };
}
