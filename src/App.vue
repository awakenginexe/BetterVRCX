<template>
    <TooltipProvider>
        <MacOSTitleBar></MacOSTitleBar>

        <div
            id="x-app"
            class="bv-app-shell flex flex-col w-screen h-screen overflow-hidden cursor-default [&>.x-container]:pt-[15px]"
            :class="{ 'pt-7': isMacOS }">
            <header v-if="!isMacOS" class="bv-desktop-taskbar" data-shell-region="taskbar">
                <span class="bv-eyebrow">Desktop companion</span>
                <span class="bv-product-label">BetterVRCX</span>
            </header>

            <main class="bv-route-frame">
                <RouterView></RouterView>
            </main>
            <Toaster position="top-center" :theme="theme"></Toaster>

            <AlertDialogModal></AlertDialogModal>
            <PromptDialogModal></PromptDialogModal>
            <OtpDialogModal></OtpDialogModal>
            <DatabaseUpgradeDialog></DatabaseUpgradeDialog>

            <VRCXUpdateDialog></VRCXUpdateDialog>
        </div>
        <div id="x-dialog-portal" class="x-dialog-portal"></div>
    </TooltipProvider>
</template>

<script setup>
    import { computed, onBeforeMount, onMounted } from 'vue';

    import { addGameLogEvent, getGameLogTable } from './coordinators/gameLogCoordinator';
    import {
        runCheckVRChatDebugLoggingFlow,
        runUpdateIsGameRunningFlow,
        runUpdateIsHmdAfkFlow
    } from './coordinators/gameCoordinator';
    import { Toaster } from './components/ui/sonner';
    import { TooltipProvider } from './components/ui/tooltip';
    import { createGlobalStores } from './stores';
    import { initNoty } from './plugins/noty';

    import AlertDialogModal from './components/ui/alert-dialog/AlertDialogModal.vue';
    import DatabaseUpgradeDialog from './components/dialogs/DatabaseUpgradeDialog.vue';
    import MacOSTitleBar from './components/MacOSTitleBar.vue';
    import OtpDialogModal from './components/ui/dialog/OtpDialogModal.vue';
    import PromptDialogModal from './components/ui/dialog/PromptDialogModal.vue';
    import VRCXUpdateDialog from './components/dialogs/VRCXUpdateDialog.vue';

    import '@/styles/globals.css';

    console.log(`isLinux: ${LINUX}`);

    const isMacOS = computed(() => navigator.platform.includes('Mac'));

    const theme = computed(() => {
        return store.appearanceSettings.isDarkMode ? 'dark' : 'light';
    });

    initNoty();

    const store = createGlobalStores();

    if (typeof window !== 'undefined') {
        window.$pinia = store;
        // Bridge: attach coordinator functions to store for C# IPC callbacks
        store.game.updateIsGameRunning = runUpdateIsGameRunningFlow;
        store.game.updateIsHmdAfk = runUpdateIsHmdAfkFlow;
        store.gameLog.addGameLogEvent = addGameLogEvent;
    }

    onBeforeMount(() => {
        store.updateLoop.updateLoop();
    });

    onMounted(async () => {
        if (await store.vrcx.waitForDatabaseInit()) {
            getGameLogTable();
            await store.auth.migrateStoredUsers();
            store.auth.autoLoginAfterMounted();
            store.vrcx.checkAutoBackupRestoreVrcRegistry();
        }

        runCheckVRChatDebugLoggingFlow();
    });
</script>

<style scoped>
    .bv-app-shell {
        background: var(--bv-bg-base);
        color: var(--bv-text-strong);
    }

    .bv-desktop-taskbar {
        display: flex;
        align-items: center;
        gap: 10px;
        height: 40px;
        flex: 0 0 40px;
        padding: 0 16px;
        border-bottom: 1px solid var(--bv-border-default);
        background: var(--bv-bg-rail);
        -webkit-app-region: drag;
    }

    .bv-product-label {
        color: var(--bv-text-strong);
        font-size: 13px;
        font-weight: 750;
        letter-spacing: 0.01em;
    }

    .bv-route-frame {
        display: flex;
        min-width: 0;
        min-height: 0;
        flex: 1;
    }

    .bv-route-frame > :deep(*) {
        min-width: 0;
        min-height: 0;
        flex: 1;
    }
</style>
