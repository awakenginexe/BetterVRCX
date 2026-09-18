<template>
    <template v-if="displayVRCProfileEffects">
        <PausableAnimatedImage
            v-if="mainUrl && !mainAssetError"
            :visible="!introActive"
            :paused="animationsPaused"
            fit="cover"
            v-bind="$attrs"
            data-profile-effect-asset
            data-profile-effect-main
            :src="mainUrl"
            class="pointer-events-none absolute inset-0 w-full object-cover"
            @error="mainAssetError = true" />
        <PausableAnimatedImage
            v-if="introUrl && !introAssetError"
            :visible="introActive"
            :paused="animationsPaused"
            fit="cover"
            v-bind="$attrs"
            data-profile-effect-asset
            data-profile-effect-intro
            :src="introUrl"
            class="pointer-events-none absolute inset-0 w-full object-cover"
            @load="startIntroTimer"
            @error="handleIntroError" />
    </template>
</template>

<script setup>
    import { computed, ref, watch } from 'vue';
    import { storeToRefs } from 'pinia';

    import { useAppearanceSettingsStore, useUserStore } from '../stores';
    import { useAppFocus } from '../composables/useAppFocus';
    import { usePausableTimer } from '../composables/usePausableTimer';
    import PausableAnimatedImage from './PausableAnimatedImage.vue';

    defineOptions({ inheritAttrs: false });

    const props = defineProps({
        profileEffect: { type: String, default: '' }
    });

    const { cachedProfileEffects } = storeToRefs(useUserStore());
    const { displayVRCProfileEffects, alwaysAnimateVRCProfileEffects } = storeToRefs(useAppearanceSettingsStore());
    const { isAppFocused } = useAppFocus();
    const mainUrl = ref('');
    const introUrl = ref('');
    const introActive = ref(false);
    const introDuration = ref(0);
    const mainAssetError = ref(false);
    const introAssetError = ref(false);
    const animationsPaused = computed(() => !isAppFocused.value && !alwaysAnimateVRCProfileEffects.value);
    const introTimer = usePausableTimer(() => {
        introActive.value = false;
    }, animationsPaused);

    function startIntroTimer() {
        introTimer.start(introDuration.value);
    }

    function handleIntroError() {
        introAssetError.value = true;
        introActive.value = false;
        introTimer.reset();
    }

    watch(
        () => [props.profileEffect, cachedProfileEffects.value.get(props.profileEffect)],
        ([, effect]) => {
            introTimer.reset();
            mainUrl.value = '';
            introUrl.value = '';
            introActive.value = false;
            introDuration.value = 0;
            mainAssetError.value = false;
            introAssetError.value = false;

            const assets = Array.isArray(effect?.metadata?.assets) ? effect.metadata.assets : [];
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
</script>
