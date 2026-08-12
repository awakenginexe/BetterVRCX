<template>
    <div v-if="isMacOS" class="macos-title-bar">
        <div class="title-bar-content">
            <div class="traffic-lights-spacer"></div>
            <div class="title-bar-center">
                <span class="app-title">BetterVRCX</span>
            </div>
            <div class="title-bar-right"></div>
        </div>
    </div>
</template>

<script setup>
    import { computed, onMounted } from 'vue';

    const isMacOS = computed(() => {
        return navigator.platform.indexOf('Mac') > -1;
    });

    onMounted(() => {
        if (isMacOS.value) {
            const titleBar = document.querySelector('.macos-title-bar');
            if (titleBar) {
                titleBar.classList.add('draggable');
            }
        }
    });
</script>

<style scoped>
    .macos-title-bar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 28px;
        z-index: 9999;
        user-select: none;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-bottom: 1px solid var(--bv-border);
        background: color-mix(in srgb, var(--bv-bg-rail) 88%, transparent);
        transition: all 0.2s ease;
    }

    .macos-title-bar.draggable {
        -webkit-app-region: drag;
    }

    .title-bar-content {
        display: flex;
        align-items: center;
        height: 100%;
        padding: 0 12px;
    }

    .traffic-lights-spacer {
        width: 78px;
        flex-shrink: 0;
    }

    .title-bar-center {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .app-title {
        color: var(--bv-text-strong);
        font-size: 13px;
        font-weight: 600;
        line-height: 1;
        transition: all 0.2s ease;
    }

    .title-bar-right {
        width: 78px;
        flex-shrink: 0;
    }

    /* Hover effects */
    .macos-title-bar:hover {
        backdrop-filter: blur(30px);
        -webkit-backdrop-filter: blur(30px);
    }

    .macos-title-bar:hover {
        background: color-mix(in srgb, var(--bv-bg-control) 94%, transparent);
    }
</style>
