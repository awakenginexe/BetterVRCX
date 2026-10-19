<template>
    <section class="flex min-h-0 flex-1 flex-col gap-3" :aria-label="t('marketplace.store')">
        <div class="bv-surface-raised flex flex-wrap items-center gap-2 p-3">
            <Input
                v-model="query"
                class="min-w-40 flex-1"
                :aria-label="t('marketplace.filter')"
                :placeholder="t('marketplace.filter')" />
            <span class="text-sm">{{
                t('marketplace.balance', { balance: balance ?? '—', currency: t('marketplace.credits') })
            }}</span>
            <Button variant="outline" :disabled="loading || !!purchasing" @click="load">{{
                t('marketplace.refresh')
            }}</Button>
        </div>
        <p v-if="error" role="alert" class="text-destructive">{{ t('marketplace.load_error') }}</p>
        <p v-if="message" role="status">{{ message }}</p>
        <div v-if="loading" role="status" class="flex items-center justify-center gap-2 p-6">
            <Spinner />{{ t('marketplace.loading') }}
        </div>
        <div v-else class="bv-surface min-h-0 flex-1 overflow-y-auto p-3">
            <article
                v-for="listing in pageListings"
                :key="listingId(listing)"
                class="bv-surface-raised mb-2 flex flex-wrap items-center gap-3 rounded-xl p-3">
                <img
                    v-if="image(listing)"
                    :src="image(listing)"
                    alt=""
                    loading="lazy"
                    class="size-20 rounded-lg object-cover" />
                <div class="min-w-0 flex-1">
                    <p v-if="listing.shelfTitle" class="text-xs text-muted-foreground">{{ listing.shelfTitle }}</p>
                    <h3 class="font-semibold">{{ listing.displayName }}</h3>
                    <p class="whitespace-pre-line text-sm text-muted-foreground">{{ listing.description }}</p>
                    <p v-if="listing.duration" class="text-xs text-muted-foreground">
                        {{ listing.duration }} {{ listing.durationType }}
                    </p>
                    <p class="mt-1 text-sm">
                        {{
                            validPrice(listing)
                                ? t('marketplace.price', { price: price(listing), currency: t('marketplace.credits') })
                                : t('marketplace.unavailable')
                        }}
                    </p>
                </div>
                <Button
                    :data-testid="`buy-${listingId(listing)}`"
                    variant="outline"
                    :disabled="!canPurchase(listing)"
                    @click="purchase(listing)">
                    {{
                        isOwned(listing)
                            ? t('marketplace.owned')
                            : purchasing === listingId(listing)
                              ? t('marketplace.purchasing')
                              : t('marketplace.buy')
                    }}
                </Button>
            </article>
            <p v-if="!filteredListings.length && !error" class="p-6 text-center text-muted-foreground">
                {{ t('marketplace.empty') }}
            </p>
        </div>
        <nav
            v-if="filteredListings.length > 20"
            class="flex items-center justify-center gap-3"
            :aria-label="t('marketplace.pagination')">
            <Button variant="outline" :disabled="page === 0" @click="page--">{{ t('marketplace.previous') }}</Button>
            <span class="text-sm">{{ t('marketplace.page', { page: page + 1 }) }}</span>
            <Button variant="outline" :disabled="(page + 1) * 20 >= filteredListings.length" @click="page++">{{
                t('marketplace.next')
            }}</Button>
        </nav>
    </section>
</template>

