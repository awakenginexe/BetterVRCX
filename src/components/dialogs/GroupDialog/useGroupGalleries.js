import { computed, ref } from 'vue';

import { queryRequest } from '../../../api';

/**
 * Composable for managing group gallery loading and display state.
 * @param {import('vue').Ref} groupDialog - reactive ref to the group dialog state
 * @returns {{
 *   isGroupGalleryLoading: import('vue').Ref<boolean>,
 *   galleryError: import('vue').Ref<string>,
 *   groupDialogGalleryCurrentName: import('vue').Ref<string>,
 *   groupGalleryTabs: import('vue').ComputedRef<Array>,
 *   groupGalleryStatus: (gallery: Object) => Object,
 *   getGroupGalleries: () => Promise<void>,
 *   getGroupGallery: (groupId: string, galleryId: string) => Promise<void>
 * }}
 */
export function useGroupGalleries(groupDialog) {
    const groupDialogGalleryCurrentName = ref('0');
    const isGroupGalleryLoading = ref(false);
    const galleryError = ref('');
    let generation = 0;

    const groupGalleryTabs = computed(() =>
        (groupDialog.value?.ref?.galleries || []).map((gallery, index) => ({
            value: String(index),
            label: gallery?.name ?? ''
        }))
    );

    /**
     * @param {object} gallery
     */
    function groupGalleryStatus(gallery) {
        const style = {};
        if (!gallery.membersOnly) {
            style.blue = true;
        } else if (!gallery.roleIdsToView) {
            style.green = true;
        } else {
            style.red = true;
        }
        return style;
    }

    /**
     *
     * @param obj
     */
    function updateGroupDialogData(obj) {
        groupDialog.value = {
            ...groupDialog.value,
            ...obj
        };
    }

    /**
     *
     */
    async function getGroupGalleries() {
        const token = ++generation;
        galleryError.value = '';
        updateGroupDialogData({ ...groupDialog.value, galleries: {} });
        groupDialogGalleryCurrentName.value = '0';
        isGroupGalleryLoading.value = true;
        const groupId = groupDialog.value.id;
        const tasks = (groupDialog.value.ref.galleries || []).map((gallery) =>
            getGroupGallery(groupId, gallery.id, token)
        );
        await Promise.allSettled(tasks);
        if (token === generation) isGroupGalleryLoading.value = false;
    }

    /**
     * @param {string} groupId
     * @param {string} galleryId
     */
    async function getGroupGallery(groupId, galleryId, token = generation) {
        try {
            const params = {
                groupId,
                galleryId,
                n: 100,
                offset: 0
            };
            const count = 50; // 5000 max
            for (let i = 0; i < count; i++) {
                const args = await queryRequest.fetch('groupGallery', params);
                if (groupId !== groupDialog.value.id || token !== generation)
                    return;
                if (args) {
                    for (const json of args.json) {
                        if (groupDialog.value.id === json.groupId) {
                            if (!groupDialog.value.galleries[json.galleryId]) {
                                groupDialog.value.galleries[json.galleryId] =
                                    [];
                            }
                            groupDialog.value.galleries[json.galleryId].push(
                                json
                            );
                        }
                    }
                }
                params.offset += 100;
                if (args.json.length < 100) {
                    break;
                }
            }
        } catch (err) {
            if (groupId === groupDialog.value.id && token === generation)
                galleryError.value = err.message || String(err);
            console.error(err);
        }
    }

    return {
        isGroupGalleryLoading,
        galleryError,
        groupDialogGalleryCurrentName,
        groupGalleryTabs,
        groupGalleryStatus,
        getGroupGalleries,
        getGroupGallery
    };
}
