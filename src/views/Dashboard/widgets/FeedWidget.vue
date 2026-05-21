<template>
    <div class="vrcx-dashboard-feed-widget flex h-full min-h-0 flex-col">
        <WidgetHeader :title="t('dashboard.widget.feed')" icon="ri-rss-line" route-name="feed">
            <DropdownMenu v-if="configUpdater">
                <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="icon-sm">
                        <Settings class="size-3.5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" class="w-48">
                    <DropdownMenuCheckboxItem
                        v-for="filterType in FEED_TYPES"
                        :key="filterType"
                        :model-value="isFilterActive(filterType)"
                        @select.prevent
                        @update:modelValue="toggleFilter(filterType)">
                        {{ t(`view.feed.filters.${filterType}`) }}
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                        :model-value="config.showType || false"
                        @select.prevent
                        @update:modelValue="toggleBooleanConfig('showType')">
                        {{ t('dashboard.widget.config.show_type') }}
                    </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </WidgetHeader>

        <div class="vrcx-dashboard-feed-list min-h-0 flex-1 overflow-y-auto overflow-x-hidden" ref="listRef">
            <Transition name="vrcx-list-swap" mode="out-in">
                <Table v-if="filteredData.length" :key="feedWidgetTransitionKey" class="vrcx-dashboard-feed-table">
                    <TableBody>
                        <TableRow
                            v-for="(item, index) in filteredData"
                            :key="getItemKey(item, index)"
                            class="vrcx-dashboard-feed-row cursor-default in-[.is-compact-table]:py-1! in-[.is-comfortable-table]:py-1.5!"
                            :class="{ 'is-favorite border-l-2 border-l-chart-4': item.isFavorite }">
                            <TableCell class="w-28 text-[11px] tabular-nums text-muted-foreground">
                                <TooltipWrapper :content="formatExactTime(item.created_at)" side="top">
                                    <span>{{ formatTime(item.created_at) }}</span>
                                </TooltipWrapper>
                            </TableCell>
                            <TableCell v-if="showType" class="w-16 text-[11px] text-muted-foreground">
                                {{ item.type }}
                            </TableCell>
                            <TableCell class="max-w-0 truncate">
                                <template v-if="item.type === 'GPS'">
                                    <div class="flex items-center min-w-0">
                                        <MapPin class="mr-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                        <UserContextMenu
                                            :user-id="item.userId"
                                            :state="getFriendState(item.userId)"
                                            :location="getFriendLocation(item.userId)">
                                            <span
                                                class="vrcx-feed-user shrink-0 cursor-pointer"
                                                @click="openUser(item.userId)"
                                                >{{ item.displayName }}</span
                                            >
                                        </UserContextMenu>
                                        <span class="shrink-0 text-muted-foreground mx-1"> → </span>
                                        <div class="min-w-0 flex-1 truncate">
                                            <Location
                                                :location="item.location"
                                                :hint="item.worldName"
                                                :grouphint="item.groupName"
                                                enable-context-menu
                                                disable-tooltip />
                                        </div>
                                    </div>
                                </template>
                                <template v-else-if="item.type === 'Online'">
                                    <div class="flex items-center min-w-0">
                                        <i class="x-user-status online mr-1 shrink-0"></i>
                                        <UserContextMenu
                                            :user-id="item.userId"
                                            :state="getFriendState(item.userId)"
                                            :location="getFriendLocation(item.userId)">
                                            <span
                                                class="vrcx-feed-user shrink-0 cursor-pointer"
                                                @click="openUser(item.userId)"
                                                >{{ item.displayName }}</span
                                            >
                                        </UserContextMenu>
                                        <template v-if="item.location">
                                            <span class="shrink-0 text-muted-foreground"> → </span>
                                            <div class="min-w-0 flex-1 truncate">
                                                <Location
                                                    :location="item.location"
                                                    :hint="item.worldName"
                                                    :grouphint="item.groupName"
                                                    enable-context-menu
                                                    disable-tooltip />
                                            </div>
                                        </template>
                                    </div>
                                </template>
                                <template v-else-if="item.type === 'Offline'">
                                    <i class="x-user-status mr-1"></i>
                                    <UserContextMenu
                                        :user-id="item.userId"
                                        :state="getFriendState(item.userId)"
                                        :location="getFriendLocation(item.userId)">
                                        <span class="vrcx-feed-user cursor-pointer" @click="openUser(item.userId)">{{
                                            item.displayName
                                        }}</span>
                                    </UserContextMenu>
                                </template>
                                <template v-else-if="item.type === 'Status'">
                                    <i class="x-user-status mr-1" :class="statusClass(item.status)"></i>
                                    <UserContextMenu
                                        :user-id="item.userId"
                                        :state="getFriendState(item.userId)"
                                        :location="getFriendLocation(item.userId)">
                                        <span class="vrcx-feed-user cursor-pointer" @click="openUser(item.userId)">{{
                                            item.displayName
                                        }}</span>
                                    </UserContextMenu>
                                    <span class="text-muted-foreground ml-1"> {{ item.statusDescription }}</span>
                                </template>
                                <template v-else-if="item.type === 'Avatar'">
                                    <Box class="mr-1 inline-block h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <UserContextMenu
                                        :user-id="item.userId"
                                        :state="getFriendState(item.userId)"
                                        :location="getFriendLocation(item.userId)">
                                        <span class="vrcx-feed-user cursor-pointer" @click="openUser(item.userId)">{{
                                            item.displayName
                                        }}</span>
                                    </UserContextMenu>
                                    <span class="text-muted-foreground"> → {{ item.avatarName }}</span>
                                </template>
                                <template v-else-if="item.type === 'Bio'">
                                    <Pencil class="mr-1 inline-block h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <UserContextMenu
                                        :user-id="item.userId"
                                        :state="getFriendState(item.userId)"
                                        :location="getFriendLocation(item.userId)">
                                        <span class="vrcx-feed-user cursor-pointer" @click="openUser(item.userId)">{{
                                            item.displayName
                                        }}</span>
                                    </UserContextMenu>
                                    <span class="ml-1 text-muted-foreground">{{ t('dashboard.widget.feed_bio') }}</span>
                                </template>
                                <template v-else>
                                    <UserContextMenu
                                        :user-id="item.userId"
                                        :state="getFriendState(item.userId)"
                                        :location="getFriendLocation(item.userId)">
                                        <span class="vrcx-feed-user cursor-pointer" @click="openUser(item.userId)">{{
                                            item.displayName
                                        }}</span>
                                    </UserContextMenu>
                                    <span class="text-muted-foreground"> {{ item.type }}</span>
                                </template>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
                <div
                    v-else
                    key="empty"
                    class="vrcx-dashboard-widget-empty flex h-full items-center justify-center text-[13px] text-muted-foreground">
                    {{ t('dashboard.widget.no_data') }}
                </div>
            </Transition>
        </div>
    </div>
