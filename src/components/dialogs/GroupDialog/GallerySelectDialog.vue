<template>
    <Dialog v-model:open="gallerySelectDialog.visible">
        <DialogContent class="x-dialog w-full sm:max-w-none">
            <DialogHeader>
                <DialogTitle>{{ t('dialog.gallery_select.header') }}</DialogTitle>
            </DialogHeader>

            <div>
                <span>{{ t('dialog.gallery_select.gallery') }}</span>
                <span class="ml-1.5 text-muted-foreground text-xs">{{ imageTable.length }}/64</span>
                <br />
                <input
                    ref="uploadInput"
                    type="file"
                    accept="image/*"
                    style="display: none"
                    @change="onFileChangeGallery" />
                <ButtonGroup>
                    <Button variant="outline" size="sm" @click="selectImageGallerySelect('', '')">
                        <X />
                        {{ t('dialog.gallery_select.none') }}
                    </Button>
                    <Button variant="outline" size="sm" @click="refreshTable()">
                        <RefreshCw />
                        {{ t('dialog.gallery_select.refresh') }}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        :disabled="!isLocalUserVrcPlusSupporter || uploading"
                        @click="displayGalleryUpload">
                        <Upload />
                        {{ t('dialog.gallery_select.upload') }}
                    </Button>
                </ButtonGroup>
                <br />
                <div v-for="image in imageTable" :key="image.id" class="box-border inline-block mt-2.5 cursor-default">
                    <template v-if="image.versions && image.versions.length > 0">
                        <div
                            v-if="image.versions[image.versions.length - 1].file.url"
                            class="h-[200px] w-[200px] rounded-[20px] cursor-pointer overflow-hidden mr-5"
                            @click="
                                selectImageGallerySelect(image.versions[image.versions.length - 1].file.url, image.id)
                            ">
                            <img
                                :src="image.versions[image.versions.length - 1].file.url"
                                class="h-full w-full rounded-[15px] object-cover"
                                loading="lazy" />
                        </div>
                    </template>
                </div>
            </div>
        </DialogContent>
    </Dialog>
</template>

<script setup>
    import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
    import { RefreshCw, Upload, X } from 'lucide-vue-next';
    import { Button } from '@/components/ui/button';
    import { ButtonGroup } from '@/components/ui/button-group';
    import { storeToRefs } from 'pinia';
    import { toast } from 'vue-sonner';
    import { useI18n } from 'vue-i18n';

    import { useGalleryStore, useUserStore } from '../../../stores';
    import { vrcPlusIconRequest, vrcPlusImageRequest } from '../../../api';
    import { computed, ref, watch } from 'vue';

    const uploading = ref(false);
    const uploadInput = ref(null);

    const { t } = useI18n();

    const { galleryTable, VRCPlusIconsTable } = storeToRefs(useGalleryStore());
    const { refreshGalleryTable, refreshVRCPlusIconsTable, handleGalleryImageAdd } = useGalleryStore();
    const { isLocalUserVrcPlusSupporter } = storeToRefs(useUserStore());

    const props = defineProps({
        gallerySelectDialog: {
            type: Object,
            required: true
        }
    });
    const emit = defineEmits(['select-image']);

    watch(
        () => props.gallerySelectDialog.visible,
        (newValue) => {
            if (newValue) {
                refreshTable();
            }
        }
    );

    function refreshTable() {
        if (props.gallerySelectDialog.isIconGallerySelectDialog) {
            refreshVRCPlusIconsTable();
            return;
        }
        refreshGalleryTable();
    }
    const imageTable = computed(() => {
        if (props.gallerySelectDialog.isIconGallerySelectDialog) {
            return VRCPlusIconsTable.value;
        }
        return galleryTable.value;
    });

    /**
     *
     * @param imageUrl
     * @param fileId
     */
    function selectImageGallerySelect(imageUrl, fileId) {
        const D = props.gallerySelectDialog;
        D.selectedFileId = fileId;
        D.selectedImageUrl = imageUrl;
        emit('select-image', { imageUrl, fileId });
        D.visible = false;
    }

    /**
     *
     */
    function displayGalleryUpload() {
        uploadInput.value?.click();
    }

    /**
     *
     * @param e
     */
    function onFileChangeGallery(e) {
        const clearFile = function () {
            const fileInput = uploadInput.value;
            if (fileInput) {
                fileInput.value = '';
            }
        };
        const files = e.target.files || e.dataTransfer.files;
        if (uploading.value || !isLocalUserVrcPlusSupporter.value || !files.length) {
            return;
        }
        if (files[0].size >= 100000000) {
            // 100MB
            toast.error(t('message.file.too_large'));
            clearFile();
            return;
        }
        if (!files[0].type.match(/image.*/)) {
            toast.error(t('message.file.not_image'));
            clearFile();
            return;
        }
        const r = new FileReader();
        uploading.value = true;
        r.onload = async function () {
            try {
                const base64Body = btoa(r.result.toString());
                const icon = props.gallerySelectDialog.isIconGallerySelectDialog;
                const args = await (icon
                    ? vrcPlusIconRequest.uploadVRCPlusIcon(base64Body)
                    : vrcPlusImageRequest.uploadGalleryImage(base64Body));
                handleGalleryImageAdd(args);
                (icon ? VRCPlusIconsTable.value : galleryTable.value).unshift(args.json);
                toast.success(t('message.gallery.uploaded'));
            } catch (error) {
                toast.error(error.message || String(error));
            } finally {
                uploading.value = false;
            }
        };
        r.onerror = () => {
            uploading.value = false;
            toast.error(t('group_management.image_read_failed'));
        };
        r.readAsBinaryString(files[0]);
        clearFile();
    }
</script>
