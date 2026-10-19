<template>
    <Dialog :open="store.inventoryBundleDialog.visible" @update:open="(open) => !open && closeDialog()">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{{ t('inventory_bundles.title') }}</DialogTitle>
                <DialogDescription>{{ t('inventory_bundles.description') }}</DialogDescription>
            </DialogHeader>
            <div class="max-h-[50vh] space-y-3 overflow-y-auto">
                <div
                    v-for="bundle in store.inventoryBundleDialog.bundles"
                    :key="bundle.id"
                    class="flex items-center gap-3">
                    <img
                        v-if="typeof bundle.imageUrl === 'string' && /^https?:\/\//i.test(bundle.imageUrl)"
                        :src="bundle.imageUrl"
                        :alt="bundle.name || ''"
                        loading="lazy"
                        class="size-12 shrink-0 rounded object-cover" />
                    <div class="min-w-0 text-sm">
                        <p class="break-words font-medium">{{ bundle.name || bundle.id }}</p>
                        <p v-if="bundle.description" class="break-words text-xs text-muted-foreground">
                            {{ bundle.description }}
                        </p>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="secondary" size="sm" @click="closeDialog">{{ t('inventory_bundles.close') }}</Button>
                <Button size="sm" @click="openInventory">{{ t('inventory_bundles.open_inventory') }}</Button>
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
    import { useI18n } from 'vue-i18n';
    import { useInventoryBundleStore } from '../../stores/inventoryBundle';
    import { useGalleryStore } from '../../stores/gallery';

    const { t } = useI18n();
    const store = useInventoryBundleStore();
    const galleryStore = useGalleryStore();

    function closeDialog() {
        store.inventoryBundleDialog.visible = false;
    }
    function openInventory() {
        closeDialog();
        galleryStore.showGalleryPage();
    }
</script>
