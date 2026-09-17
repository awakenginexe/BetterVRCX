<template>
    <template v-if="displayVRCProfileEffects">
        <img
            v-if="mainUrl && !mainAssetError"
            v-show="!introActive"
            v-bind="$attrs"
            data-icon-frame-asset
            data-icon-frame-main
            alt=""
            aria-hidden="true"
            :src="mainUrl"
            draggable="false"
            class="pointer-events-none absolute inset-0 h-full w-full max-w-none object-contain scale-[1.3]"
            @error="mainAssetError = true" />
        <img
            v-if="introUrl && !introAssetError"
            v-show="introActive"
            v-bind="$attrs"
            data-icon-frame-asset
            data-icon-frame-intro
            alt=""
            aria-hidden="true"
            :src="introUrl"
            draggable="false"
            class="pointer-events-none absolute inset-0 h-full w-full max-w-none object-contain scale-[1.3]"
            @load="startIntroTimer"
            @error="handleIntroError" />
    </template>
</template>

<script setup>
    import { onBeforeUnmount, ref, watch } from 'vue';
    import { storeToRefs } from 'pinia';

    import { useAppearanceSettingsStore, useUserStore } from '../stores';

    defineOptions({ inheritAttrs: false });

    const props = defineProps({
        iconFrame: { type: String, default: '' }
    });

    const { cachedIconFrames } = storeToRefs(useUserStore());
    const { displayVRCProfileEffects } = storeToRefs(useAppearanceSettingsStore());
    const mainUrl = ref('');
    const introUrl = ref('');
    const introActive = ref(false);
    const introDuration = ref(0);
    const mainAssetError = ref(false);
    const introAssetError = ref(false);
    let introTimer;

    function clearIntroTimer() {
        clearTimeout(introTimer);
        introTimer = undefined;
    }

    function startIntroTimer() {
        clearIntroTimer();
        introTimer = setTimeout(() => {
            introActive.value = false;
        }, introDuration.value);
    }

    function handleIntroError() {
        introAssetError.value = true;
        introActive.value = false;
        clearIntroTimer();
    }

    watch(
        () => [props.iconFrame, cachedIconFrames.value.get(props.iconFrame)],
        ([, frame]) => {
            clearIntroTimer();
            mainUrl.value = '';
            introUrl.value = '';
            introActive.value = false;
            introDuration.value = 0;
            mainAssetError.value = false;
            introAssetError.value = false;

            const assets = Array.isArray(frame?.metadata?.assets) ? frame.metadata.assets : [];
            const introAsset = assets.find((asset) => asset?.type === 'introAnimation');
            const mainAsset = assets.find((asset) => asset?.type === 'mainAnimation');
            mainUrl.value = typeof mainAsset?.url === 'string' ? mainAsset.url : '';
            introUrl.value = typeof introAsset?.url === 'string' ? introAsset.url : '';
            if (introUrl.value) {
                introDuration.value = Number.isFinite(introAsset?.totalDurationMs)
                    ? Math.max(0, introAsset.totalDurationMs)
                    : 0;
                introActive.value = true;
            }
        },
        { immediate: true }
    );

    onBeforeUnmount(clearIntroTimer);
</script>
