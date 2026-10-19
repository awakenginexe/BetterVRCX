<template>
    <div class="h-full min-h-0 flex flex-col p-2 rounded-xl bg-(--profile-card)">
        <div class="flex gap-2 items-center">
            <Button
                :aria-label="t('group_management.refresh')"
                class="rounded-full"
                variant="ghost"
                size="icon-sm"
                :disabled="isGroupGalleryLoading"
                @click="getGroupGalleries">
                <Spinner v-if="isGroupGalleryLoading" />
                <RefreshCw v-else />
            </Button>
            <Button v-if="canCreate" size="sm" :disabled="loading" @click="editGallery()">{{
                t('group_management.new_gallery')
            }}</Button>
        </div>
        <p v-if="error || actionError || galleryError" role="alert" class="text-sm text-destructive">
            {{ t(actionError || error || galleryError) }}
        </p>
        <p v-if="notice" role="status" class="text-sm text-muted-foreground">{{ notice }}</p>
        <form v-if="form" class="space-y-3 border rounded-lg p-3 my-2" @submit.prevent="saveGallery">
            <Field
                ><FieldLabel>{{ t('group_management.name') }}</FieldLabel
                ><InputGroupField v-model="form.name" :maxlength="64" required :disabled="loading"
            /></Field>
            <Field
                ><FieldLabel>{{ t('group_management.description') }}</FieldLabel
                ><InputGroupTextareaField v-model="form.description" :maxlength="1000" :disabled="loading"
            /></Field>
            <label class="flex gap-2 items-center"
                ><Checkbox v-model="form.membersOnly" :disabled="loading" />{{
                    t('group_management.members_only')
                }}</label
            >
            <div
                v-for="field in ['roleIdsToView', 'roleIdsToSubmit', 'roleIdsToManage']"
                :key="field"
                class="space-y-1">
                <p class="text-sm font-medium">{{ t(`group_management.${field}`) }}</p>
                <label
                    v-for="role in groupDialog.ref.roles || []"
                    :key="role.id"
                    class="inline-flex gap-2 items-center mr-3 text-sm">
                    <Checkbox
                        :model-value="form[field].includes(role.id)"
                        :disabled="loading"
                        @update:model-value="toggleRole(field, role.id, $event)" />{{ role.name }}
                </label>
                <p v-if="!groupDialog.ref.roles?.length" class="text-sm text-muted-foreground">
                    {{ t('group_management.no_roles') }}
                </p>
            </div>
            <div class="flex gap-2">
                <Button type="submit" size="sm" :disabled="loading || !form.name?.trim()">{{
                    t('group_management.save')
                }}</Button
                ><Button type="button" size="sm" variant="outline" :disabled="loading" @click="form = null">{{
                    t('group_management.cancel')
                }}</Button>
            </div>
        </form>
        <p v-if="!groupDialog.ref.galleries?.length" class="text-sm text-muted-foreground p-2">
            {{ t('group_management.no_galleries') }}
        </p>
        <GallerySelectDialog :gallery-select-dialog="gallerySelectDialog" @select-image="submitImage" />
        <TabsUnderline
            v-model="groupDialogGalleryCurrentName"
            :items="groupGalleryTabs"
            :unmount-on-hide="false"
            fill
            class="mt-2.5 min-h-0">
            <template
                v-for="(gallery, index) in groupDialog.ref.galleries"
                :key="`label-${index}`"
                v-slot:[`label-${index}`]>
                <span class="text-base font-bold" v-text="gallery.name" />
                <i class="x-status-icon" style="margin-left: 6px" :class="groupGalleryStatus(gallery)" />
                <span class="text-muted-foreground text-xs ml-1.5">{{
                    groupDialog.galleries[gallery.id] ? groupDialog.galleries[gallery.id].length : 0
                }}</span>
            </template>
            <template
                v-for="(gallery, index) in groupDialog.ref.galleries"
                :key="`content-${index}`"
                v-slot:[String(index)]>
                <div class="flex flex-wrap gap-2 items-center p-2">
                    <span class="text-muted-foreground mr-auto" v-text="gallery.description" />
                    <Button
                        v-if="canSubmit(gallery)"
                        size="sm"
                        variant="outline"
                        :disabled="loading || isGroupGalleryLoading"
                        @click="chooseImage(gallery)"
                        >{{ t('group_management.add_image') }}</Button
                    >
                    <Button
                        v-if="canManage(gallery)"
                        size="sm"
                        variant="outline"
                        :disabled="loading"
                        @click="editGallery(gallery)"
                        >{{ t('group_management.edit') }}</Button
                    >
                    <Button
                        v-if="canCreate"
                        size="sm"
                        variant="destructive"
                        :disabled="loading"
                        @click="deleteGallery(gallery)"
                        >{{ t('group_management.delete') }}</Button
                    >
                </div>
                <p
                    v-if="!groupDialog.galleries[gallery.id]?.length && !isGroupGalleryLoading"
                    class="text-sm text-muted-foreground p-2">
                    {{ t('group_management.no_images') }}
                </p>
                <div
                    style="
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                        gap: 16px;
                        margin-top: 8px;
                    ">
                    <Card
                        v-for="image in groupDialog.galleries[gallery.id]"
                        :key="image.id"
                        class="p-0 overflow-hidden transition-shadow hover:shadow-md">
                        <div class="cursor-pointer" @click="showFullscreenImageDialog(image.imageUrl)">
                            <img
                                :src="image.imageUrl"
                                :class="['max-w-full', 'max-h-full']"
                                @error="
                                    $event.target.style.display = 'none';
                                    $event.target.nextElementSibling.style.display = 'flex';
                                "
                                loading="lazy" />
                            <div
                                class="hidden h-[200px] w-full items-center justify-center bg-muted"
                                style="display: none">
                                <Image class="size-8 text-muted-foreground" />
                            </div>
                        </div>
                        <Button
                            v-if="canDeleteImage(gallery, image)"
                            size="sm"
                            variant="ghost"
                            :disabled="loading"
                            @click="deleteImage(gallery, image)"
                            >{{ t('group_management.delete_image') }}</Button
                        >
                    </Card>
                </div>
            </template>
        </TabsUnderline>
    </div>
