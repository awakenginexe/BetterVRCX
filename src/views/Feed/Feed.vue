<template>
    <div class="x-container vrcx-feed-dashboard vrcx-feed-view feed x-container--auto-height" ref="feedRef">
        <DataTableLayout
            :table="table"
            :loading="feedTable.loading"
            auto-height
            table-class="vrcx-feed-table"
            :body-transition-key="feedBodyTransitionKey"
            :page-sizes="pageSizes"
            :total-items="totalItems"
            :on-page-size-change="handlePageSizeChange">
            <template #toolbar>
                <div class="vrcx-feed-toolbar">
                    <div class="vrcx-feed-toolbar-actions">
                        <Popover v-model:open="popoverOpen">
                            <PopoverTrigger as-child>
                                <Button variant="outline" size="sm" class="h-8 gap-1.5">
                                    <ListFilter class="size-4" />
                                    {{ t('view.my_avatars.filter') }}
                                    <Badge
                                        v-if="activeFilterCount"
                                        variant="secondary"
                                        class="ml-0.5 h-4.5 min-w-4.5 rounded-full px-1 text-xs">
                                        {{ activeFilterCount }}
                                    </Badge>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent class="w-auto" side="bottom" align="end">
                                <RangeCalendar
                                    v-model="dateRange"
                                    :locale="locale"
                                    :max-value="todayDate"
                                    :number-of-months="2"
                                    :week-starts-on="weekStartsOn" />
                                <div class="flex justify-end gap-2 mt-3">
                                    <Button variant="outline" size="sm" @click="clearDateFilter">
                                        {{ t('common.actions.clear') }}
                                    </Button>
                                    <Button size="sm" @click="applyDateFilter">
                                        {{ t('common.actions.confirm') }}
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <TooltipWrapper side="bottom" :content="t('view.feed.favorites_only_tooltip')">
                            <div>
                                <Toggle
                                    variant="outline"
                                    size="sm"
                                    :model-value="feedTable.vip"
                                    @update:modelValue="
                                        (v) => {
                                            feedTable.vip = v;
                                            feedTableLookup();
                                        }
                                    ">
                                    <Star />
                                </Toggle>
                            </div>
                        </TooltipWrapper>
                    </div>
                    <ToggleGroup
                        type="multiple"
                        variant="outline"
                        size="sm"
                        :model-value="activeFilterSelection"
                        @update:model-value="handleFeedFilterChange"
                        class="vrcx-feed-filter-tabs w-full justify-start">
                        <ToggleGroupItem value="All">
                            {{ t('view.search.avatar.all') }}
                        </ToggleGroupItem>
                        <ToggleGroupItem v-for="type in feedFilterTypes" :key="type" :value="type">
                            {{ t('view.feed.filters.' + type) }}
                        </ToggleGroupItem>
                    </ToggleGroup>
                    <InputGroupField
                        class="vrcx-feed-search"
                        v-model="feedTable.search"
                        :placeholder="t('view.feed.search_placeholder')"
                        clearable
                        @keyup.enter="feedTableLookup"
                        @change="feedTableLookup" />
                </div>
            </template>
        </DataTableLayout>
    </div>
</template>

