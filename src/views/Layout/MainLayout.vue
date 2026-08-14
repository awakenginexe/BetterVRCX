<template>
    <template v-if="watchState.isLoggedIn">
        <div class="bv-main-shell flex flex-col flex-1 h-full min-h-0 min-w-0 overflow-hidden">
            <SidebarProvider
                :open="sidebarOpen"
                :width="navWidth"
                :width-icon="60"
                class="bv-left-rail relative flex-1 h-full min-w-0 min-h-0"
                data-shell-region="left-rail"
                @update:open="handleSidebarOpenChange">
                <NavMenu />

                <div
                    v-show="sidebarOpen"
                    class="bv-nav-resize-handle absolute top-0 bottom-0 z-30 w-1 cursor-ew-resize select-none"
                    :style="{ left: 'var(--sidebar-width)' }"
                    aria-label="Resize navigation"
                    @pointerdown.prevent="startNavResize" />

                <SidebarInset class="bv-center-frame min-w-0">
                    <ResizablePanelGroup
                        direction="horizontal"
                        :class="[
                            'group/main-layout flex-1 h-full min-w-0',
                            { 'aside-collapsed': isAsideCollapsedStatic }
                        ]"
                        @layout="handleLayout">
                        <template #default="{ layout }">
                            <ResizablePanel id="main-content-panel" :order="1">
                                <div class="bv-route-content" data-shell-region="content">
                                    <RouterView v-slot="{ Component }">
                                        <KeepAlive exclude="ChartsInstance, ChartsMutual">
                                            <component :is="Component" />
                                        </KeepAlive>
                                    </RouterView>
                                </div>
                            </ResizablePanel>

                            <ResizableHandle
                                with-handle
                                :class="[
                                    isAsideCollapsedStatic ? 'opacity-100' : 'opacity-0',
                                    'z-20 [&>div]:-translate-x-1/2'
                                ]"
                                @dragging="handleAsideDragging"></ResizableHandle>
                            <ResizablePanel
                                id="right-sidebar-panel"
                                ref="asidePanelRef"
                                :default-size="asideDefaultSize"
                                :min-size="asideMinSize"
                                :max-size="asideMaxSize"
                                :collapsed-size="asideCollapsedSize"
                                :size-unit="asideSizeUnit"
                                collapsible
                                :order="2"
                                class="bv-right-rail-panel">
                                <Sidebar :compact="isAsideCollapsedStatic"></Sidebar>
                            </ResizablePanel>
                        </template>
                    </ResizablePanelGroup>
                </SidebarInset>
            </SidebarProvider>
            <StatusBar />
        </div>

        <!-- ## Dialogs ## -->
        <MainDialogContainer></MainDialogContainer>

        <InviteGroupDialog></InviteGroupDialog>

        <FullscreenImagePreview></FullscreenImagePreview>

        <LaunchDialog></LaunchDialog>

        <LaunchOptionsDialog></LaunchOptionsDialog>

        <FriendImportDialog></FriendImportDialog>

        <WorldImportDialog></WorldImportDialog>

        <AvatarImportDialog></AvatarImportDialog>

        <ChooseFavoriteGroupDialog></ChooseFavoriteGroupDialog>

        <VRChatConfigDialog></VRChatConfigDialog>

        <PrimaryPasswordDialog></PrimaryPasswordDialog>

        <SendBoopDialog></SendBoopDialog>

        <GlobalToolsDialogs></GlobalToolsDialogs>

        <ChangelogDialog></ChangelogDialog>

        <WhatsNewDialog></WhatsNewDialog>

        <SpotlightDialog></SpotlightDialog>
    </template>
</template>

