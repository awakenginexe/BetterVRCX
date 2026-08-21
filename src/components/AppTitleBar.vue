<template>
    <div
        data-testid="app-title-bar"
        class="app-title-bar"
        @pointerdown="handlePointerDown"
        @dblclick="handleDoubleClick">
        <div class="app-title-bar-brand">
            <img
                data-testid="app-title-bar-logo"
                class="app-title-bar-logo"
                :src="appLogo"
                alt="BetterVRCX"
                draggable="false" />
            <span class="app-title-bar-name">BetterVRCX</span>
            <span
                data-testid="app-version-tag"
                class="app-version-tag"
                :class="`app-version-tag--${versionStatus}`"
                :aria-label="versionStatusLabel"
                :title="versionStatusLabel">
                {{ versionLabel }}
            </span>
            <span v-if="buildLabel" data-testid="app-build-tag" class="app-build-tag">
                {{ buildLabel }}
            </span>
        </div>

        <div class="app-title-bar-status">
            <slot name="status" />
        </div>

        <div class="app-title-bar-controls" aria-label="Window controls">
            <button
                data-testid="window-minimize"
                type="button"
                class="window-control window-control--minimize"
                aria-label="Minimize window"
                title="Minimize"
                @pointerdown.stop
                @click.stop="minimizeWindow">
                <Minus :size="14" :stroke-width="2" />
            </button>
            <button
                data-testid="window-maximize"
                type="button"
                class="window-control window-control--maximize"
                aria-label="Maximize or restore window"
                title="Maximize or restore"
                @pointerdown.stop
                @click.stop="toggleMaximizeWindow">
                <Minimize2 v-if="isMaximized" :size="14" :stroke-width="2" />
                <Square v-else :size="13" :stroke-width="2" />
            </button>
            <button
                data-testid="window-close"
                type="button"
                class="window-control window-control--close"
                aria-label="Close window"
                title="Close"
                @pointerdown.stop
                @click.stop="closeWindow">
                <X :size="15" :stroke-width="2" />
            </button>
        </div>
    </div>
</template>

<script setup>
    import { computed, onMounted, onUnmounted, ref } from 'vue';
    import { Minus, Minimize2, Square, X } from 'lucide-vue-next';

    import { getVersionStatus, parseAppVersion, VERSION_STATUS } from './appTitleBarUtils';

    const props = defineProps({
        appVersion: {
            type: String,
            default: ''
        },
        latestAppVersion: {
            type: String,
            default: ''
        },
        checkingForUpdate: {
            type: Boolean,
            default: false
        }
    });

    const appLogo = new URL('../../images/BetterVRCX.png', import.meta.url).href;
    const isMaximized = ref(false);

    const parsedVersion = computed(() => parseAppVersion(props.appVersion));
    const versionLabel = computed(() => parsedVersion.value.version);
    const buildLabel = computed(() => parsedVersion.value.build);
    const versionStatus = computed(() =>
        getVersionStatus(props.appVersion, props.latestAppVersion, props.checkingForUpdate)
    );

    const versionStatusLabel = computed(() => {
        const labels = {
            [VERSION_STATUS.LATEST]: 'Latest version',
            [VERSION_STATUS.OUTDATED]: 'Update available',
            [VERSION_STATUS.OFFLINE]: 'Version status unavailable'
        };
        return `${versionLabel.value}: ${labels[versionStatus.value]}`;
    });

    function getNativeMethod(name) {
        const api = typeof window !== 'undefined' ? window.AppApi : undefined;
        const method = api?.[name];
        return typeof method === 'function' ? method.bind(api) : null;
    }

    async function invokeNative(name) {
        const method = getNativeMethod(name);
        if (!method) return undefined;

        try {
            return await method();
        } catch (error) {
            console.warn(`Unable to invoke native window action: ${name}`, error);
            return undefined;
        }
    }

    async function refreshWindowState() {
        const state = await invokeNative('IsWindowMaximized');
        if (typeof state === 'boolean') {
            isMaximized.value = state;
        }
    }

    function handlePointerDown(event) {
        if (event.button !== 0 || isInteractiveTarget(event.target)) return;
        void invokeNative('BeginWindowDrag');
    }

    function handleDoubleClick(event) {
        if (isInteractiveTarget(event.target)) return;
        void toggleMaximizeWindow();
    }

    function isInteractiveTarget(target) {
        return target.closest('button, .no-drag, input, select, textarea, [role="button"]');
    }

    async function minimizeWindow() {
        await invokeNative('MinimizeWindow');
    }

    async function toggleMaximizeWindow() {
        await invokeNative('ToggleMaximizeWindow');
        await refreshWindowState();
    }

    async function closeWindow() {
        await invokeNative('CloseWindow');
    }

    onMounted(() => {
        void refreshWindowState();
        window.addEventListener('resize', refreshWindowState);
    });

    onUnmounted(() => {
        window.removeEventListener('resize', refreshWindowState);
    });
