import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import marketplaceRequest from '../api/marketplace';
import miscRequest from '../api/misc';
import { watchState } from '../services/watchState';
import { useUserStore } from './user';
import { useNotificationsSettingsStore } from './settings/notifications';

const storeIds = ['000', '001', '002'].map(
    (suffix) => `esto_00000000-0000-0000-0000-000000000${suffix}`
);

export const useEconomyStore = defineStore('Economy', () => {
    const userStore = useUserStore();
    const settings = useNotificationsSettingsStore();
    const purchases = ref([]);
    const balance = ref(null);
    const ownershipRevision = ref(0);
    const freeStoreItemDialog = ref({ visible: false, listings: [] });
    const isClaiming = ref(false);
    const claimFailed = ref(false);
    const shownListingIds = new Set();
    const ownedListingIds = computed(
        () => new Set(activePurchases.value.map((item) => item.listingId))
    );
    const ownedProductIds = computed(
        () =>
            new Set(
                activePurchases.value.flatMap((item) =>
                    (item.products ?? []).map((product) => product.id)
                )
            )
    );
    const activePurchases = computed(() =>
        purchases.value.filter(
            (item) =>
                item.purchaseActive && item.buyerId === userStore.currentUser.id
        )
    );
    let generation = 0;
    let pendingRefresh = null;
    let pendingPurchases = null;

    function isCurrent(token, userId) {
        return (
            generation === token &&
            watchState.isLoggedIn &&
            userStore.currentUser.id === userId
        );
    }

    function price(listing) {
        return userStore.isLocalUserVrcPlusSupporter &&
            listing.vrcPlusDiscountPrice != null
            ? listing.vrcPlusDiscountPrice
            : listing.priceTokens;
    }

    function isOwned(listing) {
        return (
            ownedListingIds.value.has(listing.id) ||
            (listing.productIds?.length > 0 &&
                listing.productIds.every((id) => ownedProductIds.value.has(id)))
        );
    }

    function refreshPurchases() {
        if (!watchState.isLoggedIn || !userStore.currentUser.id)
            return Promise.resolve();
        if (pendingPurchases) return pendingPurchases;
        const token = generation;
        const buyerId = userStore.currentUser.id;
        const pending = (async () => {
            const collected = [];
            for (let offset = 0; offset < 10000; offset += 50) {
                const { json } = await marketplaceRequest.getProductPurchases({
                    buyerId,
                    order: 'desc',
                    sort: 'purchaseDate',
                    n: 50,
                    offset
                });
                if (!isCurrent(token, buyerId)) return;
                if (!Array.isArray(json)) throw new Error('Invalid purchases');
                collected.push(
                    ...json.filter((item) => item.buyerId === buyerId)
                );
                if (json.length < 50) {
                    purchases.value = collected;
                    ownershipRevision.value++;
                    return;
                }
            }
            throw new Error('Purchase history limit reached');
        })();
        pendingPurchases = pending;
        pending.then(
            () => {
                if (pendingPurchases === pending) pendingPurchases = null;
            },
            () => {
                if (pendingPurchases === pending) pendingPurchases = null;
            }
        );
        return pending;
    }

    async function refreshBalance() {
        if (!watchState.isLoggedIn || !userStore.currentUser.id) return;
        const token = generation;
        const userId = userStore.currentUser.id;
        const { json } = await miscRequest.getVRChatCredits();
        if (
            isCurrent(token, userId) &&
            Number.isSafeInteger(json?.balance) &&
            json.balance >= 0
        )
            balance.value = json.balance;
    }

    async function checkFreeStoreItems() {
        if (!settings.freeStoreItemNotifications || !watchState.isLoggedIn)
            return;
        const token = generation;
        const userId = userStore.currentUser.id;
        const results = await Promise.all(
            storeIds.map((storeId) =>
                marketplaceRequest.getStoreShelves({
                    storeId,
                    fetch: 'public',
                    hydrateListings: true
                })
            )
        );
        if (!isCurrent(token, userId) || !settings.freeStoreItemNotifications)
            return;
        const freeListings = new Map();
        for (const { json } of results) {
            if (!Array.isArray(json)) throw new Error('Invalid store shelves');
            for (const shelf of json) {
                for (const listing of shelf.listings ?? []) {
                    if (
                        listing.id &&
                        listing.active &&
                        price(listing) === 0 &&
                        !isOwned(listing) &&
                        !shownListingIds.has(listing.id)
                    )
                        freeListings.set(listing.id, listing);
                }
            }
        }
        const listings = [...freeListings.values()].filter(
            (listing) =>
                !(
                    listing.productIds?.length &&
                    [...freeListings.values()].some(
                        (other) =>
                            other.id !== listing.id &&
                            other.productIds?.length >
                                listing.productIds.length &&
                            listing.productIds.every((id) =>
                                other.productIds.includes(id)
                            )
                    )
                )
        );
        for (const listing of freeListings.values())
            shownListingIds.add(listing.id);
        if (listings.length) {
            freeStoreItemDialog.value.listings.push(...listings);
            freeStoreItemDialog.value.visible = true;
        }
    }

    function refresh() {
        if (!watchState.isLoggedIn || !userStore.currentUser.id)
            return Promise.resolve();
        if (pendingRefresh) return pendingRefresh;
        const token = generation;
        const userId = userStore.currentUser.id;
        const pending = Promise.all([
            refreshPurchases(),
            refreshBalance()
        ]).then(() => {
            if (isCurrent(token, userId)) return checkFreeStoreItems();
        });
        pendingRefresh = pending;
        pending.then(
            () => {
                if (pendingRefresh === pending) pendingRefresh = null;
            },
            () => {
                if (pendingRefresh === pending) pendingRefresh = null;
            }
        );
        return pending;
    }

    async function handleEvent(content) {
        if (!watchState.isLoggedIn) return;
        const token = generation;
        const userId = userStore.currentUser.id;
        if (content?.userId && content.userId !== userId) return;
        if (
            Number.isSafeInteger(content?.walletBalance) &&
            content.walletBalance >= 0
        )
            balance.value = content.walletBalance;
        try {
            if (pendingPurchases) await pendingPurchases;
            if (isCurrent(token, userId)) await refreshPurchases();
        } catch (err) {
            console.error('Failed to refresh economy ownership:', err);
        }
    }

    async function claimFreeListings() {
        if (isClaiming.value || !watchState.isLoggedIn) return 0;
        const token = generation;
        const userId = userStore.currentUser.id;
        isClaiming.value = true;
        claimFailed.value = false;
        let claimed = 0;
        try {
            for (const listing of [...freeStoreItemDialog.value.listings]) {
                if (!isCurrent(token, userId)) break;
                if (
                    !listing.id ||
                    !listing.active ||
                    price(listing) !== 0 ||
                    isOwned(listing)
                )
                    continue;
                try {
                    await marketplaceRequest.purchaseListing({
                        listingId: listing.id,
                        totalPrice: 0,
                        quantity: 1
                    });
                    if (!isCurrent(token, userId)) break;
                    claimed++;
                    freeStoreItemDialog.value.listings =
                        freeStoreItemDialog.value.listings.filter(
                            (item) => item.id !== listing.id
                        );
                } catch (err) {
                    if (isCurrent(token, userId)) claimFailed.value = true;
                    console.error('Failed to claim free store item:', err);
                }
            }
            if (isCurrent(token, userId)) {
                freeStoreItemDialog.value.visible =
                    freeStoreItemDialog.value.listings.length > 0;
                try {
                    await refreshPurchases();
                } catch (err) {
                    claimFailed.value = true;
                    console.error('Failed to refresh claimed ownership:', err);
                }
            }
        } finally {
            if (isCurrent(token, userId)) isClaiming.value = false;
        }
        return claimed;
    }

    watch(
        () => [watchState.isLoggedIn, userStore.currentUser.id],
        () => {
            generation++;
            pendingRefresh = pendingPurchases = null;
            purchases.value = [];
            balance.value = null;
            shownListingIds.clear();
            freeStoreItemDialog.value = { visible: false, listings: [] };
            isClaiming.value = claimFailed.value = false;
            if (watchState.isLoggedIn) refresh().catch(console.error);
        },
        { flush: 'sync' }
    );

    watch(
        () => settings.freeStoreItemNotifications,
        (enabled) => {
            if (enabled) refresh().catch(console.error);
            else freeStoreItemDialog.value.visible = false;
        }
    );

    return {
        purchases,
        balance,
        ownedListingIds,
        ownedProductIds,
        ownershipRevision,
        freeStoreItemDialog,
        isClaiming,
        claimFailed,
        refreshPurchases,
        refreshBalance,
        refresh,
        handleEvent,
        checkFreeStoreItems,
        claimFreeListings
    };
});
