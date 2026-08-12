<template>
    <Dialog v-model:open="open">
        <DialogPortal :to="portalTo">
            <RekaDialogOverlay
                :class="cn('bv-preview-overlay fixed inset-0', !disableGpuAcceleration && 'backdrop-blur-sm')" />

            <RekaDialogContent
                class="bv-preview-content fixed inset-0 border-0 bg-transparent p-6 shadow-none outline-none sm:p-10"
                data-surface="fullscreen-image-preview"
                :aria-label="imageAlt"
                @click="closeDialog"
                @open-auto-focus.prevent
                @close-auto-focus.prevent>
                <div ref="viewerEl" class="bv-preview-surface relative h-full w-full overflow-hidden select-none">
                    <!-- toolbar -->
                    <div
                        @click.stop
                        class="bv-preview-toolbar absolute right-3 top-3 z-10 flex items-center gap-2 rounded-md px-2 py-1"
                        data-surface="fullscreen-image-toolbar"
                        role="toolbar">
                        <Button
                            variant="ghost"
                            size="icon"
                            class="bv-preview-control bv-focus-ring h-8 w-8"
                            :disabled="!imageUrl"
                            @click="copyImageToClipboard(imageUrl)"
                            :ariaLabel="t('common.actions.copy')">
                            <Copy class="h-4 w-4" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            class="bv-preview-control bv-focus-ring h-8 w-8"
                            :disabled="!imageUrl"
                            @click="downloadAndSaveImage(imageUrl, fullscreenImageDialog.fileName)"
                            :ariaLabel="t('dialog.vrcx_updater.download')">
                            <Download class="h-4 w-4" />
                        </Button>

                        <div class="mx-1 h-5 w-px bg-border" />

                        <Button
                            variant="ghost"
                            size="icon"
                            class="bv-preview-control bv-focus-ring h-8 w-8"
                            @click="zoomOutCenter"
                            :ariaLabel="t('dialog.image_crop.zoom_out')">
                            <ZoomOut class="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            class="bv-preview-control bv-focus-ring h-8 w-8"
                            @click="zoomInCenter"
                            :ariaLabel="t('dialog.image_crop.zoom_in')">
                            <ZoomIn class="h-4 w-4" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            class="bv-preview-control bv-focus-ring h-8 w-8"
                            @click="rotateCW"
                            :ariaLabel="t('dialog.image_crop.rotate_right')">
                            <RotateCw class="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            class="bv-preview-control bv-focus-ring h-8 w-8"
                            @click="rotateCCW"
                            :ariaLabel="t('dialog.image_crop.rotate_left')">
                            <RotateCcw class="h-4 w-4" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            class="bv-preview-control bv-focus-ring h-8 w-8"
                            @click="resetTransform"
                            :ariaLabel="t('dialog.image_crop.reset')">
                            <RefreshCcw class="h-4 w-4" />
                        </Button>

                        <div class="mx-1 h-5 w-px bg-border" />

                        <Button
                            variant="ghost"
                            size="icon"
                            class="bv-preview-control bv-focus-ring h-8 w-8"
                            @click="closeDialog"
                            :ariaLabel="t('dialog.shared_feed_filters.close')">
                            <X class="h-4 w-4" />
                        </Button>
                    </div>

                    <div
                        class="bv-preview-stage flex h-full w-full items-center justify-center"
                        data-surface="fullscreen-image-stage"
                        @wheel="onWheel">
                        <img
                            @pointerdown="onPointerDown"
                            @pointermove="onPointerMove"
                            @pointerup="onPointerUp"
                            @pointercancel="onPointerUp"
                            @click.stop
                            v-if="imageUrl"
                            :src="imageUrl"
                            :alt="imageAlt"
                            class="bv-preview-image max-h-full max-w-full x-viewer-img"
                            :style="transformStyle"
                            draggable="false" />
                    </div>
                </div>
            </RekaDialogContent>
        </DialogPortal>
    </Dialog>
</template>

