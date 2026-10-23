import { ref, watch } from 'vue';
import { defineStore } from 'pinia';
import inventoryRequest from '../api/inventory';
import { useNotificationsSettingsStore } from './settings/notifications';
import { useUserStore } from './user';
import { watchState } from '../services/watchState';

export const useInventoryBundleStore = defineStore('InventoryBundle', () => {
    const settings = useNotificationsSettingsStore();
    const userStore = useUserStore();
    const inventoryBundleDialog = ref({ visible: false, bundles: [] });
    const isLoading = ref(false);
    const error = ref(false);
    const shownIds = new Set();
    let generation = 0;
    let pending = null;
    let lastCheck = -Infinity;

    function invalidate() {
        generation++;
        pending = null;
        isLoading.value = false;
        error.value = false;
        inventoryBundleDialog.value = { visible: false, bundles: [] };
        lastCheck = -Infinity;
    }

    async function checkInventoryBundles() {
        if (
            !watchState.isLoggedIn ||
            !userStore.currentUser.id ||
            !settings.inventoryBundleNotifications
        )
            return;
        if (pending) return pending;
        if (Date.now() - lastCheck < 300_000) return;
        lastCheck = Date.now();
        const requestGeneration = generation;
        isLoading.value = true;
        error.value = false;
        pending = (async () => {
            try {
                // shortcut: notify for the newest 100 bundles; paginate if older inventory needs notifications.
                const { json } = await inventoryRequest.getInventoryItems({
                    n: 100,
                    offset: 0,
                    types: 'bundle',
                    archived: false,
                    order: 'newest'
                });
                if (requestGeneration !== generation) return;
                if (!Array.isArray(json?.data))
                    throw new Error('Invalid inventory bundle response');
                const bundles = [];
                for (const item of json.data) {
                    if (
                        !item ||
                        item.isArchived === true ||
                        typeof item.id !== 'string' ||
                        !item.id ||
                        shownIds.has(item.id)
                    )
                        continue;
                    shownIds.add(item.id);
                    bundles.push(item);
                }
                if (!bundles.length) return;
                const dialog = inventoryBundleDialog.value;
                dialog.bundles = dialog.visible
                    ? [...dialog.bundles, ...bundles]
                    : bundles;
                dialog.visible = true;
            } catch (err) {
                if (requestGeneration === generation) {
                    error.value = true;
                    console.error('Failed to check inventory bundles:', err);
                }
            }
        })();
        try {
            await pending;
        } finally {
            if (requestGeneration === generation) {
                isLoading.value = false;
                pending = null;
            }
        }
    }

    watch(
        () => [watchState.isLoggedIn, userStore.currentUser.id],
        () => {
            invalidate();
            shownIds.clear();
            checkInventoryBundles();
        },
        { flush: 'sync', immediate: true }
    );
    watch(
        () => settings.inventoryBundleNotifications,
        (enabled) => {
            invalidate();
            if (enabled) checkInventoryBundles();
        },
        { flush: 'sync' }
    );

    return { inventoryBundleDialog, isLoading, error, checkInventoryBundles };
});