</template>

<script setup>
    import { computed, ref } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { Box, MapPin, Pencil, Settings } from 'lucide-vue-next';

    import { statusClass } from '@/shared/utils/user';
    import { formatDateFilter } from '@/shared/utils';
    import { showUserDialog } from '@/coordinators/userCoordinator';
    import { useFeedStore, useFriendStore } from '@/stores';

    import { Button } from '@/components/ui/button';
    import {
        DropdownMenu,
        DropdownMenuCheckboxItem,
        DropdownMenuContent,
        DropdownMenuSeparator,
        DropdownMenuTrigger
    } from '@/components/ui/dropdown-menu';
    import Location from '@/components/Location.vue';
    import UserContextMenu from '@/components/UserContextMenu.vue';
    import { TooltipWrapper } from '@/components/ui/tooltip';
    import WidgetHeader from './WidgetHeader.vue';
    import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';

    const FEED_TYPES = ['GPS', 'Online', 'Offline', 'Status', 'Avatar', 'Bio'];

    const props = defineProps({
        config: {
            type: Object,
            default: () => ({})
        },
        configUpdater: {
            type: Function,
            default: null
        }
    });

    const { t } = useI18n();
    const feedStore = useFeedStore();
    const friendStore = useFriendStore();
    const listRef = ref(null);

    const activeFilters = computed(() => {
        if (props.config.filters && Array.isArray(props.config.filters) && props.config.filters.length > 0) {
            return props.config.filters;
        }
        return FEED_TYPES;
    });

    function isFilterActive(filterType) {
        const filters = props.config.filters;
        if (!filters || !Array.isArray(filters) || filters.length === 0) return true;
        return filters.includes(filterType);
    }

    function toggleFilter(filterType) {
        if (!props.configUpdater) return;
        const currentFilters = props.config.filters;
        let filters;
        if (!currentFilters || !Array.isArray(currentFilters) || currentFilters.length === 0) {
            filters = FEED_TYPES.filter((f) => f !== filterType);
        } else if (currentFilters.includes(filterType)) {
            filters = currentFilters.filter((f) => f !== filterType);
            if (filters.length === 0) filters = [];
        } else {
            filters = [...currentFilters, filterType];
            if (filters.length === FEED_TYPES.length) filters = [];
        }
        props.configUpdater({ ...props.config, filters });
    }

    function toggleBooleanConfig(key) {
        if (!props.configUpdater) return;
        props.configUpdater({ ...props.config, [key]: !props.config[key] });
    }

    const showType = computed(() => {
        return props.config.showType || false;
    });

    const filteredData = computed(() => {
        const filters = activeFilters.value;
        return feedStore.feedTableData.filter((item) => filters.includes(item.type)).slice(0, 100);
    });

    const feedWidgetTransitionKey = computed(() => {
        const firstItem = filteredData.value[0];
        const lastItem = filteredData.value[filteredData.value.length - 1];

        return JSON.stringify({
            filters: activeFilters.value,
            showType: showType.value,
            rows: `${filteredData.value.length}:${getItemKey(firstItem, 0)}:${getItemKey(
                lastItem,
                filteredData.value.length - 1
            )}`
        });
    });

    function getItemKey(item, index) {
        if (!item) return '';
        return `${item.type}:${item.created_at}:${item.userId ?? ''}:${item.location ?? ''}:${index}`;
    }

    function formatTime(dateStr) {
        return formatDateFilter(dateStr, 'short');
    }

    function formatExactTime(dateStr) {
        return formatDateFilter(dateStr, 'long');
    }

    function openUser(userId) {
        if (userId) {
            showUserDialog(userId);
        }
    }

    function getFriendState(userId) {
        const friend = friendStore.friends.get(userId);
        return friend?.state ?? '';
    }

    function getFriendLocation(userId) {
        const friend = friendStore.friends.get(userId);
        return friend?.ref?.location ?? '';
    }

    defineExpose({ FEED_TYPES });