<script setup>
    import { computed, ref } from 'vue';
    import { ListFilter, Star } from 'lucide-vue-next';
    import { getLocalTimeZone, today } from '@internationalized/date';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import dayjs from 'dayjs';

    import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
    import { useAppearanceSettingsStore, useFeedStore, useVrcxStore } from '../../stores';
    import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group';
    import { Badge } from '../../components/ui/badge';
    import { Button } from '../../components/ui/button';
    import { DataTableLayout } from '../../components/ui/data-table';
    import { InputGroupField } from '../../components/ui/input-group';
    import { RangeCalendar } from '../../components/ui/range-calendar';
    import { Toggle } from '../../components/ui/toggle';
    import { columns as baseColumns } from './columns.jsx';
    import { useVrcxVueTable } from '../../lib/table/useVrcxVueTable';

    const { feedTable, feedTableData } = storeToRefs(useFeedStore());
    const { feedTableLookup } = useFeedStore();
    const appearanceSettingsStore = useAppearanceSettingsStore();
    const { weekStartsOn } = storeToRefs(appearanceSettingsStore);
    const vrcxStore = useVrcxStore();

    const { t, locale } = useI18n();
    const feedFilterTypes = ['GPS', 'Online', 'Offline', 'Status', 'Avatar', 'Bio'];

    const popoverOpen = ref(false);
    const todayDate = today(getLocalTimeZone());
    const dateRange = ref(undefined);
    const hasDateFilter = computed(() => !!(feedTable.value.dateFrom || feedTable.value.dateTo));
    const activeFilterCount = computed(() => (hasDateFilter.value ? 1 : 0));

    /**
     *
     */
    function applyDateFilter() {
        if (dateRange.value?.start) {
            const s = dateRange.value.start;
            feedTable.value.dateFrom = dayjs(`${s.year}-${s.month}-${s.day}`).startOf('day').toISOString();
        } else {
            feedTable.value.dateFrom = '';
        }
        if (dateRange.value?.end) {
            const e = dateRange.value.end;
            feedTable.value.dateTo = dayjs(`${e.year}-${e.month}-${e.day}`).endOf('day').toISOString();
        } else {
            feedTable.value.dateTo = '';
        }
        popoverOpen.value = false;
        feedTableLookup();
    }

    /**
     *
     */
    function clearDateFilter() {
        dateRange.value = undefined;
        feedTable.value.dateFrom = '';
        feedTable.value.dateTo = '';
        popoverOpen.value = false;
        feedTableLookup();
    }

    const feedRef = ref(null);

    const pageSizes = computed(() => appearanceSettingsStore.tablePageSizes);

    /**
     *
     * @param row
     */
    function getFeedRowId(row) {
        if (row?.id != null) return `id:${row.id}`;
        if (row?.rowId != null) return `row:${row.rowId}`;

        const type = row?.type ?? '';
        const createdAt = row?.created_at ?? row?.createdAt ?? '';
        const userId = row?.userId ?? row?.senderUserId ?? '';
        const location = row?.location ?? row?.details?.location ?? '';
        const message = row?.message ?? '';

        return `${type}:${createdAt}:${userId}:${location}:${message}`;
    }

    const { table, pagination } = useVrcxVueTable({
        get data() {
            return feedTableData.value;
        },
        persistKey: 'feed',
        columns: baseColumns,
        getRowId: getFeedRowId,
        enableExpanded: true,
        getRowCanExpand: () => true,
        initialSorting: [],
        initialExpanded: {},
        initialPagination: {
            pageIndex: 0,
            pageSize: appearanceSettingsStore.tablePageSize
        },
        tableOptions: {
            autoResetExpanded: false,
            autoResetPageIndex: false
        }
    });

    const totalItems = computed(() => {
        const length = table.getFilteredRowModel().rows.length;
        const max = vrcxStore.maxTableSize;
        return length > max && length < max + 51 ? max : length;
    });

    const feedBodyTransitionKey = computed(() => {
        const rows = table.getRowModel().rows;
        const firstRowId = rows[0]?.id ?? '';
        const lastRowId = rows[rows.length - 1]?.id ?? '';
        const state = table.getState?.() ?? {};

        return JSON.stringify({
            search: feedTable.value.search,
            filter: feedTable.value.filter,
            dateFrom: feedTable.value.dateFrom,
            dateTo: feedTable.value.dateTo,
            vip: feedTable.value.vip,
            pageIndex: state.pagination?.pageIndex ?? 0,
            pageSize: state.pagination?.pageSize ?? 0,
            sorting: state.sorting ?? [],
            rows: `${rows.length}:${firstRowId}:${lastRowId}`
        });
    });

    const handlePageSizeChange = (size) => {
        pagination.value = {
            ...pagination.value,
            pageIndex: 0,
            pageSize: size
        };
    };

    const activeFilterSelection = computed(() => {
        const filter = feedTable.value.filter;
        if (!Array.isArray(filter) || filter.length === 0) {
            return ['All'];
        }
        return filter;
    });

    /**
     *
     * @param value
     */
    function handleFeedFilterChange(value) {
        const selected = Array.isArray(value) ? value : [];
        const wasAll = activeFilterSelection.value.includes('All');
        const hasAll = selected.includes('All');
        const types = selected.filter((v) => v !== 'All');

        if (hasAll && !wasAll) {
            feedTable.value.filter = [];
        } else if (wasAll && types.length) {
            feedTable.value.filter = types;
        } else {
            feedTable.value.filter = types.length === feedFilterTypes.length ? [] : types.length ? types : [];
        }
        feedTableLookup();
    }
