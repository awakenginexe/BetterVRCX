<template>
    <Sidebar
        side="left"
        variant="sidebar"
        collapsible="icon"
        class="bv-left-navigation"
        aria-label="BetterVRCX navigation">
        <SidebarHeader class="px-2 pt-2 pb-1 space-y-1">
            <!-- Home Hub Navigation Item -->
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        :tooltip="t('nav_tooltip.home') || t('view.home.title') || 'Home'"
                        :is-active="isHomeActive"
                        :class="['bv-nav-item bv-focus-ring', { 'bv-nav-item-active': isHomeActive }]"
                        data-nav-key="home"
                        @click="handleHomeClick">
                        <div class="bv-nav-icon-box">
                            <i class="ri-home-5-line text-lg relative" />
                        </div>
                        <div v-show="!isCollapsed" class="bv-nav-content-box flex flex-col min-w-0 flex-1">
                            <span class="bv-nav-item-title truncate font-medium text-xs leading-tight">{{
                                t('nav_tooltip.home') || t('view.home.title') || 'Home'
                            }}</span>
                            <span class="bv-nav-item-desc text-[11px] text-muted-foreground/75 truncate leading-tight mt-0.5">{{
                                getNavItemDescription({ key: 'home' })
                            }}</span>
                        </div>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarHeader>

        <ContextMenu>
            <ContextMenuTrigger as-child>
                <SidebarContent class="pt-0.5 px-2" style="container-type: inline-size">
                    <SidebarGroup class="p-0">
                        <SidebarGroupContent>
                            <SidebarMenu v-if="navLayoutReady">
                                <template v-for="item in menuItems" :key="item.index">
                                    <SidebarMenuItem v-if="!item.children?.length">
                                        <ContextMenu>
                                            <ContextMenuTrigger as-child>
                                                <SidebarMenuButton
                                                    :is-active="activeMenuIndex === item.index"
                                                    :tooltip="getItemTooltip(item)"
                                                    :data-nav-key="item.index"
                                                    :class="[
                                                        'bv-nav-item bv-focus-ring',
                                                        { 'bv-nav-item-active': activeMenuIndex === item.index }
                                                    ]"
                                                    @click="handleMenuItemClick(item)">
                                                    <div class="bv-nav-icon-box">
                                                        <i :class="item.icon" class="text-lg relative">
                                                            <span
                                                                v-if="isNavItemNotified(item)"
                                                                class="bv-status-dot bv-nav-notify-dot"
                                                                data-status="danger"
                                                                role="img"
                                                                :aria-label="t('nav_menu.mark_all_read')"
                                                                :class="{ '-right-1!': isCollapsed }"></span>
                                                        </i>
                                                    </div>
                                                    <div v-show="!isCollapsed" class="bv-nav-content-box flex flex-col min-w-0 flex-1">
                                                        <span class="bv-nav-item-title truncate font-medium text-xs leading-tight">{{
                                                            item.titleIsCustom ? item.title : t(item.title || '')
                                                        }}</span>
                                                        <span class="bv-nav-item-desc text-[11px] text-muted-foreground/75 truncate leading-tight mt-0.5">{{
                                                            getNavItemDescription(item)
                                                        }}</span>
                                                    </div>
                                                    <span
                                                        v-if="item.action === 'direct-access' && !isCollapsed"
                                                        class="nav-shortcut-hint ml-auto inline-flex items-center gap-1 shrink-0">
                                                        <Kbd>{{ isMac ? '⌘' : 'Ctrl' }}</Kbd>
                                                        <Kbd>D</Kbd>
                                                    </span>
                                                </SidebarMenuButton>
                                            </ContextMenuTrigger>
                                            <ContextMenuContent>
                                                <ContextMenuItem v-if="hasNotifications" @click="clearAllNotifications">
                                                    {{ t('nav_menu.mark_all_read') }}
                                                </ContextMenuItem>
                                                <ContextMenuSeparator v-if="hasNotifications" />
                                                <template v-if="isDashboardItem(item)">
                                                    <ContextMenuItem @click="handleEditDashboard(item)">
                                                        {{ t('nav_menu.edit_dashboard') }}
                                                    </ContextMenuItem>
                                                    <ContextMenuItem
                                                        variant="destructive"
                                                        @click="handleDeleteDashboard(item)">
                                                        {{ t('nav_menu.delete_dashboard') }}
                                                    </ContextMenuItem>
                                                    <ContextMenuSeparator />
                                                </template>
                                                <ContextMenuItem
                                                    v-if="isToolItem(item)"
                                                    @click="handleUnpinToolItem(item)">
                                                    {{ t('nav_menu.custom_nav.unpin_from_nav') }}
                                                </ContextMenuItem>
                                                <ContextMenuSeparator v-if="isToolItem(item)" />
                                                <ContextMenuItem @click="handleOpenCustomNavDialog">
                                                    {{ t('nav_menu.custom_nav.header') }}
                                                </ContextMenuItem>
                                            </ContextMenuContent>
                                        </ContextMenu>
                                    </SidebarMenuItem>

                                    <NavMenuFolderItem
                                        v-else
                                        :item="item"
                                        :is-collapsed="isCollapsed"
                                        :active-menu-index="activeMenuIndex"
                                        :collapsed-dropdown-open-id="collapsedDropdownOpenId"
                                        :has-notifications="hasNotifications"
                                        :is-entry-notified="isEntryNotified"
                                        :is-nav-item-notified="isNavItemNotified"
                                        :is-dashboard-item="isDashboardItem"
                                        :is-tool-item="isToolItem"
                                        @collapsed-dropdown-open-change="handleCollapsedDropdownOpenChange"
                                        @collapsed-submenu-select="handleCollapsedSubmenuSelect"
                                        @submenu-click="handleSubmenuClick"
                                        @clear-notifications="clearAllNotifications"
                                        @edit-dashboard="handleEditDashboard"
                                        @delete-dashboard="handleDeleteDashboard"
                                        @unpin-tool="handleUnpinToolItem"
                                        @open-custom-nav="handleOpenCustomNavDialog" />
                                </template>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem v-if="hasNotifications" @click="clearAllNotifications">
                    {{ t('nav_menu.mark_all_read') }}
                </ContextMenuItem>
                <ContextMenuSeparator v-if="hasNotifications" />
                <ContextMenuItem @click="handleQuickCreateDashboard">
                    {{ t('dashboard.new_dashboard') }}
                </ContextMenuItem>
                <ContextMenuItem @click="handleOpenCustomNavDialog">
                    {{ t('nav_menu.custom_nav.header') }}
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>

        <NavMenuFooter
            :is-collapsed="isCollapsed"
            :is-dark-mode="isDarkMode"
            :has-pending-update="pendingVRCXUpdate"
            :has-pending-install="!!pendingVRCXInstall"
            :show-new-dashboard-button="showNewDashboardButton"
            :version="version"
            :vrcx-logo="vrcxLogo"
            :themes="themes"
            :theme-mode="themeMode"
            :table-density="tableDensity"
            :theme-colors="themeColors"
            :current-theme-color="currentThemeColor"
            :is-applying-theme-color="isApplyingThemeColor"
            :theme-display-name="themeDisplayName"
            :theme-color-display-name="themeColorDisplayName"
            @show-changelog="showChangeLogDialog"
            @support-link="handleSupportLink"
            @toggle-theme="handleThemeToggle"
            @show-vrcx-update-dialog="showVRCXUpdateDialog"
            @settings-click="handleSettingsClick"
            @theme-select="handleThemeSelect"
            @theme-color-select="handleThemeColorSelect"
            @table-density-select="handleTableDensitySelect"
            @open-custom-nav="handleOpenCustomNavDialog"
            @logout-click="handleLogoutClick"
            @toggle-nav-collapse="toggleNavCollapse"
            @quick-create-dashboard="handleQuickCreateDashboard"
            @open-github="openGithub" />
    </Sidebar>

    <CustomNavDialog
        v-model:visible="customNavDialogVisible"
        :layout="navLayout"
        :hidden-keys="navHiddenKeys"
        :default-hidden-keys="defaultHiddenKeys"
        :default-layout="defaultNavLayout"
        :definitions="allNavDefinitions"
        @save="handleCustomNavSave"
        @dashboard-created="handleDashboardCreated" />
