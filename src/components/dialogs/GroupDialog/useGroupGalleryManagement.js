import { computed, ref } from 'vue';

/** Gallery mutations keep permission checks and stale response guards together. */
export function useGroupGalleryManagement(dialog, userId, api) {
    const loading = ref(false);
    const error = ref('');
    const canCreate = computed(() => {
        const permissions = dialog.value.ref?.myMember?.permissions || [];
        return (
            permissions.includes('*') ||
            permissions.includes('group-galleries-manage')
        );
    });
    const hasRole = (ids) =>
        ids?.some((id) => dialog.value.ref?.myMember?.roleIds?.includes(id));
    const canManage = (gallery) =>
        canCreate.value || Boolean(hasRole(gallery?.roleIdsToManage));
    const canSubmit = (gallery) =>
        canManage(gallery) || Boolean(hasRole(gallery?.roleIdsToSubmit));
    const canDeleteImage = (gallery, image) =>
        canManage(gallery) ||
        Boolean(userId.value && image.submittedByUserId === userId.value);
    const findGallery = (id) =>
        dialog.value.ref.galleries?.find((gallery) => gallery.id === id);

    async function mutate(action, apply) {
        if (loading.value) return;
        loading.value = true;
        error.value = '';
        const groupId = dialog.value.id;
        try {
            const { json } = await action(groupId);
            if (groupId === dialog.value.id) return apply(json);
        } catch (e) {
            if (groupId === dialog.value.id)
                error.value = e.message || String(e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function save(fields) {
        const gallery = fields.id ? findGallery(fields.id) : null;
        if (fields.id ? !gallery || !canManage(gallery) : !canCreate.value)
            throw new Error('group_management.gallery_read_only');
        const name = fields.name?.trim();
        if (
            !name ||
            name.length > 64 ||
            (fields.description || '').length > 1000
        )
            throw new Error('group_management.invalid_fields');
        const body = {
            name,
            description: fields.description || '',
            membersOnly: Boolean(fields.membersOnly),
            roleIdsToView: fields.roleIdsToView || [],
            roleIdsToSubmit: fields.roleIdsToSubmit || [],
            roleIdsToManage: fields.roleIdsToManage || []
        };
        return mutate(
            (groupId) =>
                gallery
                    ? api.editGroupGallery({
                          groupId,
                          galleryId: gallery.id,
                          ...body
                      })
                    : api.createGroupGallery({ groupId, ...body }),
            (json) => {
                if (gallery) Object.assign(gallery, json);
                else {
                    (dialog.value.ref.galleries ||= []).push(json);
                    dialog.value.galleries[json.id] = [];
                }
                return true;
            }
        );
    }

    async function remove(gallery) {
        const original = findGallery(gallery.id);
        if (!original || !canCreate.value)
            throw new Error('group_management.gallery_delete_denied');
        return mutate(
            (groupId) =>
                api.deleteGroupGallery({ groupId, galleryId: original.id }),
            () => {
                dialog.value.ref.galleries = dialog.value.ref.galleries.filter(
                    (item) => item.id !== original.id
                );
                delete dialog.value.galleries[original.id];
            }
        );
    }

    async function addImage(gallery, fileId) {
        const original = findGallery(gallery.id);
        if (!original || !canSubmit(original) || !fileId?.startsWith('file_'))
            throw new Error('group_management.image_submit_denied');
        return mutate(
            (groupId) =>
                api.addGroupGalleryImage({
                    groupId,
                    galleryId: original.id,
                    fileId
                }),
            (json) => {
                if (json.approved)
                    (dialog.value.galleries[original.id] ||= []).unshift(json);
                return Boolean(json.approved);
            }
        );
    }

    async function removeImage(gallery, image) {
        const original = findGallery(gallery.id);
        if (!original || !canDeleteImage(original, image))
            throw new Error('group_management.image_delete_denied');
        return mutate(
            (groupId) =>
                api.deleteGroupGalleryImage({
                    groupId,
                    galleryId: original.id,
                    imageId: image.id
                }),
            () => {
                dialog.value.galleries[original.id] = (
                    dialog.value.galleries[original.id] || []
                ).filter((item) => item.id !== image.id);
            }
        );
    }
    return {
        loading,
        error,
        canCreate,
        canManage,
        canSubmit,
        canDeleteImage,
        save,
        remove,
        addImage,
        removeImage
    };
}
