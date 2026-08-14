import { ref } from 'vue';
import groupRequest from '../../../api/group';

export function useHomeEvents() {
    const events = ref([]);
    const isLoading = ref(false);
    const hasLoaded = ref(false);
    const error = ref(null);

    async function fetchEvents() {
        isLoading.value = true;
        error.value = null;
        try {
            const res = await groupRequest.getFollowingGroupCalendars({ n: 10 });
            if (Array.isArray(res)) {
                events.value = res.map((evt) => ({
                    id: evt.id,
                    name: evt.name || evt.title || 'Untitled Event',
                    description: evt.description || '',
                    groupId: evt.groupId,
                    groupName: evt.groupName || 'VRChat Group',
                    startTime: evt.startsAt || evt.start_time,
                    imageUrl: evt.imageUrl || evt.image_url || null,
                    location: evt.location || evt.worldId || null
                }));
            }
            hasLoaded.value = true;
        } catch (err) {
            console.warn('Could not load following group calendars:', err);
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
