import { ref, watch } from 'vue';
import { defineStore } from 'pinia';
import inventoryRequest from '../api/inventory';
import configRepository from '../services/config';
import { useNotificationsSettingsStore } from './settings/notifications';
import { useUserStore } from './user';
import { watchState } from '../services/watchState';

export const useInventoryBundleStore = defineStore('InventoryBundle', () => {
    const settings = useNotificationsSettingsStore();
    const userStore = useUserStore();
    const inventoryBundleDialog = ref({ visible: false, bundles: [] });
    const isLoading = ref(false);
    const error = ref(false);
    const unavailableInventoryIds = ref(new Set());
    let shownIds = new Set();
    let stateLoaded = false;
    let stateLoad = null;
    let generation = 0;
    let pending = null;
    let lastCheck = -Infinity;

    async function loadBundleState() {
        if (!watchState.isLoggedIn || !userStore.currentUser.id || stateLoaded)
            return;
        if (stateLoad) return stateLoad;
        const accountIds = shownIds;
        stateLoad = (async () => {
            const saved = await configRepository.getObject(
                `VRCX_inventoryBundleState_${userStore.currentUser.id}`,
                {}
            );
            if (accountIds !== shownIds) return;
            for (const [key, ids] of [
                ['shownIds', shownIds],
                ['unavailableIds', unavailableInventoryIds.value]
            ]) {
                if (!Array.isArray(saved?.[key])) continue;
                for (const id of saved[key]) {
                    if (typeof id === 'string' && id) ids.add(id);
                }
            }
            stateLoaded = true;
        })();
        const loading = stateLoad;
        try {
            await loading;
        } finally {
            if (stateLoad === loading) stateLoad = null;
        }
    }

    async function saveBundleState() {
        const requestGeneration = generation;
        try {
            await configRepository.setObject(
                `VRCX_inventoryBundleState_${userStore.currentUser.id}`,
                {
                    shownIds: [...shownIds],
                    unavailableIds: [...unavailableInventoryIds.value]
                }
            );
        } catch (err) {
            if (requestGeneration === generation) error.value = true;
            console.error('Failed to save inventory bundle state:', err);
        }
    }

    async function markInventoryBundleUnavailable(inventoryId) {
        const accountIds = shownIds;
        await loadBundleState();
        if (accountIds !== shownIds || !watchState.isLoggedIn) return;
        unavailableInventoryIds.value.add(inventoryId);
        shownIds.add(inventoryId);
        const dialog = inventoryBundleDialog.value;
        dialog.bundles = dialog.bundles.filter(
            (item) => item.id !== inventoryId
        );
        if (!dialog.bundles.length) dialog.visible = false;
        await saveBundleState();
    }

    async function retryUnavailableBundles() {
        const accountIds = shownIds;
        await loadBundleState();
        if (accountIds !== shownIds || !watchState.isLoggedIn) return;
        unavailableInventoryIds.value.clear();
        await saveBundleState();
    }

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
                await loadBundleState();
                if (requestGeneration !== generation) return;
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
                        shownIds.has(item.id) ||
                        unavailableInventoryIds.value.has(item.id)
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
                await saveBundleState();
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
            shownIds = new Set();
            unavailableInventoryIds.value = new Set();
            stateLoaded = false;
            stateLoad = null;
            if (!settings.inventoryBundleNotifications) {
                loadBundleState().catch((err) => {
                    console.error(
                        'Failed to load inventory bundle state:',
                        err
                    );
                });
            }
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

    return {
        inventoryBundleDialog,
        unavailableInventoryIds,
        isLoading,
        error,
        loadBundleState,
        markInventoryBundleUnavailable,
        retryUnavailableBundles,
        checkInventoryBundles
    };
});
