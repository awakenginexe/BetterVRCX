<template>
    <Dialog :open="freeStoreItemDialog.visible" @update:open="(open) => !open && closeDialog()">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{{ t('dialog.free_store_item_dialog.header') }}</DialogTitle>
                <DialogDescription>{{ t('dialog.free_store_item_dialog.description') }}</DialogDescription>
            </DialogHeader>
            <div class="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
                <div v-for="listing in freeStoreItemDialog.listings" :key="listing.id" class="flex items-center gap-3">
                    <img
                        v-if="listing.imageUrl || listing.imageId"
                        :src="listing.imageUrl || `${AppDebug.endpointDomain}/file/${listing.imageId}/1/`"
                        :alt="listing.displayName"
                        width="48"
                        height="48"
                        loading="lazy"
                        class="size-12 shrink-0 rounded object-cover" />
                    <div class="min-w-0">
                        <div class="truncate text-sm">{{ replaceBioSymbols(listing.displayName) }}</div>
                        <div v-if="listing.subtitle" class="truncate text-xs text-muted-foreground">
                            {{ replaceBioSymbols(listing.subtitle) }}
                        </div>
                    </div>
                </div>
            </div>
            <p v-if="claimFailed" role="alert" class="text-sm text-destructive">
                {{ t('dialog.free_store_item_dialog.failed') }}
            </p>
            <DialogFooter>
                <label class="inline-flex items-center gap-2 text-sm sm:mr-auto">
                    <Checkbox v-model="dontShowAgain" />
                    <span>{{ t('dialog.free_store_item_dialog.dont_show_again') }}</span>
                </label>
                <Button size="sm" variant="secondary" :disabled="isClaiming" @click="closeDialog">{{
                    t('dialog.free_store_item_dialog.close')
                }}</Button>
                <Button size="sm" :disabled="isClaiming || !freeStoreItemDialog.listings.length" @click="claim">{{
                    t('dialog.free_store_item_dialog.claim')
                }}</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup>
    import {
        Dialog,
        DialogContent,
        DialogDescription,
        DialogFooter,
        DialogHeader,
        DialogTitle
    } from '@/components/ui/dialog';
    import { Button } from '@/components/ui/button';
    import { Checkbox } from '@/components/ui/checkbox';
    import { toast } from 'vue-sonner';
    import { onMounted, ref } from 'vue';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';
    import { useEconomyStore } from '../../stores/economy';
    import { useNotificationsSettingsStore } from '../../stores/settings/notifications';
    import { AppDebug } from '../../services/appConfig';
    import { replaceBioSymbols } from '../../shared/utils';

    const { t } = useI18n();
    const economy = useEconomyStore();
    const { freeStoreItemDialog, isClaiming, claimFailed } = storeToRefs(economy);
    const settings = useNotificationsSettingsStore();
    const dontShowAgain = ref(false);
    onMounted(() => economy.refresh().catch(console.error));

    function closeDialog() {
        if (isClaiming.value) return;
        freeStoreItemDialog.value.visible = false;
        freeStoreItemDialog.value.listings = [];
        if (dontShowAgain.value) settings.setFreeStoreItemNotifications(false);
        dontShowAgain.value = false;
    }

    async function claim() {
        const count = await economy.claimFreeListings();
        if (count) toast.success(t('dialog.free_store_item_dialog.claim_success', { count }));
        if (!freeStoreItemDialog.value.visible && dontShowAgain.value) closeDialog();
    }
</script>
