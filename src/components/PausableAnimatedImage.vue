<template>
    <img
        v-if="!paused || (visible && !frozen)"
        ref="image"
        v-show="visible"
        v-bind="$attrs"
        :src="src"
        alt=""
        aria-hidden="true"
        draggable="false"
        @load="handleLoad"
        @error="$emit('error', $event)" />
    <canvas
        v-if="paused && visible && frozen"
        ref="canvas"
        v-bind="$attrs"
        data-frozen-animation-frame
        aria-hidden="true"></canvas>
</template>

<script setup>
    import { nextTick, ref, watch } from 'vue';

    defineOptions({ inheritAttrs: false });

    const props = defineProps({
        src: { type: String, required: true },
        paused: Boolean,
        visible: { type: Boolean, default: true },
        fit: {
            type: String,
            default: 'contain',
            validator: (value) => ['contain', 'cover'].includes(value)
        },
        position: {
            type: String,
            default: 'center',
            validator: (value) => ['center', 'right'].includes(value)
        }
    });
    const emit = defineEmits(['load', 'error']);

    const canvas = ref(null);
    const image = ref(null);
    const frozen = ref(false);

    async function captureFrame() {
        const imageElement = image.value;
        if (!imageElement || !imageElement.naturalWidth || !imageElement.naturalHeight) {
            return false;
        }

        const width = imageElement.clientWidth || imageElement.naturalWidth;
        const height = imageElement.clientHeight || imageElement.naturalHeight;
        frozen.value = true;
        await nextTick();

        if (!props.paused || !props.visible || !frozen.value) {
            return false;
        }
        const canvasElement = canvas.value;
        if (!canvasElement) {
            frozen.value = false;
            return false;
        }
        const context = canvasElement.getContext('2d');
        if (!context || width <= 0 || height <= 0) {
            frozen.value = false;
            return false;
        }

        const pixelRatio = window.devicePixelRatio || 1;
        canvasElement.width = Math.max(1, Math.round(width * pixelRatio));
        canvasElement.height = Math.max(1, Math.round(height * pixelRatio));
        canvasElement.style.width = `${width}px`;
        canvasElement.style.height = `${height}px`;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.clearRect(0, 0, width, height);

        const scale =
            props.fit === 'cover'
                ? Math.max(width / imageElement.naturalWidth, height / imageElement.naturalHeight)
                : Math.min(width / imageElement.naturalWidth, height / imageElement.naturalHeight);
        const drawWidth = imageElement.naturalWidth * scale;
        const drawHeight = imageElement.naturalHeight * scale;
        const drawX = props.position === 'right' ? width - drawWidth : (width - drawWidth) / 2;
        const drawY = (height - drawHeight) / 2;
        context.drawImage(imageElement, drawX, drawY, drawWidth, drawHeight);
        return true;
    }

    async function handleLoad(event) {
        if (props.paused && props.visible) {
            await captureFrame();
        }
        emit('load', event);
    }

    watch(
        () => props.paused,
        async (paused) => {
            if (!paused) {
                frozen.value = false;
                return;
            }
            if (props.visible) {
                await captureFrame();
            }
        },
        { flush: 'sync' }
    );

    watch(
        () => props.src,
        () => {
            frozen.value = false;
        }
    );

    watch(
        () => props.visible,
        async (visible) => {
            if (!visible || !props.paused) {
                return;
            }
            frozen.value = false;
            await nextTick();
            await captureFrame();
        }
    );
</script>
