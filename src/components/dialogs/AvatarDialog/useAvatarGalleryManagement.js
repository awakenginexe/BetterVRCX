import { computed, ref } from 'vue';
import { avatarRequest, miscRequest } from '../../../api';
import { queryClient, queryKeys } from '../../../queries';

export function useAvatarGalleryManagement(
    dialog,
    currentUser,
    confirm,
    refresh
) {
    const busy = ref(false);
    const canEdit = computed(
        () =>
            dialog.value.ref.authorId === currentUser.value.id &&
            Array.isArray(dialog.value.ref.gallery) &&
            dialog.value.ref.gallery.length ===
                dialog.value.galleryImages.length
    );

    async function reload(id) {
        await queryClient.invalidateQueries({
            queryKey: queryKeys.avatarGallery(id),
            refetchType: 'none'
        });
        if (dialog.value.id === id) await refresh(id);
    }

    async function moveImage(index, direction) {
        if (!canEdit.value || busy.value || dialog.value.galleryLoading) return;
        const ids = dialog.value.ref.gallery.map((file) => file.id);
        const target = index + direction;
        if (!ids[index] || target < 0 || target >= ids.length) return;
        [ids[index], ids[target]] = [ids[target], ids[index]];
        const id = dialog.value.id;
        busy.value = true;
        dialog.value.galleryLoading = true;
        try {
            await avatarRequest.setAvatarGalleryOrder(ids, id);
            await reload(id);
        } finally {
            busy.value = false;
            if (dialog.value.id === id) dialog.value.galleryLoading = false;
        }
    }

    async function removeImage(index) {
        if (!canEdit.value || busy.value || dialog.value.galleryLoading) return;
        const id = dialog.value.id;
        const fileId = dialog.value.ref.gallery[index]?.id;
        if (!fileId) return;
        busy.value = true;
        try {
            const { ok } = await confirm();
            if (!ok || dialog.value.id !== id || !canEdit.value) return;
            dialog.value.galleryLoading = true;
            await miscRequest.deleteFile(fileId);
            await reload(id);
        } finally {
            busy.value = false;
            if (dialog.value.id === id) dialog.value.galleryLoading = false;
        }
    }
    return { canEdit, busy, moveImage, removeImage };
}