<script setup>
    import { Copy, Download, RefreshCcw, RotateCcw, RotateCw, X, ZoomIn, ZoomOut } from 'lucide-vue-next';
    import { useEventListener } from '@vueuse/core';
    import { computed, onBeforeUnmount, ref, watch } from 'vue';
    import { DialogContent as RekaDialogContent, DialogOverlay as RekaDialogOverlay, DialogPortal } from 'reka-ui';
    import { Button } from '@/components/ui/button';
    import { Dialog } from '@/components/ui/dialog';
    import { acquireModalPortalLayer } from '@/lib/modalPortalLayers';
    import { cn } from '@/lib/utils';
    import { storeToRefs } from 'pinia';
    import { toast } from 'vue-sonner';
    import { useGeneralSettingsStore } from '@/stores/settings/general';
    import { useI18n } from 'vue-i18n';

    import { extractFileId } from '../shared/utils';
    import { useGalleryStore } from '../stores';

    const galleryStore = useGalleryStore();
    const { fullscreenImageDialog } = storeToRefs(galleryStore);
    const { disableGpuAcceleration } = storeToRefs(useGeneralSettingsStore());
    const { t } = useI18n();

    const viewerEl = ref(null);
    const portalLayer = acquireModalPortalLayer();
    const portalTo = portalLayer.element;

    const scale = ref(1);
    const rotate = ref(0); // deg
    const tx = ref(0);
    const ty = ref(0);

    const isDragging = ref(false);
    const dragStartX = ref(0);
    const dragStartY = ref(0);
    const startTx = ref(0);
    const startTy = ref(0);

    const imageUrl = computed(() => fullscreenImageDialog.value.imageUrl || '');
    const imageAlt = computed(() => fullscreenImageDialog.value.fileName || t('dialog.gallery_select.header'));

    const open = computed({
        get: () => fullscreenImageDialog.value.visible,
        set: (v) => {
            fullscreenImageDialog.value.visible = v;
        }
    });

    function clamp(n, min, max) {
        return Math.min(max, Math.max(min, n));
    }
    function degToRad(deg) {
        return (deg * Math.PI) / 180;
    }

    function resetTransform() {
        scale.value = 1;
        rotate.value = 0;
        tx.value = 0;
        ty.value = 0;
    }

    function closeDialog() {
        open.value = false;
    }

    function zoomAtCenter(factor) {
        const el = viewerEl.value;
        if (!el) {
            scale.value = clamp(scale.value * factor, 0.1, 10);
            return;
        }

        scale.value = clamp(scale.value * factor, 0.1, 10);
    }

    function zoomInCenter() {
        zoomAtCenter(1.2);
    }
    function zoomOutCenter() {
        zoomAtCenter(1 / 1.2);
    }

    function rotateCW() {
        rotate.value = (rotate.value + 90) % 360;
    }
    function rotateCCW() {
        rotate.value = (rotate.value - 90 + 360) % 360;
    }

    function zoomAtPointer(e, factor) {
        const el = viewerEl.value;
        if (!el) return;

        const rect = el.getBoundingClientRect();

        // mouse in container space
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // container center
        const cx = rect.width / 2;
        const cy = rect.height / 2;

        const oldScale = scale.value;
        const newScale = clamp(oldScale * factor, 0.1, 10);

        const r = degToRad(rotate.value);
        const cos = Math.cos(r);
        const sin = Math.sin(r);

        // vector from transformed center (includes current translation)
        const vx = mx - cx - tx.value;
        const vy = my - cy - ty.value;

        // inverse rotate + unscale => local point
        const ux = (vx * cos + vy * sin) / oldScale;
        const uy = (-vx * sin + vy * cos) / oldScale;

        // forward rotate + scale => new vector
        const v2x = (ux * cos - uy * sin) * newScale;
        const v2y = (ux * sin + uy * cos) * newScale;

        // keep pointer anchored
        tx.value = mx - cx - v2x;
        ty.value = my - cy - v2y;
        scale.value = newScale;
    }

    function onWheel(e) {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        zoomAtPointer(e, factor);
    }

    function onPointerDown(e) {
        if (e.button !== 0) return;
        isDragging.value = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        dragStartX.value = e.clientX;
        dragStartY.value = e.clientY;
        startTx.value = tx.value;
        startTy.value = ty.value;
    }

    function onPointerMove(e) {
        if (!isDragging.value) return;
        const dx = e.clientX - dragStartX.value;
        const dy = e.clientY - dragStartY.value;
        tx.value = startTx.value + dx;
        ty.value = startTy.value + dy;
    }

    function onPointerUp(e) {
        if (!isDragging.value) return;
        isDragging.value = false;
        e.currentTarget.releasePointerCapture?.(e.pointerId);
    }

    const transformStyle = computed(() => ({
        transform: `translate(${tx.value}px, ${ty.value}px) scale(${scale.value}) rotate(${rotate.value}deg)`,
        transformOrigin: 'center center'
    }));

    watch(
        () => open.value,
        (v) => {
            if (v) {
                portalLayer.bringToFront();
                resetTransform();
            }
        }
    );

    onBeforeUnmount(() => {
        portalLayer.release();
    });

    watch(
        () => imageUrl.value,
        (url) => {
            if (!url || !open.value) return;
            resetTransform();
        }
    );

    function onKeydown(e) {
        if (!open.value) return;
        if (e.key === '+' || e.key === '=') zoomInCenter();
        else if (e.key === '-' || e.key === '_') zoomOutCenter();
        else if (e.key.toLowerCase() === 'r') rotateCW();
        else if (e.key === '0') resetTransform();
    }
    useEventListener(window, 'keydown', onKeydown);

    async function copyImageToClipboard(url) {
        if (!url) return;
        const msg = toast.info(t('message.image.downloading'));
        try {
            const response = await webApiService.execute({ url, method: 'GET' });
            if (response.status !== 200 || !String(response.data).startsWith('data:image/png')) {
                throw new Error(`Error: ${response.data}`);
            }
            const blob = await (await fetch(response.data)).blob();
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            toast.success(t('message.image.copied_to_clipboard'));
        } catch (error) {
            console.error('Error downloading image:', error);
            toast.error(`Failed to download image. ${url}`);
        } finally {
            toast.dismiss(msg);
        }
    }

    async function downloadAndSaveImage(url, fileName) {
        if (!url) return;
        const msg = toast.info(t('message.image.downloading'));
        try {
            const response = await webApiService.execute({ url, method: 'GET' });
            if (response.status !== 200 || !String(response.data).startsWith('data:image/png')) {
                throw new Error(`Error: ${response.data}`);
            }

            const link = document.createElement('a');
            link.href = response.data;

            const fileId = extractFileId(url);
            let name = fileName;
            if (!name && fileId) name = `${fileId}.png`;
            if (!name) name = `${url.split('/').pop()}.png`;
            if (!name) name = 'image.png';

            link.setAttribute('download', name);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error downloading image:', error);
            toast.error(`Failed to download image. ${url}`);
        } finally {
            toast.dismiss(msg);
        }
    }
