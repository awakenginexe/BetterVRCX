<template>
    <section class="flex min-h-0 flex-1 flex-col gap-3" :aria-label="t('marketplace.avatars')">
        <form class="bv-surface-raised flex flex-wrap items-center gap-2 p-3" @submit.prevent="load(0)">
            <Input
                v-model="query"
                class="min-w-40 flex-1"
                :aria-label="t('marketplace.search')"
                :placeholder="t('marketplace.search')" />
            <Select v-model="order">
                <SelectTrigger class="w-40" :aria-label="t('marketplace.order')"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="ascending">{{ t('marketplace.ascending') }}</SelectItem>
                    <SelectItem value="descending">{{ t('marketplace.descending') }}</SelectItem>
                </SelectContent>
            </Select>
            <Input
                v-model="minPrice"
                data-testid="min-price"
                type="number"
                min="0"
                step="1"
                class="w-32"
                :aria-label="t('marketplace.min_price')"
                :placeholder="t('marketplace.min_price')" />
            <Input
                v-model="maxPrice"
                data-testid="max-price"
                type="number"
                min="0"
                step="1"
                class="w-32"
                :aria-label="t('marketplace.max_price')"
                :placeholder="t('marketplace.max_price')" />
            <Button type="submit">{{ t('marketplace.search') }}</Button>
        </form>
        <p v-if="invalidFilters" role="alert" class="text-destructive">{{ t('marketplace.invalid_filters') }}</p>
        <p v-if="error" role="alert" class="text-destructive">
            {{ t('marketplace.load_error') }}
            <Button data-testid="retry" variant="outline" @click="load(offset)">{{ t('marketplace.retry') }}</Button>
        </p>
        <div v-if="loading" role="status" class="flex items-center justify-center gap-2 p-6">
            <Spinner />{{ t('marketplace.loading') }}
        </div>
        <div v-else class="bv-surface min-h-0 flex-1 overflow-y-auto p-3">
            <div v-if="results.length" class="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
                <button
                    v-for="avatar in results"
                    :key="avatar.id"
                    type="button"
                    :data-testid="`avatar-${avatar.id}`"
                    class="bv-surface-raised bv-focus-ring overflow-hidden rounded-xl text-left"
                    @click="showAvatarDialog(avatar.id)">
                    <img
                        v-if="avatar.thumbnailImageUrl || avatar.imageUrl"
                        :src="avatar.thumbnailImageUrl || avatar.imageUrl"
                        alt=""
                        loading="lazy"
                        class="aspect-4/3 w-full object-cover" />
                    <div class="space-y-1 p-3">
                        <strong class="block truncate">{{ avatar.name }}</strong>
                        <span class="block truncate text-xs text-muted-foreground">{{ avatar.authorName }}</span>
                        <span v-if="price(avatar) !== null" class="block text-sm">{{
                            t('marketplace.price', { price: price(avatar), currency: t('marketplace.credits') })
                        }}</span>
                    </div>
                </button>
            </div>
            <p v-else-if="!error" class="p-6 text-center text-muted-foreground">{{ t('marketplace.empty') }}</p>
        </div>
        <nav class="flex items-center justify-center gap-3" :aria-label="t('marketplace.pagination')">
            <Button variant="outline" :disabled="loading || offset === 0" @click="load(Math.max(0, offset - 50))">{{
                t('marketplace.previous')
            }}</Button>
            <span class="text-sm">{{ t('marketplace.page', { page: offset / 50 + 1 }) }}</span>
            <Button data-testid="next" variant="outline" :disabled="loading || !hasNext" @click="load(offset + 50)">{{
                t('marketplace.next')
            }}</Button>
        </nav>
    </section>
</template>

<script setup>
    import { onBeforeUnmount, ref, watch } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { Button } from '../ui/button';
    import { Input } from '../ui/input';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
    import { Spinner } from '../ui/spinner';
    import { showAvatarDialog } from '../../coordinators/avatarCoordinator';
    import marketplaceRequest from '../../api/marketplace';

    const props = defineProps({ search: { type: String, default: '' } });
    const { t } = useI18n();
    const query = ref(props.search);
    const order = ref('ascending');
    const minPrice = ref('');
    const maxPrice = ref('');
    const invalidFilters = ref(false);
    const offset = ref(0);
    const results = ref([]);
    const hasNext = ref(false);
    const loading = ref(false);
    const error = ref(false);
    let generation = 0;
    let appliedFilters = {};

    function price(avatar) {
        const prices = (avatar.publishedListings ?? []).map((listing) => listing.priceTokens).filter(Number.isFinite);
        return prices.length ? Math.min(...prices) : Number.isFinite(avatar.lowestPrice) ? avatar.lowestPrice : null;
    }

    async function load(nextOffset = 0) {
        const token = ++generation;
        invalidFilters.value = false;
        if (nextOffset === 0) {
            const minimum = minPrice.value === '' ? undefined : Number(minPrice.value);
            const maximum = maxPrice.value === '' ? undefined : Number(maxPrice.value);
            if (
                [minimum, maximum].some(
                    (value) => value !== undefined && (!Number.isSafeInteger(value) || value < 0)
                ) ||
                (minimum !== undefined && maximum !== undefined && minimum > maximum)
            ) {
                invalidFilters.value = true;
                loading.value = false;
                return;
            }
            appliedFilters = { search: query.value.trim(), minPrice: minimum, maxPrice: maximum };
        }
        offset.value = nextOffset;
        loading.value = true;
        error.value = false;
        hasNext.value = false;
        results.value = [];
        try {
            const { json } = await marketplaceRequest.searchAvatars({
                n: 50,
                offset: nextOffset,
                releaseStatus: 'public',
                order: order.value,
                marketplace: 'all',
                metadata: true,
                ...appliedFilters
            });
            if (token !== generation) return;
            results.value = [...new Map((json.results ?? []).map((avatar) => [avatar.id, avatar])).values()];
            hasNext.value = Boolean(json.hasNext);
        } catch {
            if (token === generation) error.value = true;
        } finally {
            if (token === generation) loading.value = false;
        }
    }

    watch(
        () => props.search,
        (value) => {
            query.value = value;
            load(0);
        }
    );
    watch(order, () => load(0));
    onBeforeUnmount(() => {
        generation++;
    });
    load(0);
    defineExpose({ refresh: () => load(0) });
</script>
