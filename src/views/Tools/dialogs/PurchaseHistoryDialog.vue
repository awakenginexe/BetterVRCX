<template>
    <Dialog :open="visible" @update:open="(open) => !open && emit('close')">
        <DialogContent class="sm:max-w-3xl">
            <DialogHeader
                ><DialogTitle>{{ t('dialog.purchase_history.header') }}</DialogTitle></DialogHeader
            >
            <Tabs v-model="activeTab">
                <div class="flex flex-wrap items-center gap-2">
                    <TabsList>
                        <TabsTrigger value="purchases">{{ t('dialog.purchase_history.purchases') }}</TabsTrigger>
                        <TabsTrigger value="transactions">{{ t('dialog.purchase_history.transactions') }}</TabsTrigger>
                    </TabsList>
                    <Select v-if="activeTab === 'purchases'" v-model="typeFilter">
                        <SelectTrigger size="sm" class="w-40" :aria-label="t('dialog.purchase_history.filter_type')"
                            ><SelectValue
                        /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{{ t('dialog.purchase_history.all') }}</SelectItem>
                            <SelectItem v-for="type in listingTypes" :key="type" :value="type">{{ type }}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        size="icon-sm"
                        variant="outline"
                        class="ml-auto"
                        :disabled="loading"
                        :aria-label="t('dialog.purchase_history.refresh')"
                        @click="load">
                        <RefreshCw :class="{ 'animate-spin': loading }" />
                    </Button>
                </div>
                <p v-if="error" role="alert" class="mt-2 text-sm text-destructive">
                    {{ t('dialog.purchase_history.failed') }}
                </p>
                <p v-if="loading" role="status" class="mt-2 text-sm text-muted-foreground">
                    {{ t('dialog.purchase_history.loading') }}
                </p>
                <TabsContent value="purchases" class="max-h-[60vh] overflow-y-auto">
                    <DataTableEmpty v-if="!filteredPurchases.length && !loading && !error" type="nodata" />
                    <div
                        v-for="purchase in filteredPurchases"
                        :key="purchase.purchaseId"
                        class="flex items-start gap-3 border-b py-3 last:border-b-0">
                        <img
                            v-if="purchase.listingImageId"
                            :src="`${AppDebug.endpointDomain}/file/${purchase.listingImageId}/1/`"
                            :alt="purchase.listingDisplayName"
                            width="48"
                            height="48"
                            loading="lazy"
                            class="size-12 flex-none rounded object-cover" />
                        <div class="min-w-0 flex-1 text-sm">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="truncate font-medium">{{
                                    replaceBioSymbols(purchase.listingDisplayName)
                                }}</span>
                                <Badge variant="outline">{{ purchase.listingType }}</Badge>
                                <Badge v-if="purchase.isGift" variant="secondary">{{
                                    t('dialog.purchase_history.gift')
                                }}</Badge>
                                <Badge v-if="!purchase.purchaseActive" variant="destructive">{{
                                    t('dialog.purchase_history.inactive')
                                }}</Badge>
                            </div>
                            <div class="text-muted-foreground">{{ replaceBioSymbols(purchase.listingSubtitle) }}</div>
                            <div class="text-muted-foreground">
                                {{ t('dialog.purchase_history.seller') }}: {{ purchase.sellerDisplayName }} ·
                                {{
                                    purchase.purchasePrice
                                        ? `${commaNumber(purchase.purchasePrice)}V`
                                        : t('dialog.purchase_history.free')
                                }}
                            </div>
                            <div class="mt-1 text-xs text-muted-foreground">
                                {{ formatDateFilter(purchase.purchaseDate, 'long') }}
                                <template v-if="purchase.purchaseEndDate && purchase.listingType !== 'permanent'">
                                    · {{ t('dialog.purchase_history.ends') }}
                                    {{ formatDateFilter(purchase.purchaseEndDate, 'long') }}</template
                                >
                            </div>
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="transactions" class="max-h-[60vh] overflow-y-auto">
                    <p class="text-xs text-muted-foreground">{{ t('dialog.purchase_history.latest_transactions') }}</p>
                    <DataTableEmpty v-if="!transactions.length && !loading && !error" type="nodata" />
                    <div
                        v-for="transaction in transactions"
                        :key="transaction.transactionLineId"
                        class="flex items-start gap-3 border-b py-3 last:border-b-0">
                        <div class="min-w-0 flex-1 text-sm">
                            <div class="truncate font-medium">
                                {{ replaceBioSymbols(transaction.listingDisplayName) }}
                            </div>
                            <Badge v-if="transaction.reasonLabel" variant="secondary">{{
                                transaction.reasonLabel
                            }}</Badge>
                            <div class="text-muted-foreground">
                                <template v-if="transaction.fromUserDisplayName"
                                    >{{ t('dialog.purchase_history.from') }}:
                                    {{ transaction.fromUserDisplayName }}</template
                                >
                                <template v-if="transaction.toUserDisplayName">
                                    · {{ t('dialog.purchase_history.to') }}:
                                    {{ transaction.toUserDisplayName }}</template
                                >
                            </div>
                            <div class="mt-1 text-xs text-muted-foreground">
                                {{ formatDateFilter(transaction.date, 'long')
                                }}<template v-if="transaction.platform"> · {{ transaction.platform }}</template>
                            </div>
                        </div>
                        <div class="flex-none text-right text-sm">
                            <div class="font-medium">{{ commaNumber(transaction.amount) }}V</div>
                            <div class="text-xs text-muted-foreground">
                                {{ t('dialog.purchase_history.balance') }}: {{ commaNumber(transaction.balance) }}V
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </DialogContent>
    </Dialog>