</template>

<script setup>
    import { Button } from '@/components/ui/button';
    import { Card } from '@/components/ui/card';
    import { Image, RefreshCw } from 'lucide-vue-next';
    import { Spinner } from '@/components/ui/spinner';
    import { TabsUnderline } from '@/components/ui/tabs';
    import { storeToRefs } from 'pinia';
    import { computed, ref, watch } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { Checkbox } from '@/components/ui/checkbox';
    import { Field, FieldLabel } from '@/components/ui/field';
    import { InputGroupField, InputGroupTextareaField } from '@/components/ui/input-group';
    import GallerySelectDialog from './GallerySelectDialog.vue';
    import { useGroupGalleryManagement } from './useGroupGalleryManagement';
    import { groupRequest } from '../../../api';

    import { useGalleryStore, useGroupStore, useModalStore, useUserStore } from '../../../stores';
    import { useGroupGalleries } from './useGroupGalleries';

    const { t } = useI18n();
    const modal = useModalStore();
    const { currentUser } = storeToRefs(useUserStore());
    const { groupDialog } = storeToRefs(useGroupStore());
    const { showFullscreenImageDialog } = useGalleryStore();

    const {
        isGroupGalleryLoading,
        galleryError,
        groupDialogGalleryCurrentName,
        groupGalleryTabs,
        groupGalleryStatus,
        getGroupGalleries
    } = useGroupGalleries(groupDialog);

    const { loading, error, canCreate, canManage, canSubmit, canDeleteImage, save, remove, addImage, removeImage } =
        useGroupGalleryManagement(
            groupDialog,
            computed(() => currentUser.value.id),
            groupRequest
        );
    const form = ref(null);
    const actionError = ref('');
    const notice = ref('');
    const gallerySelectDialog = ref({
        visible: false,
        selectedFileId: '',
        selectedImageUrl: '',
        isIconGallerySelectDialog: false
    });
    let imageTarget = null;
    function editGallery(gallery) {
        actionError.value = '';
        form.value = {
            id: gallery?.id,
            name: gallery?.name || '',
            description: gallery?.description || '',
            membersOnly: Boolean(gallery?.membersOnly),
            roleIdsToView: [...(gallery?.roleIdsToView || [])],
            roleIdsToSubmit: [...(gallery?.roleIdsToSubmit || [])],
            roleIdsToManage: [...(gallery?.roleIdsToManage || [])]
        };
    }
    function toggleRole(field, id, checked) {
        form.value[field] = checked
            ? [...new Set([...form.value[field], id])]
            : form.value[field].filter((roleId) => roleId !== id);
    }
    async function run(action) {
        const id = groupDialog.value.id;
        actionError.value = '';
        notice.value = '';
        try {
            await action();
        } catch (e) {
            if (id === groupDialog.value.id) actionError.value = e.message || String(e);
        }
    }
    async function saveGallery() {
        await run(async () => {
            if (await save(form.value)) {
                form.value = null;
                groupDialogGalleryCurrentName.value = '0';
            }
        });
    }
    async function deleteGallery(gallery) {
        const id = groupDialog.value.id;
        const { ok } = await modal.confirm({
            title: t('confirm.title'),
            description: t('group_management.delete_gallery_confirm', { name: gallery.name }),
            destructive: true
        });
        if (ok && id === groupDialog.value.id)
            await run(async () => {
                await remove(gallery);
                groupDialogGalleryCurrentName.value = '0';
                form.value = null;
            });
    }
    async function deleteImage(gallery, image) {
        const id = groupDialog.value.id;
        const { ok } = await modal.confirm({
            title: t('confirm.title'),
            description: t('group_management.delete_image_confirm'),
            destructive: true
        });
        if (ok && id === groupDialog.value.id) await run(() => removeImage(gallery, image));
    }
    function chooseImage(gallery) {
        imageTarget = { groupId: groupDialog.value.id, gallery };
        gallerySelectDialog.value.visible = true;
    }
    async function submitImage({ fileId }) {
        const target = imageTarget;
        imageTarget = null;
        if (!fileId || !target || target.groupId !== groupDialog.value.id) return;
        await run(async () => {
            const approved = await addImage(target.gallery, fileId);
            if (target.groupId === groupDialog.value.id && approved === false)
                notice.value = t('group_management.image_pending');
        });
    }
    watch(
        () => groupDialog.value.id,
        () => {
            form.value = null;
            actionError.value = '';
            notice.value = '';
            imageTarget = null;
            gallerySelectDialog.value.visible = false;
        }
    );

    defineExpose({
        getGroupGalleries
    });
</script>
