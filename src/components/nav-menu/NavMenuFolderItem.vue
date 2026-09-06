<template>
    <SidebarMenuItem>
        <ContextMenu>
            <ContextMenuTrigger as-child>
                <div class="w-full">
                    <DropdownMenu
                        v-if="isCollapsed"
                        :open="collapsedDropdownOpenId === item.index"
                        @update:open="(value) => emit('collapsed-dropdown-open-change', item.index, value)">
                        <DropdownMenuTrigger as-child>
                            <SidebarMenuButton
                                :is-active="item.children?.some((e) => e.index === activeMenuIndex)"
                                :data-nav-key="item.index"
                                :class="[
                                    'bv-nav-item bv-focus-ring',
                                    {
                                        'bv-nav-item-active': item.children?.some(
                                            (entry) => entry.index === activeMenuIndex
                                        )
                                    }
                                ]"
                                :tooltip="item.titleIsCustom ? item.title : t(item.title || '')">
                                <div class="bv-nav-icon-box">
                                    <i :class="item.icon" class="text-lg relative">
                                        <span
                                            v-if="isNavItemNotified(item)"
                                            class="notify-dot bv-status-dot -right-1!"
                                            data-status="danger"
                                            role="img"
                                            :aria-label="t('nav_menu.mark_all_read')"></span>
                                    </i>
                                </div>
                                <span v-show="!isCollapsed">{{
                                    item.titleIsCustom ? item.title : t(item.title || '')
                                }}</span>
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="start" class="w-56">
                            <DropdownMenuItem
                                v-for="entry in item.children"
                                :key="entry.index"
                                @select="(event) => emit('collapsed-submenu-select', event, entry)">
                                <i
                                    v-if="entry.icon"
                                    :class="entry.icon"
                                    class="inline-flex size-4 items-center justify-center text-base relative"
                                    ><span
                                        v-if="isEntryNotified(entry)"
                                        class="notify-dot bv-status-dot -right-1! top-0.5!"
                                        data-status="danger"
                                        role="img"
                                        :aria-label="t('nav_menu.mark_all_read')"></span
                                ></i>
                                <span v-if="entry.titleIsCustom">{{ entry.label }}</span>
                                <span v-else>{{ t(entry.label) }}</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Collapsible
                        v-else
                        class="group/collapsible"
                        :default-open="activeMenuIndex && item.children?.some((e) => e.index === activeMenuIndex)">
                        <template #default="{ open }">
                            <div :class="['bv-nav-folder-group', { 'is-expanded': open }]">
                                <CollapsibleTrigger as-child>
                                    <SidebarMenuButton
                                        :is-active="false"
                                        :data-state="open ? 'open' : 'closed'"
                                        :data-nav-key="item.index"
                                        :class="[
                                            'bv-nav-item bv-nav-folder-trigger bv-focus-ring',
                                            { 'is-expanded': open }
                                        ]"
                                        :tooltip="item.titleIsCustom ? item.title : t(item.title || '')">
                                        <div class="bv-nav-icon-box">
                                            <i :class="item.icon" class="text-lg relative">
                                                <span
                                                    v-if="isNavItemNotified(item)"
                                                    class="notify-dot bv-status-dot"
                                                    data-status="danger"
                                                    role="img"
                                                    :aria-label="t('nav_menu.mark_all_read')"></span>
                                            </i>
                                        </div>
                                        <div v-show="!isCollapsed" class="bv-nav-content-box flex flex-col min-w-0 flex-1">
                                            <span class="bv-nav-item-title truncate font-medium text-xs leading-tight">{{
                                                item.titleIsCustom ? item.title : t(item.title || '')
                                            }}</span>
                                            <span class="bv-nav-item-desc text-[11px] text-muted-foreground/75 truncate leading-tight mt-0.5">{{
                                                getFolderDescription(item)
                                            }}</span>
                                        </div>

                                        <ChevronRight
                                            v-show="!isCollapsed"
                                            class="ml-auto size-4 shrink-0 transition-transform duration-200 ease-out"
                                            :class="open ? 'rotate-90' : ''" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub class="bv-nav-sub-list mx-0 border-l-0 px-1 py-0 translate-x-0">
                                        <SidebarMenuSubItem v-for="entry in item.children" :key="entry.index">
                                            <ContextMenu>
                                                <ContextMenuTrigger as-child>
                                                    <SidebarMenuSubButton
                                                        :is-active="activeMenuIndex === entry.index"
                                                        :data-nav-key="entry.index"
                                                        :data-active="activeMenuIndex === entry.index"
                                                        :class="[
                                                            'bv-nav-sub-item bv-focus-ring',
                                                            { 'is-selected': activeMenuIndex === entry.index }
                                                        ]"
                                                        @click="emit('submenu-click', entry)">
                                                        <i
                                                            v-if="entry.icon"
                                                            :class="entry.icon"
                                                            class="inline-flex size-5 items-center justify-center text-base relative"
                                                            ><span
                                                                v-if="isEntryNotified(entry)"
                                                                class="notify-dot bv-status-dot -right-0.5!"
                                                                data-status="danger"
                                                                role="img"
                                                                :aria-label="t('nav_menu.mark_all_read')"></span
                                                        ></i>
                                                        <span v-if="entry.titleIsCustom" class="truncate">{{
                                                            entry.label
                                                        }}</span>
                                                        <span v-else class="truncate">{{ t(entry.label) }}</span>
                                                    </SidebarMenuSubButton>
                                                </ContextMenuTrigger>
                                                <ContextMenuContent>
                                                    <ContextMenuItem
                                                        v-if="hasNotifications"
                                                        @click="emit('clear-notifications')">
                                                        {{ t('nav_menu.mark_all_read') }}
                                                    </ContextMenuItem>
                                                    <ContextMenuSeparator v-if="hasNotifications" />
                                                    <template v-if="isDashboardItem(entry)">
                                                        <ContextMenuItem @click="emit('edit-dashboard', entry)">
                                                            {{ t('nav_menu.edit_dashboard') }}
                                                        </ContextMenuItem>
                                                        <ContextMenuItem
                                                            variant="destructive"
                                                            @click="emit('delete-dashboard', entry)">
                                                            {{ t('nav_menu.delete_dashboard') }}
                                                        </ContextMenuItem>
                                                        <ContextMenuSeparator />
                                                    </template>
                                                    <ContextMenuItem
                                                        v-if="isToolItem(entry)"
                                                        @click="emit('unpin-tool', entry)">
                                                        {{ t('nav_menu.custom_nav.unpin_from_nav') }}
                                                    </ContextMenuItem>
                                                    <ContextMenuSeparator v-if="isToolItem(entry)" />
                                                    <ContextMenuItem @click="emit('open-custom-nav')">
                                                        {{ t('nav_menu.custom_nav.header') }}
                                                    </ContextMenuItem>
                                                </ContextMenuContent>
                                            </ContextMenu>
                                        </SidebarMenuSubItem>
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </div>
                        </template>
                    </Collapsible>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem v-if="hasNotifications" @click="emit('clear-notifications')">
                    {{ t('nav_menu.mark_all_read') }}
                </ContextMenuItem>
                <ContextMenuSeparator v-if="hasNotifications" />
                <ContextMenuItem @click="emit('open-custom-nav')">
                    {{ t('nav_menu.custom_nav.header') }}
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    </SidebarMenuItem>
</template>