<script setup>
    import { computed, onBeforeUnmount, ref, watch } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { Button } from '../ui/button';
    import { Input } from '../ui/input';
    import { Spinner } from '../ui/spinner';
    import { useModalStore, useUserStore } from '../../stores';
    import { AppDebug } from '../../services/appConfig';
    import marketplaceRequest from '../../api/marketplace';
    import miscRequest from '../../api/misc';

    const props = defineProps({
        storeId: { type: String, default: '' },
        entityId: { type: String, default: '' },
        productId: { type: String, default: '' },
        listings: { type: Array, default: undefined },
        search: { type: String, default: '' }
    });
    const emit = defineEmits(['purchased']);
    const { t } = useI18n();
    const userStore = useUserStore();
    const modalStore = useModalStore();
    const query = ref(props.search);
    const listings = ref([]);
    const purchases = ref([]);
    const confirmedListings = ref(new Set());
    const balance = ref(null);
    const ready = ref(false);
    const loading = ref(false);
    const error = ref(false);
    const purchasing = ref('');
    const message = ref('');
    const page = ref(0);
    let generation = 0;

    const filteredListings = computed(() => {
        const search = query.value.trim().toLowerCase();
        return listings.value.filter(
            (listing) =>
                listing.active !== false &&
                (!search ||
                    `${listing.displayName ?? ''} ${listing.description ?? ''} ${listing.subtitle ?? ''}`
                        .toLowerCase()
                        .includes(search))
        );
    });
    const pageListings = computed(() => filteredListings.value.slice(page.value * 20, (page.value + 1) * 20));
    const ownedListings = computed(() => new Set(purchases.value.map((purchase) => purchase.listingId)));
    const ownedProducts = computed(
        () => new Set(purchases.value.flatMap((purchase) => (purchase.products ?? []).map((product) => product.id)))
    );

    function listingId(listing) {
        return listing.listingId || listing.id;
    }
    function image(listing) {
        return listing.imageUrl || (listing.imageId ? `${AppDebug.endpointDomain}/file/${listing.imageId}/1/` : '');
    }
    function price(listing) {
        return userStore.isLocalUserVrcPlusSupporter && listing.vrcPlusDiscountPrice != null
            ? listing.vrcPlusDiscountPrice
            : listing.priceTokens;
    }
    function validPrice(listing) {
        return Number.isSafeInteger(price(listing)) && price(listing) >= 0;
    }
    function isOwned(listing) {
        const ids = listing.productIds?.length ? listing.productIds : props.productId ? [props.productId] : [];
        return (
            confirmedListings.value.has(listingId(listing)) ||
            ownedListings.value.has(listingId(listing)) ||
            (ids.length > 0 && ids.every((id) => ownedProducts.value.has(id)))
        );
    }
    function canPurchase(listing) {
        return (
            ready.value &&
            !purchasing.value &&
            !!listingId(listing) &&
            listing.active !== false &&
            validPrice(listing) &&
            balance.value !== null &&
            balance.value >= price(listing) &&
            !isOwned(listing)
        );
    }

    async function refreshOwnership(token) {
        const buyerId = userStore.currentUser.id;
        ready.value = false;
        if (!buyerId) throw new Error('No buyer');
        const collected = [];
        let complete = false;
        for (let offset = 0; offset < 10000; offset += 50) {
            const { json } = await marketplaceRequest.getProductPurchases({
                buyerId,
                order: 'desc',
                sort: 'purchaseDate',
                n: 50,
                offset
            });
            if (token !== generation) return;
            if (!Array.isArray(json)) throw new Error('Invalid purchases');
            collected.push(...json);
            if (json.length < 50) {
                complete = true;
                break;
            }
        }
        if (!complete) throw new Error('Purchase history limit reached');
        const { json } = await miscRequest.getVRChatCredits();
        if (token !== generation || buyerId !== userStore.currentUser.id) return;
        purchases.value = collected.filter((purchase) => purchase.purchaseActive && purchase.buyerId === buyerId);
        balance.value = Number.isSafeInteger(json?.balance) && json.balance >= 0 ? json.balance : null;
        ready.value = balance.value !== null;
    }

    async function loadListings(token) {
        let data;
        if (props.listings !== undefined) data = props.listings;
        else if (props.storeId) {
            const { json } = await marketplaceRequest.getStore({
                storeId: props.storeId,
                hydrateListings: true,
                hydrateContext: false
            });
            data = json.listings ?? [];
        } else {
            const stores = await Promise.allSettled(
                ['000', '001', '002'].map((suffix) =>
                    marketplaceRequest.getStoreShelves({
                        storeId: `esto_00000000-0000-0000-0000-000000000${suffix}`,
                        fetch: 'public',
                        hydrateListings: true
                    })
                )
            );
            if (token === generation && stores.some((result) => result.status === 'rejected')) error.value = true;
            data = stores
                .filter((result) => result.status === 'fulfilled')
                .flatMap(({ value: { json } }) =>
                    (json ?? []).flatMap((shelf) =>
                        (shelf.listings ?? []).map((listing) => ({ ...listing, shelfTitle: shelf.shelfTitle }))
                    )
                );
        }
        if (token === generation)
            listings.value = [...new Map(data.map((listing) => [listingId(listing), listing])).values()];
    }

    async function load() {
        const token = ++generation;
        loading.value = true;
        error.value = false;
        ready.value = false;
        balance.value = null;
        purchases.value = [];
        listings.value = [];
        page.value = 0;
        message.value = '';
        const results = await Promise.allSettled([loadListings(token), refreshOwnership(token)]);
        if (token !== generation) return;
        error.value = error.value || results.some((result) => result.status === 'rejected');
        loading.value = false;
    }

    async function purchase(listing) {
        if (!canPurchase(listing)) return;
        const token = generation;
        const buyerId = userStore.currentUser.id;
        const id = listingId(listing);
        const totalPrice = price(listing);
        purchasing.value = id;
        try {
            const { ok } = await modalStore.confirm({
                title: t('marketplace.confirm_title'),
                description: t('marketplace.confirm_purchase', {
                    name: listing.displayName,
                    price: totalPrice,
                    currency: t('marketplace.credits')
                })
            });
            if (
                !ok ||
                token !== generation ||
                buyerId !== userStore.currentUser.id ||
                listing.active === false ||
                price(listing) !== totalPrice ||
                !ready.value ||
                balance.value < totalPrice ||
                isOwned(listing)
            )
                return;
            try {
                await marketplaceRequest.purchaseListing({ listingId: id, totalPrice, quantity: 1 });
                if (token === generation) {
                    confirmedListings.value.add(id);
                    message.value = t('marketplace.purchase_success');
                    emit('purchased', { listingId: id, productId: props.productId });
                }
            } finally {
                if (token === generation) await refreshOwnership(token);
            }
        } catch {
            if (token === generation) error.value = true;
        } finally {
            purchasing.value = '';
        }
    }

    watch(
        () => props.search,
        (value) => {
            query.value = value;
        }
    );
    watch(query, () => {
        page.value = 0;
    });
    watch(
        () => userStore.currentUser.id,
        () => {
            confirmedListings.value = new Set();
        }
    );
    watch(
        [
            () => props.storeId,
            () => props.entityId,
            () => props.productId,
            () => props.listings,
            () => userStore.currentUser.id
        ],
        load,
        { immediate: true }
    );
    onBeforeUnmount(() => {
        generation++;
    });
    defineExpose({ refresh: load });
</script>