</template>

<script setup>
    import { computed, h, onMounted, ref, watch } from 'vue';

    import { storeToRefs } from 'pinia';
    import { Plus } from 'lucide-vue-next';
    import { useI18n } from 'vue-i18n';
    import { useRouter } from 'vue-router';

    import { useNavLayout } from './composables/useNavLayout';
    import { useNavTheme } from './composables/useNavTheme';
    import { useToolActions } from '../../composables/useToolActions';
    import { useToolNavPinning } from '../../composables/useToolNavPinning';
    import { Kbd } from '@/components/ui/kbd';
    import {
        ContextMenu,
        ContextMenuContent,
        ContextMenuItem,
        ContextMenuSeparator,
        ContextMenuTrigger
    } from '@/components/ui/context-menu';
    import {
        Sidebar,
        SidebarContent,
        SidebarGroup,
        SidebarGroupContent,
        SidebarHeader,
        SidebarMenu,
        SidebarMenuButton,
        SidebarMenuItem
    } from '@/components/ui/sidebar';

    import {
        useAppearanceSettingsStore,
        useAuthStore,
        useDashboardStore,
        useModalStore,
        useSearchStore,
        useUiStore,
        useVRCXUpdaterStore
    } from '../../stores';
    import { isEntryNotified as checkEntryNotified } from './navMenuUtils';
    import { DASHBOARD_NAV_KEY_PREFIX, links } from '../../shared/constants';
    import { openExternalLink } from '../../shared/utils';

    import NavMenuFolderItem from './NavMenuFolderItem.vue';
    import NavMenuFooter from './NavMenuFooter.vue';

    import CustomNavDialog from '../dialogs/CustomNavDialog.vue';

    const { t, locale } = useI18n();
    const router = useRouter();
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    const VRCXUpdaterStore = useVRCXUpdaterStore();
    const { pendingVRCXUpdate, pendingVRCXInstall, appVersion } = storeToRefs(VRCXUpdaterStore);
    const { showVRCXUpdateDialog, showChangeLogDialog } = VRCXUpdaterStore;

    const dashboardStore = useDashboardStore();
    const { dashboards } = storeToRefs(dashboardStore);

    const uiStore = useUiStore();
    const { notifiedMenus } = storeToRefs(uiStore);
    const { clearAllNotifications } = uiStore;

    const { directAccessPaste } = useSearchStore();
    const { triggerTool } = useToolActions();
    const { unpinToolFromNav } = useToolNavPinning();
    const { logout } = useAuthStore();
    const modalStore = useModalStore();

    const appearanceSettingsStore = useAppearanceSettingsStore();
    const {
        themeMode,
        tableDensity,
        isDarkMode,
        isNavCollapsed: isCollapsed,
        showNewDashboardButton
    } = storeToRefs(appearanceSettingsStore);

    const {
        themes,
        themeColors,
        currentThemeColor,
        isApplyingThemeColor,
        initThemeColor,
        themeDisplayName,
        themeColorDisplayName,
        handleThemeSelect,
        handleThemeToggle,
        handleTableDensitySelect,
        handleThemeColorSelect
    } = useNavTheme({
        t,
        appearanceSettingsStore
    });

    const {
        navLayout,
        navLayoutReady,
        navHiddenKeys,
        defaultHiddenKeys,
        menuItems,
        activeMenuIndex,
        allNavDefinitions,
        defaultNavLayout,
        sanitizeLayoutLocal,
        saveNavLayout,
        applyCustomNavLayout,
        loadNavMenuConfig,
        triggerNavAction
    } = useNavLayout({
        t,
        locale,
        router,
        dashboardStore,
        dashboards,
        directAccessPaste,
        triggerTool
    });

    const collapsedDropdownOpenId = ref(null);
    const customNavDialogVisible = ref(false);

    const hasNotifications = computed(() => notifiedMenus.value.length > 0);
    const version = computed(() => appVersion.value?.split('VRCX ')?.[1] || '-');
    const vrcxLogo = new URL('../../../images/BetterVRCX.png', import.meta.url).href;

    const NAV_ITEM_DESC_KEYS = {
        home: 'nav_desc.home',
        feed: 'nav_desc.feed',
        'friends-locations': 'nav_desc.friends_locations',
        'game-log': 'nav_desc.game_log',
        'player-list': 'nav_desc.player_list',
        search: 'nav_desc.search',
        favorites: 'nav_desc.favorites',
        'favorite-friends': 'nav_desc.favorite_friends',
        'favorite-worlds': 'nav_desc.favorite_worlds',
        'favorite-avatars': 'nav_desc.favorite_avatars',
        'friend-log': 'nav_desc.friend_log',
        'friend-list': 'nav_desc.friend_list',
        social: 'nav_desc.social',
        moderation: 'nav_desc.moderation',
        notification: 'nav_desc.notification',
        'my-avatars': 'nav_desc.my_avatars',
        charts: 'nav_desc.charts',
        'charts-instance': 'nav_desc.charts_instance',
        'charts-mutual': 'nav_desc.charts_mutual',
        'charts-hot-worlds': 'nav_desc.charts_hot_worlds',
        tools: 'nav_desc.tools',
        'direct-access': 'nav_desc.direct_access'
    };

    const NAV_ITEM_FALLBACKS = {
        home: 'Dashboard & quick overview',
        feed: 'Recent events & friend feed',
        'friends-locations': 'Live friends in instances',
        'game-log': 'Player history & encounters',
        'player-list': 'Players in current instance',
        search: 'Explore users, worlds & avatars',
        favorites: 'Saved friends, worlds & avatars',
        'favorite-friends': 'Saved & organized friends',
        'favorite-worlds': 'Bookmarked worlds list',
        'favorite-avatars': 'Saved avatar collection',
        'friend-log': 'Friendship adds & removals',
        'friend-list': 'Online & offline friends',
        social: 'Friend logs & moderation',
        moderation: 'Blocks, mutes & permissions',
        notification: 'Invites & notifications',
        'my-avatars': 'Manage & wear avatars',
        charts: 'Activity & analytics charts',
        'charts-instance': 'Instance activity analytics',
        'charts-mutual': 'Mutual friends visualization',
        'charts-hot-worlds': 'Trending world statistics',
        tools: 'Utilities & tool shortcuts',
        'direct-access': 'Jump to ID or launch link'
    };

    function getNavItemDescription(item) {
        if (!item) return '';
        const key = item.key || item.index || item.id;
        const descKey = NAV_ITEM_DESC_KEYS[key];
        if (descKey) {
            const translated = t(descKey);
            if (translated && translated !== descKey) {
                return translated;
            }
            if (NAV_ITEM_FALLBACKS[key]) {
                return NAV_ITEM_FALLBACKS[key];
            }
        }
        if (item.children?.length) {
            const count = item.children.length;
            if (count === 1) {
                const single = t('nav_desc.folder_page');
                return single && single !== 'nav_desc.folder_page' ? single : '1 page';
            }
            const plural = t('nav_desc.folder_pages', { count });
            return plural && plural !== 'nav_desc.folder_pages' ? plural : `${count} pages`;
        }
        if (isDashboardItem(item)) {
            const customDashboard = t('nav_desc.custom_dashboard');
            return customDashboard && customDashboard !== 'nav_desc.custom_dashboard'
                ? customDashboard
                : 'Custom dashboard';
        }
        if (isToolItem(item)) {
            const toolShortcut = t('nav_desc.tools');
            return toolShortcut && toolShortcut !== 'nav_desc.tools'
                ? toolShortcut
                : 'Tool shortcut';
        }
        return '';
    }

    const isEntryNotified = (entry) => checkEntryNotified(entry, notifiedMenus.value);

    const getItemTooltip = (item) => {
        const label = item.titleIsCustom ? item.title : t(item.title || '');
        if (item.action !== 'direct-access') {
            return label;
        }
        return () =>
            h('span', { class: 'inline-flex items-center gap-1' }, [
                label,
                h(Kbd, () => (isMac ? '⌘' : 'Ctrl')),
                h(Kbd, () => 'D')
            ]);
    };

    const isNavItemNotified = (item) => {
        if (!item) {
            return false;
        }
        if (notifiedMenus.value.includes(item.index)) {
            return true;
        }
        if (item.children?.length) {
            return item.children.some((entry) => isEntryNotified(entry));
        }
        return false;
    };

    const isHomeActive = computed(() => {
        return activeMenuIndex.value === 'home' || router?.currentRoute?.value?.name === 'home';
    });

    const handleHomeClick = () => {
        handleMenuItemClick({ key: 'home', routeName: 'home' });
    };

    const handleSettingsClick = () => {
        router.push({ name: 'settings' });
    };

    const handleLogoutClick = () => {
        logout();
    };

    const openGithub = () => {
        openExternalLink(links.github);
    };

    const handleSupportLink = (id) => {
        const target = links[id];
        if (target) {
            openExternalLink(target);
        }
    };

    const handleOpenCustomNavDialog = () => {
        customNavDialogVisible.value = true;
    };

    const isDashboardItem = (item) => item?.index?.startsWith(DASHBOARD_NAV_KEY_PREFIX);
    const isToolItem = (item) => item?.index?.startsWith('tool-');

    const handleUnpinToolItem = async (item) => {
        if (!isToolItem(item)) {
            return;
        }
        await unpinToolFromNav(item.index.replace(/^tool-/, ''));
    };

    const handleQuickCreateDashboard = async () => {
        const dashboard = await dashboardStore.createDashboard(t('dashboard.default_name'));
        const dashboardKey = `${DASHBOARD_NAV_KEY_PREFIX}${dashboard.id}`;
        const currentLayout = [...navLayout.value];
        const directAccessIdx = currentLayout.findIndex(
            (entry) => entry.type === 'item' && entry.key === 'direct-access'
        );
        const newEntry = { type: 'item', key: dashboardKey };
        if (directAccessIdx !== -1) {
            currentLayout.splice(directAccessIdx, 0, newEntry);
        } else {
            currentLayout.push(newEntry);
        }
        const nextLayout = currentLayout;
        const nextHiddenKeys = navHiddenKeys.value.filter((key) => key !== dashboardKey);
        const sanitized = sanitizeLayoutLocal(nextLayout, nextHiddenKeys);
        navLayout.value = sanitized;
        navHiddenKeys.value = nextHiddenKeys;
        await saveNavLayout(sanitized, nextHiddenKeys);
        await router.push({ name: 'dashboard', params: { id: dashboard.id } });
        dashboardStore.setEditingDashboardId(dashboard.id);
    };

    const handleEditDashboard = async (item) => {
        if (!isDashboardItem(item)) {
            return;
        }
        const dashboardId = item.index.replace(DASHBOARD_NAV_KEY_PREFIX, '');
        const currentRoute = router.currentRoute.value;
        if (currentRoute?.name !== 'dashboard' || String(currentRoute?.params?.id || '') !== dashboardId) {
            await router.push({ name: 'dashboard', params: { id: dashboardId } });
        }
        dashboardStore.setEditingDashboardId(dashboardId);
    };

    const handleDeleteDashboard = async (item) => {
        if (!isDashboardItem(item)) {
            return;
        }
        const { ok } = await modalStore.confirm({
            title: t('dashboard.confirmations.delete_title'),
            description: t('dashboard.confirmations.delete_description'),
            destructive: true
        });
        if (!ok) {
            return;
        }
        const dashboardId = item.index.replace(DASHBOARD_NAV_KEY_PREFIX, '');
        await dashboardStore.deleteDashboard(dashboardId);
        const currentRoute = router.currentRoute.value;
        if (currentRoute?.name === 'dashboard' && String(currentRoute?.params?.id || '') === dashboardId) {
            router.replace({ name: 'feed' });
        }
    };

    const handleCustomNavSave = async (layout, hiddenKeys) => {
        await applyCustomNavLayout(layout, hiddenKeys);
        customNavDialogVisible.value = false;
    };

    const handleDashboardCreated = async (dashboardId, layout, hiddenKeys) => {
        await handleCustomNavSave(layout, hiddenKeys);
        await router.push({ name: 'dashboard', params: { id: dashboardId } });
        dashboardStore.setEditingDashboardId(dashboardId);
    };

    const handleSubmenuClick = (entry) => {
        triggerNavAction(entry);
    };

    const handleCollapsedDropdownOpenChange = (index, value) => {
        collapsedDropdownOpenId.value = value ? index : null;
    };

    const handleCollapsedSubmenuSelect = (event, entry) => {
        if (event?.preventDefault) {
            event.preventDefault();
        }
        handleSubmenuClick(entry);
    };

    const handleMenuItemClick = (item) => {
        triggerNavAction(item);
    };

    const toggleNavCollapse = () => {
        appearanceSettingsStore.toggleNavCollapsed();
    };

    watch(
        () => isCollapsed.value,
        (value) => {
            if (!value) {
                collapsedDropdownOpenId.value = null;
            }
        }
    );

    onMounted(async () => {
        await initThemeColor();
        await dashboardStore.loadDashboards();
        await loadNavMenuConfig();
    });