</script>

<style scoped>
    .bv-preview-overlay {
        background: color-mix(in srgb, var(--bv-bg-base) 86%, transparent);
    }

    .bv-preview-content {
        padding: clamp(16px, 3vw, 40px);
    }

    .bv-preview-surface {
        border: 1px solid var(--bv-border);
        border-radius: 16px;
        background: color-mix(in srgb, var(--bv-bg-base) 92%, transparent);
        box-shadow: 0 24px 64px rgb(0 0 0 / 45%);
    }

    .bv-preview-toolbar {
        max-width: calc(100% - 32px);
        border: 1px solid var(--bv-border);
        background: color-mix(in srgb, var(--bv-bg-surface) 90%, transparent);
        box-shadow: 0 10px 24px rgb(0 0 0 / 28%);
        backdrop-filter: blur(12px);
    }

    .bv-preview-control {
        color: var(--bv-text-muted);
        transition:
            background-color 160ms ease,
            color 160ms ease;
    }

    .bv-preview-control:hover:not(:disabled) {
        background: var(--bv-bg-hover);
        color: var(--bv-text-strong);
    }

    .bv-preview-stage {
        touch-action: none;
    }

    .x-viewer-img {
        will-change: transform;
        cursor: grab;
        user-select: none;
    }

    .bv-preview-image {
        border-radius: 12px;
        box-shadow: 0 14px 36px rgb(0 0 0 / 35%);
        transition: box-shadow 180ms ease;
    }

    .x-viewer-img:active {
        cursor: grabbing;
    }

    @media (max-width: 640px) {
        .bv-preview-toolbar {
            right: 16px;
            left: 16px;
            justify-content: flex-end;
            flex-wrap: wrap;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .bv-preview-control,
        .bv-preview-image {
            transition-duration: 0.01ms;
        }
    }
</style>