</script>

<style scoped>
    .app-title-bar {
        position: fixed;
        inset: 0 0 auto;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 32px;
        padding-left: 10px;
        user-select: none;
        color: var(--bv-text-strong);
        background: color-mix(in srgb, var(--bv-bg-rail) 94%, transparent);
        border-bottom: 1px solid var(--bv-border-default);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
    }

    .app-title-bar-brand,
    .app-title-bar-status,
    .app-title-bar-controls {
        display: flex;
        align-items: center;
    }

    .app-title-bar-brand {
        min-width: 0;
        gap: 7px;
        height: 100%;
        overflow: hidden;
    }

    .app-title-bar-status {
        min-width: 0;
        flex: 1 1 auto;
        height: 100%;
        overflow: hidden;
    }

    .app-title-bar-status :deep(.bv-top-taskbar-inner) {
        min-width: 0;
        padding-right: 4px;
    }

    .app-title-bar-logo {
        width: 18px;
        height: 18px;
        flex: 0 0 auto;
        object-fit: contain;
        border-radius: 4px;
    }

    .app-title-bar-name {
        flex: 0 0 auto;
        color: var(--bv-text-strong);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: -0.01em;
    }

    .app-version-tag,
    .app-build-tag {
        display: inline-flex;
        align-items: center;
        min-height: 19px;
        padding: 2px 7px;
        border: 1px solid transparent;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 650;
        line-height: 1;
        white-space: nowrap;
    }

    .app-version-tag--latest {
        color: #86efac;
        background: rgb(34 197 94 / 0.12);
        border-color: rgb(74 222 128 / 0.3);
    }

    .app-version-tag--outdated {
        color: #fdba74;
        background: rgb(249 115 22 / 0.14);
        border-color: rgb(251 146 60 / 0.34);
    }

    .app-version-tag--offline {
        color: #cbd5e1;
        background: rgb(148 163 184 / 0.14);
        border-color: rgb(148 163 184 / 0.3);
    }

    .app-build-tag {
        color: #f8fafc;
        background: rgb(255 255 255 / 0.08);
        border-color: rgb(255 255 255 / 0.14);
    }

    .app-title-bar-controls {
        align-self: stretch;
    }

    .window-control {
        display: inline-flex;
        width: 42px;
        height: 32px;
        align-items: center;
        justify-content: center;
        border: 0;
        color: var(--control-color);
        background: transparent;
        cursor: pointer;
        transition: background-color 120ms ease;
    }

    .window-control:hover,
    .window-control:focus-visible {
        background: var(--control-hover);
    }

    .window-control:focus-visible {
        outline: 1px solid var(--control-color);
        outline-offset: -3px;
    }

    .window-control--minimize {
        --control-color: #facc15;
        --control-hover: rgb(250 204 21 / 0.14);
    }

    .window-control--maximize {
        --control-color: #4ade80;
        --control-hover: rgb(74 222 128 / 0.14);
    }

    .window-control--close {
        --control-color: #f87171;
        --control-hover: rgb(248 113 113 / 0.18);
    }
</style>
