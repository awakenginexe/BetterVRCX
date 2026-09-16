import { computed, onScopeDispose, ref, watch } from 'vue';
import { useFavoriteStore, useUserStore, useWorldStore } from '../../stores';
import { database } from '../../services/database';
import configRepository from '../../services/config';
import { queryRequest } from '../../api';
import { showWorldDialog } from '../../coordinators/worldCoordinator';
import {
    favoriteWorldEntries,
    updateFavoriteMarkers,
    worldCard
} from './model';

export function useWorldHub() {
    const favoriteStore = useFavoriteStore();
    const worldStore = useWorldStore();
    const userStore = useUserStore();
    const visits = ref([]);
    const markers = ref({});
    const loading = ref(false);
    const failed = ref(false);
    let generation = 0;
    let ready = false;
    let markerKey = '';
    let writeQueue = Promise.resolve();
    const favorites = computed(() =>
        favoriteWorldEntries(
            favoriteStore.favoriteWorlds,
            favoriteStore.localWorldFavorites
        ).map((w) => worldCard(w, worldStore.cachedWorlds))
    );
    const recent = computed(() =>
        visits.value.map((w) => worldCard(w, worldStore.cachedWorlds))
    );
    const library = computed(() => {
        const history = new Map(visits.value.map((w) => [w.worldId, w]));
        return favorites.value
            .map((w) => ({ ...history.get(w.id), ...w }))
            .sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0))
            .slice(0, 24);
    });
    const updated = computed(() =>
        favorites.value.filter((w) => markers.value[w.id]?.updated)
    );
    function persist() {
        const key = markerKey;
        const json = JSON.stringify(markers.value);
        writeQueue = writeQueue
            .catch(() => {})
            .then(() => configRepository.setString(key, json));
        writeQueue.catch(() => {
            failed.value = true;
        });
    }
    function reconcile() {
        if (!ready) return;
        if (updateFavoriteMarkers(markers.value, favorites.value)) persist();
    }
    watch(
        () => favorites.value.map((w) => [w.id, w.version, w.updated_at]),
        reconcile
    );
    async function refresh() {
        if (loading.value || !ready) return;
        const run = generation;
        loading.value = true;
        failed.value = false;
        try {
            const rows = await database.getRecentWorlds(24);
            if (run !== generation) return;
            visits.value = rows;
        } catch {
            if (run === generation) failed.value = true;
        }
        if (run !== generation) return;
        const ids = [
            ...new Set([...recent.value, ...library.value].map((w) => w.id))
        ];
        // Four workers bound enrichment; the existing query layer owns cache and GET dedupe.
        let index = 0;
        const enrich = async () => {
            while (index < ids.length && run === generation) {
                const worldId = ids[index++];
                try {
                    await queryRequest.fetch('world.dialog', { worldId });
                } catch {
                    if (run === generation) failed.value = true;
                }
            }
        };
        await Promise.all(Array.from({ length: 4 }, enrich));
        if (run === generation) {
            reconcile();
            loading.value = false;
        }
    }
    function openWorld(id) {
        if (markers.value[id]?.updated) {
            markers.value[id].updated = false;
            persist();
        }
        showWorldDialog(id);
    }
    watch(
        () => userStore.currentUser?.id,
        async (id) => {
            const run = ++generation;
            ready = false;
            loading.value = false;
            visits.value = [];
            markers.value = {};
            if (!id) return;
            markerKey = `BetterVRCX_worldHubMarkers_${id}`;
            try {
                const saved = JSON.parse(
                    (await configRepository.getString(markerKey, '{}')) || '{}'
                );
                if (run !== generation) return;
                if (saved && typeof saved === 'object' && !Array.isArray(saved))
                    markers.value = saved;
            } catch {
                /* Missing or invalid baseline seeds from known metadata. */
            }
            if (run !== generation) return;
            ready = true;
            reconcile();
            await refresh();
        },
        { immediate: true }
    );
    onScopeDispose(() => {
        generation++;
        ready = false;
    });
    return {
        recent,
        library,
        updated,
        loading,
        failed,
        refresh,
        openWorld
    };
}