</script>

<style scoped>
    .vrcx-feed-toolbar {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        min-width: 0;
    }

    .vrcx-feed-toolbar-actions {
        display: flex;
        flex: none;
        align-items: center;
        gap: 0.4rem;
    }

    .vrcx-feed-filter-tabs {
        flex: 1 1 auto;
        min-width: 0;
        overflow-x: auto;
        scrollbar-width: none;
        border: 1px solid var(--vrcx-border-glass);
        border-radius: 0.85rem;
        background:
            linear-gradient(
                180deg,
                color-mix(in oklch, var(--card) 46%, transparent),
                color-mix(in oklch, var(--input) 54%, transparent)
            ),
            color-mix(in oklch, var(--background) 52%, transparent);
        box-shadow:
            inset 0 1px 0 color-mix(in oklch, white 10%, transparent),
            0 8px 18px color-mix(in oklch, black 12%, transparent);
        padding: 0.15rem;
    }

    .vrcx-feed-filter-tabs::-webkit-scrollbar {
        display: none;
    }

    .vrcx-feed-filter-tabs :deep([data-slot='toggle-group-item']) {
        border-color: transparent;
        border-radius: 0.7rem;
        background: transparent;
        color: color-mix(in oklch, var(--foreground) 74%, transparent);
        box-shadow: none;
        transition:
            background-color var(--vrcx-motion-base) var(--vrcx-ease-fluid),
            border-color var(--vrcx-motion-base) var(--vrcx-ease-fluid),
            color var(--vrcx-motion-base) var(--vrcx-ease-fluid),
            transform var(--vrcx-motion-fast) var(--vrcx-ease-press);
    }

    .vrcx-feed-filter-tabs :deep([data-slot='toggle-group-item']:hover) {
        border-color: color-mix(in oklch, var(--primary) 18%, transparent);
        background: color-mix(in oklch, var(--accent) 34%, transparent);
        color: var(--foreground);
    }

    .vrcx-feed-filter-tabs :deep([data-slot='toggle-group-item'][data-state='on']) {
        border-color: color-mix(in oklch, var(--primary) 28%, transparent);
        background:
            linear-gradient(
                180deg,
                color-mix(in oklch, var(--primary) 22%, transparent),
                color-mix(in oklch, var(--card) 44%, transparent)
            ),
            color-mix(in oklch, var(--accent) 36%, transparent);
        color: var(--foreground);
        box-shadow:
            inset 0 1px 0 color-mix(in oklch, white 18%, transparent),
            0 6px 14px color-mix(in oklch, var(--primary) 10%, transparent);
    }

    .vrcx-feed-search {
        flex: 0 1 min(24rem, 36%);
        min-width: 11rem;
    }

    .feed :deep(.x-text-removed) {
        text-decoration: line-through;
        color: color-mix(in oklch, var(--destructive) 90%, white);
        background-color: color-mix(in oklch, var(--destructive) 18%, transparent);
        padding: 2px 2px;
        border-radius: 4px;
    }

    .feed :deep(.x-text-added) {
        color: color-mix(in oklch, var(--status-online) 86%, white);
        background-color: color-mix(in oklch, var(--status-online) 16%, transparent);
        padding: 2px 2px;
        border-radius: 4px;
    }

    @media (max-width: 960px) {
        .vrcx-feed-toolbar {
            flex-wrap: wrap;
        }

        .vrcx-feed-filter-tabs {
            order: 3;
            flex-basis: 100%;
        }

        .vrcx-feed-search {
            flex: 1 1 14rem;
        }
    }
</style>