<script setup>
    import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
    import { storeToRefs } from 'pinia';
    import { useRouter } from 'vue-router';

    import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../../components/ui/resizable';
    import { SidebarInset, SidebarProvider } from '../../components/ui/sidebar';
    import { useAppearanceSettingsStore } from '../../stores';
    import { useMainLayoutResizable } from '../../composables/useMainLayoutResizable';
    import { watchState } from '../../services/watchState';

    import AvatarImportDialog from '../Favorites/dialogs/AvatarImportDialog.vue';
    import ChangelogDialog from '../Settings/dialogs/ChangelogDialog.vue';
    import ChooseFavoriteGroupDialog from '../../components/dialogs/ChooseFavoriteGroupDialog.vue';
    import FriendImportDialog from '../Favorites/dialogs/FriendImportDialog.vue';
    import FullscreenImagePreview from '../../components/FullscreenImagePreview.vue';
    import GlobalToolsDialogs from '../Tools/components/GlobalToolsDialogs.vue';
    import GroupMemberModerationDialog from '../../components/dialogs/GroupDialog/GroupMemberModerationDialog.vue';
    import InviteGroupDialog from '../../components/dialogs/InviteGroupDialog.vue';
    import LaunchDialog from '../../components/dialogs/LaunchDialog.vue';
    import LaunchOptionsDialog from '../Settings/dialogs/LaunchOptionsDialog.vue';
    import MainDialogContainer from '../../components/dialogs/MainDialogContainer.vue';
    import NavMenu from '../../components/nav-menu/NavMenu.vue';
    import PrimaryPasswordDialog from '../Settings/dialogs/PrimaryPasswordDialog.vue';
    import SendBoopDialog from '../../components/dialogs/SendBoopDialog.vue';
    import Sidebar from '../Sidebar/Sidebar.vue';
    import StatusBar from '../../components/StatusBar.vue';
    import VRChatConfigDialog from '../Settings/dialogs/VRChatConfigDialog.vue';
    import WorldImportDialog from '../Favorites/dialogs/WorldImportDialog.vue';
    import WhatsNewDialog from '../../components/onboarding/WhatsNewDialog.vue';
    import SpotlightDialog from '../../components/onboarding/SpotlightDialog.vue';

    const router = useRouter();

    const appearanceSettingsStore = useAppearanceSettingsStore();
    const {
        navWidth,
        rightSidebarWidth,
        isNavCollapsed,
        isRightSidebarCollapsed
    } = storeToRefs(appearanceSettingsStore);

    const sidebarOpen = computed(() => !isNavCollapsed.value);

    const handleSidebarOpenChange = (open) => {
        appearanceSettingsStore.setNavCollapsed(!open);
    };

    let cleanupNavResize = null;
    const startNavResize = (event) => {
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = navWidth.value;

        const onPointerMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            appearanceSettingsStore.setNavWidth(startWidth + deltaX);
        };

        const onPointerUp = () => {
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerUp);
            cleanupNavResize = null;
        };

        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
        document.addEventListener('pointercancel', onPointerUp);
        cleanupNavResize = onPointerUp;
    };

    onUnmounted(() => {
        cleanupNavResize?.();
    });

    const {
        asideDefaultSize,
        asideCollapsedSize,
        asideSizeUnit,
        asideMinSize,
        asideMaxSize,
        handleLayout,
        persistLatestLayout,
        isAsideCollapsedStatic,
        isSideBarTabShow
    } = useMainLayoutResizable();

    const asidePanelRef = ref(null);

    const handleAsideDragging = (isDragging) => {
        if (!isDragging) {
            persistLatestLayout();
        }
    };

    watch(isSideBarTabShow, async (show) => {
        await nextTick();
        if (show) {
            if (!isRightSidebarCollapsed.value) {
                asidePanelRef.value?.expand();
            } else {
                asidePanelRef.value?.collapse();
            }
        } else {
            asidePanelRef.value?.collapse();
        }
    });

    watch(isRightSidebarCollapsed, async (collapsed) => {
        if (!isSideBarTabShow.value) return;
        await nextTick();
        if (collapsed) {
            asidePanelRef.value?.collapse();
        } else {
            asidePanelRef.value?.expand();
        }
    });

    watch(rightSidebarWidth, async (width) => {
        if (!isSideBarTabShow.value || isRightSidebarCollapsed.value) return;
        await nextTick();
        asidePanelRef.value?.resize(width);
    });

    watch(
        () => watchState.isLoggedIn,
        (isLoggedIn) => {
            if (!isLoggedIn) {
                router.replace({ name: 'login' });
            }
        },
        { immediate: true }
    );
</script>

<style scoped>
    .bv-main-shell {
        background: var(--bv-bg-base);
    }

    .bv-left-rail :deep([data-sidebar='sidebar']) {
        border-right: 1px solid var(--bv-border-default);
        background: var(--bv-bg-rail);
    }

    .bv-nav-resize-handle {
        transition: background-color var(--bv-duration-fast) var(--bv-ease-out);
    }

    .bv-nav-resize-handle:hover,
    .bv-nav-resize-handle:focus-visible {
        background: var(--bv-accent-primary);
    }

    .bv-center-frame {
        background: var(--bv-bg-base);
    }

    .bv-route-content {
        display: flex;
        min-width: 0;
        min-height: 0;
        height: 100%;
        padding-inline: var(--bv-space-4);
    }

    .bv-route-content > :deep(*) {
        min-width: 0;
        min-height: 0;
        flex: 1;
    }

    .bv-right-rail-panel {
        min-width: 0;
        overflow: hidden;
        border-left: 1px solid var(--bv-border-default);
        background: var(--bv-bg-rail);
    }

    @media (min-width: 1024px) {
        .bv-route-content {
            padding-inline: var(--bv-space-5);
        }
    }
</style>