</script>

<style scoped>
    .bv-nav-brand {
        border-bottom: 1px solid var(--bv-border-default);
    }

    .bv-nav-brand-mark {
        display: inline-grid;
        width: 26px;
        height: 26px;
        place-items: center;
        border: 1px solid var(--bv-accent-primary);
        border-radius: var(--bv-radius-md);
        background: var(--bv-bg-control);
        color: var(--bv-text-strong);
        font-size: 12px;
        font-weight: 800;
        box-shadow: var(--bv-shadow-sm);
    }

    .bv-nav-brand-label {
        color: var(--bv-text-strong);
        font-size: 13.5px;
        font-weight: 700;
        letter-spacing: -0.01em;
    }

    .bv-new-dashboard-btn {
        border: 1px dashed transparent;
        color: var(--bv-text-muted);
        background: transparent;
        border-radius: 8px;
        transition:
            background-color var(--bv-duration-fast) var(--bv-ease-out),
            border-color var(--bv-duration-fast) var(--bv-ease-out),
            color var(--bv-duration-fast) var(--bv-ease-out),
            box-shadow var(--bv-duration-fast) var(--bv-ease-out),
            transform var(--bv-duration-fast) var(--bv-ease-out);
    }

    .bv-new-dashboard-btn:hover {
        border-color: var(--bv-accent-primary);
        background: var(--bv-accent-subtle);
        color: var(--bv-accent-primary);
    }

    .bv-nav-notify-dot {
        position: absolute;
        top: 4px;
        right: 0;
        transform: translateY(-50%);
    }

    @container (max-width: 220px) {
        .nav-shortcut-hint {
            display: none;
        }
    }
</style>
