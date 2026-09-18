<template>
    <div
        v-if="displayVRCProfileEffects && hasPresentation"
        v-bind="$attrs"
        data-nameplate-effect
        :data-variant="variant"
        class="pointer-events-none absolute overflow-hidden"
        :class="variant === 'sidebar' ? 'inset-0 z-0 rounded-[inherit]' : 'right-0 top-[105px] h-[50px] w-full'">
        <div
            v-if="nameplateStyle"
            class="absolute inset-0"
            :class="{ 'opacity-55': variant === 'sidebar' }"
            :style="nameplateStyle"></div>
        <PausableAnimatedImage
            v-if="mainUrl && !mainAssetError"
            :visible="!introActive"
            :paused="animationsPaused"
            :fit="variant === 'sidebar' ? 'cover' : 'contain'"
            :position="variant === 'sidebar' ? 'center' : 'right'"
            data-nameplate-effect-asset
            data-nameplate-effect-main
            :src="mainUrl"
            class="absolute h-full"
            :class="
                variant === 'sidebar'
                    ? 'inset-0 w-full object-cover object-center opacity-60'
                    : 'right-0 top-0 w-auto object-contain object-right'
            "
            @error="mainAssetError = true" />
        <PausableAnimatedImage
            v-if="introUrl && !introAssetError"
            :visible="introActive"
            :paused="animationsPaused"
            :fit="variant === 'sidebar' ? 'cover' : 'contain'"
            :position="variant === 'sidebar' ? 'center' : 'right'"
            data-nameplate-effect-asset
            data-nameplate-effect-intro
            :src="introUrl"
            class="absolute h-full"
            :class="
                variant === 'sidebar'
                    ? 'inset-0 w-full object-cover object-center opacity-60'
                    : 'right-0 top-0 w-auto object-contain object-right'
            "
            @load="startIntroTimer"
            @error="handleIntroError" />
        <div v-if="variant === 'sidebar'" class="absolute inset-0 bg-background/25"></div>
    </div>
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
        nameplateEffect: { type: String, default: '' },
        variant: {
            type: String,
            default: 'profile',
            validator: (value) => ['profile', 'sidebar'].includes(value)
        }
    });

    const { cachedNameplateEffects } = storeToRefs(useUserStore());
    const { displayVRCProfileEffects, alwaysAnimateVRCProfileEffects } = storeToRefs(useAppearanceSettingsStore());
    const { isAppFocused } = useAppFocus();
    const mainUrl = ref('');
    const introUrl = ref('');
    const introActive = ref(false);
    const introDuration = ref(0);
    const nameplateStyle = ref(null);
    const mainAssetError = ref(false);
    const introAssetError = ref(false);
    const hasPresentation = computed(
        () =>
            Boolean(nameplateStyle.value) ||
            Boolean(mainUrl.value && !mainAssetError.value) ||
            Boolean(introUrl.value && !introAssetError.value)
    );
    const animationsPaused = computed(() => !isAppFocused.value && !alwaysAnimateVRCProfileEffects.value);
    const introTimer = usePausableTimer(() => {
        introActive.value = false;
    }, animationsPaused);

    function normalizeGradientColor(value) {
        if (typeof value !== 'string') {
            return '';
        }
        const color = value.trim().replace(/^#/, '');
        return /^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(color) ? `#${color}` : '';
    }

    function startIntroTimer() {
        introTimer.start(introDuration.value);
    }

    function handleIntroError() {
        introAssetError.value = true;
        introActive.value = false;
        introTimer.reset();
    }

    watch(
        () => [props.nameplateEffect, cachedNameplateEffects.value.get(props.nameplateEffect)],
        ([, effect]) => {
            introTimer.reset();
            mainUrl.value = '';
            introUrl.value = '';
            introActive.value = false;
            introDuration.value = 0;
            nameplateStyle.value = null;
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

            const gradientStart = normalizeGradientColor(effect?.metadata?.gradientStart);
            const gradientEnd = normalizeGradientColor(effect?.metadata?.gradientEnd);
            if (gradientStart && gradientEnd) {
                nameplateStyle.value = {
                    backgroundImage: `linear-gradient(90deg, ${gradientStart}, ${gradientEnd})`
                };
            }
        },
        { immediate: true }
    );
</script>
