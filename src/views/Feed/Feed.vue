<template>
    <div class="x-container feed x-container--auto-height" ref="feedRef">
        <header class="feed__page-header bv-surface">
            <div class="feed__identity">
                <span class="bv-eyebrow">{{ t('nav_tooltip.social') }}</span>
                <h1>{{ t('nav_tooltip.feed') }}</h1>
            </div>
            <div class="feed__summary" aria-live="polite">
                <span class="feed__record-count bv-badge" data-tone="accent">{{ totalItems }}</span>
                <span class="feed__filter-context">{{ filterContextLabel }}</span>
            </div>
        </header>

        <section class="feed__table-surface bv-surface" :aria-label="t('nav_tooltip.feed')">
            <DataTableLayout
                :table="table"
                :loading="feedTable.loading"
                auto-height
                :page-sizes="pageSizes"
                :total-items="totalItems"
                :on-page-size-change="handlePageSizeChange">
                <template #toolbar>
                    <div class="feed__filter-surface bv-surface-raised">
                        <div class="feed__filter-actions">
                            <Popover v-model:open="popoverOpen">
                                <PopoverTrigger as-child>
                                    <Button variant="outline" size="sm" class="h-8 gap-1.5 bv-focus-ring">
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
                                        class="bv-focus-ring"
                                        variant="outline"
                                        size="sm"
                                        :model-value="feedTable.vip"
                                        :ariaLabel="t('view.feed.favorites_only_tooltip')"
                                        @update:modelValue="
                                            (v) => {
                                                feedTable.vip = v;
                                                feedTableLookup();
                                            }
                                        ">
                                        <Star fill="currentColor" v-if="feedTable.vip" />
                                        <Star v-else />
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
                            class="feed__type-filters">
                            <ToggleGroupItem value="All">
                                {{ t('view.search.avatar.all') }}
                            </ToggleGroupItem>
                            <ToggleGroupItem v-for="type in feedFilterTypes" :key="type" :value="type">
                                {{ t('view.feed.filters.' + type) }}
                            </ToggleGroupItem>
                        </ToggleGroup>
                        <InputGroupField
                            class="feed__search"
                            v-model="feedTable.search"
                            :placeholder="t('view.feed.search_placeholder')"
                            clearable
                            @keyup.enter="feedTableLookup"
                            @change="feedTableLookup" />
                    </div>
                </template>
            </DataTableLayout>
        </section>
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
        if (row?.id != null) return `id:${row.id}:${row?.type ?? ''}`;
        if (row?.rowId != null) return `row:${row.rowId}:${row?.type ?? ''}`;

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

    const filterContextLabel = computed(() => {
        if (activeFilterSelection.value.includes('All')) {
            return t('view.search.avatar.all');
        }
        return activeFilterSelection.value.map((type) => t(`view.feed.filters.${type}`)).join(' · ');
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
    .feed {
        display: flex;
        flex-direction: column;
        gap: 14px;
        min-height: 0;
    }

    .feed__page-header {
        display: flex;
        flex: none;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 14px 16px;
    }

    .feed__identity {
        display: grid;
        gap: 4px;
        min-width: 0;
    }

    .feed__identity h1 {
        margin: 0;
        color: var(--bv-text-strong);
        font-size: 20px;
        font-weight: 750;
        line-height: 1.1;
    }

    .feed__summary {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        color: var(--bv-text-muted);
        font-size: 12px;
    }

    .feed__record-count {
        color: var(--bv-text-strong);
        font-variant-numeric: tabular-nums;
    }

    .feed__filter-context {
        max-width: 260px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .feed__table-surface {
        flex: 1;
        min-height: 0;
        padding: 10px;
        overflow: hidden;
    }

    .feed__filter-surface {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0 0 10px;
        padding: 8px;
    }

    .feed__filter-actions {
        display: flex;
        flex: none;
        align-items: center;
        gap: 6px;
    }

    .feed__type-filters {
        flex: 1;
        justify-content: flex-start;
        min-width: 320px;
        overflow-x: auto;
    }

    .feed__search {
        flex: 0 1 320px;
        min-width: 180px;
    }

    .feed :deep(.x-text-removed) {
        text-decoration: line-through;
        color: #ff0000;
        background-color: rgba(255, 0, 0, 0.2);
        padding: 2px 2px;
        border-radius: 4px;
    }

    .feed :deep(.x-text-added) {
        color: rgb(35, 188, 35);
        background-color: rgba(76, 255, 80, 0.2);
        padding: 2px 2px;
        border-radius: 4px;
    }

    @media (max-width: 960px) {
        .feed__filter-surface {
            flex-wrap: wrap;
        }

        .feed__type-filters {
            order: 3;
            flex-basis: 100%;
        }

        .feed__search {
            flex: 1;
        }
    }
</style>