</template>

<script setup>
    import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
    import { Badge } from '@/components/ui/badge';
    import { Button } from '@/components/ui/button';
    import DataTableEmpty from '@/components/ui/data-table/DataTableEmpty.vue';
    import { RefreshCw } from 'lucide-vue-next';
    import { computed, ref, watch } from 'vue';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';
    import { AppDebug } from '../../../services/appConfig';
    import { commaNumber, formatDateFilter, replaceBioSymbols } from '../../../shared/utils';
    import { useEconomyStore } from '../../../stores/economy';
    import { useUserStore } from '../../../stores/user';
    import marketplaceRequest from '../../../api/marketplace';
    import { watchState } from '../../../services/watchState';

    const props = defineProps({ visible: { type: Boolean, default: false } });
    const emit = defineEmits(['close']);
    const { t } = useI18n();
    const economy = useEconomyStore();
    const userStore = useUserStore();
    const { purchases } = storeToRefs(economy);
    const activeTab = ref('purchases');
    const typeFilter = ref('all');
    const transactions = ref([]);
    const loading = ref(false);
    const error = ref(false);
    let generation = 0;
    const listingTypes = computed(() => [...new Set(purchases.value.map((item) => item.listingType).filter(Boolean))]);
    const filteredPurchases = computed(() =>
        purchases.value
            .filter((item) => typeFilter.value === 'all' || item.listingType === typeFilter.value)
            .toSorted((a, b) => Date.parse(b.purchaseDate) - Date.parse(a.purchaseDate))
    );

    watch(
        () => [props.visible, activeTab.value, userStore.currentUser.id, watchState.isLoggedIn],
        () => {
            generation++;
            transactions.value = [];
            loading.value = error.value = false;
            if (props.visible && watchState.isLoggedIn) load();
        }
    );

    async function load() {
        const token = ++generation;
        const userId = userStore.currentUser.id;
        loading.value = true;
        error.value = false;
        try {
            if (activeTab.value === 'purchases') await economy.refreshPurchases();
            else {
                const { json } = await marketplaceRequest.getEconomyTransactions({ userId, n: 100 });
                if (token !== generation || userId !== userStore.currentUser.id || !watchState.isLoggedIn) return;
                if (!Array.isArray(json?.transactions)) throw new Error('Invalid economy transactions');
                transactions.value = json.transactions;
            }
        } catch {
            if (token === generation) error.value = true;
        } finally {
            if (token === generation) loading.value = false;
        }
    }
</script>