</script>

<style scoped>
    .vrcx-dashboard-feed-list {
        scrollbar-gutter: stable;
    }

    .vrcx-dashboard-feed-table {
        border-collapse: separate;
        border-spacing: 0;
    }

    .vrcx-dashboard-feed-row {
        border-color: color-mix(in oklch, var(--border) 64%, transparent);
        transition:
            background-color var(--vrcx-motion-fast) var(--vrcx-ease-fluid),
            transform var(--vrcx-motion-fast) var(--vrcx-ease-fluid);
    }

    .vrcx-dashboard-feed-row:hover {
        background: color-mix(in oklch, var(--accent) 20%, transparent);
        transform: translateY(-1px);
    }

    .vrcx-dashboard-feed-row.is-favorite {
        border-left-color: color-mix(in oklch, var(--primary) 82%, var(--chart-3));
        background:
            linear-gradient(90deg, color-mix(in oklch, var(--primary) 9%, transparent), transparent 28%), transparent;
    }

    .vrcx-feed-user {
        color: color-mix(in oklch, var(--foreground) 92%, var(--primary));
        font-weight: 550;
        transition: color var(--vrcx-motion-fast) var(--vrcx-ease-fluid);
    }

    .vrcx-feed-user:hover {
        color: var(--primary);
    }

    .vrcx-dashboard-widget-empty {
        color: color-mix(in oklch, var(--foreground) 58%, transparent);
        background:
            radial-gradient(circle at 50% 40%, color-mix(in oklch, var(--primary) 8%, transparent), transparent 36%),
            transparent;
    }
</style>
