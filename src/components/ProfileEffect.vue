<template>
    <template v-if="displayVRCProfileEffects">
        <img
            v-if="mainUrl && !mainAssetError"
            v-show="!introActive"
            v-bind="$attrs"
            data-profile-effect-asset
            data-profile-effect-main
            alt=""
            aria-hidden="true"
            :src="mainUrl"
            draggable="false"
            class="pointer-events-none absolute inset-0 w-full object-cover"
            @error="mainAssetError = true" />
        <img
            v-if="introUrl && !introAssetError"
            v-show="introActive"
            v-bind="$attrs"
            data-profile-effect-asset
            data-profile-effect-intro
            alt=""
            aria-hidden="true"
            :src="introUrl"
            draggable="false"
            class="pointer-events-none absolute inset-0 w-full object-cover"
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
        profileEffect: { type: String, default: '' }
    });

    const { cachedProfileEffects } = storeToRefs(useUserStore());
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
        () => [props.profileEffect, cachedProfileEffects.value.get(props.profileEffect)],
        ([, effect]) => {
            clearIntroTimer();
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

    onBeforeUnmount(clearIntroTimer);
</script>