<script setup>
    import { ChevronRight } from 'lucide-vue-next';
    import { useI18n } from 'vue-i18n';

    import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
    import {
        ContextMenu,
        ContextMenuContent,
        ContextMenuItem,
        ContextMenuSeparator,
        ContextMenuTrigger
    } from '@/components/ui/context-menu';
    import {
        DropdownMenu,
        DropdownMenuContent,
        DropdownMenuItem,
        DropdownMenuTrigger
    } from '@/components/ui/dropdown-menu';
    import {
        SidebarMenuButton,
        SidebarMenuItem,
        SidebarMenuSub,
        SidebarMenuSubButton,
        SidebarMenuSubItem
    } from '@/components/ui/sidebar';

    defineProps({
        item: {
            type: Object,
            required: true
        },
        isCollapsed: {
            type: Boolean,
            default: false
        },
        activeMenuIndex: {
            type: String,
            default: ''
        },
        collapsedDropdownOpenId: {
            type: String,
            default: null
        },
        hasNotifications: {
            type: Boolean,
            default: false
        },
        isEntryNotified: {
            type: Function,
            required: true
        },
        isNavItemNotified: {
            type: Function,
            required: true
        },
        isDashboardItem: {
            type: Function,
            required: true
        },
        isToolItem: {
            type: Function,
            required: true
        }
    });

    const emit = defineEmits([
        'collapsed-dropdown-open-change',
        'collapsed-submenu-select',
        'submenu-click',
        'clear-notifications',
        'edit-dashboard',
        'delete-dashboard',
        'unpin-tool',
        'open-custom-nav'
    ]);
    const { t } = useI18n();

    const FOLDER_DESC_KEYS = {
        'default-folder-favorites': 'nav_desc.favorites',
        'default-folder-social': 'nav_desc.social',
        'default-folder-charts': 'nav_desc.charts',
        'default-folder-tools': 'nav_desc.tools'
    };

    const FOLDER_FALLBACKS = {
        'default-folder-favorites': 'Saved friends, worlds & avatars',
        'default-folder-social': 'Friend logs & moderation',
        'default-folder-charts': 'Activity & analytics charts',
        'default-folder-tools': 'Utilities & tool shortcuts'
    };

    function getFolderDescription(item) {
        if (!item) return '';
        const folderKey = item.id || item.index;
        const descKey = FOLDER_DESC_KEYS[folderKey];
        if (descKey) {
            const translated = t(descKey);
            if (translated && translated !== descKey) {
                return translated;
            }
            if (FOLDER_FALLBACKS[folderKey]) {
                return FOLDER_FALLBACKS[folderKey];
            }
        }
        const count = item.children?.length || 0;
        if (count === 1) {
            const single = t('nav_desc.folder_page');
            return single && single !== 'nav_desc.folder_page' ? single : '1 page';
        }
        const plural = t('nav_desc.folder_pages', { count });
        return plural && plural !== 'nav_desc.folder_pages' ? plural : `${count} pages`;
    }
</script>

<style scoped>
    .notify-dot {
        position: absolute;
        top: 4px;
        right: 0;
    }
</style>
