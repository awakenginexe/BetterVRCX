<template>
    <div class="game-log x-container x-container--auto-height" ref="gameLogRef">
        <header class="game-log__page-header bv-surface">
            <div class="game-log__identity">
                <span class="bv-eyebrow">{{ t('nav_tooltip.social') }}</span>
                <h1>{{ t('nav_tooltip.game_log') }}</h1>
            </div>
            <div class="game-log__summary" aria-live="polite">
                <span class="game-log__record-count bv-badge" data-tone="accent">{{ totalItems }}</span>
            </div>
        </header>

        <template v-if="sessionsViewMode === 'sessions'">
            <section class="game-log__sessions-surface bv-surface" :aria-label="t('nav_tooltip.game_log')">
                <GameLogSessions>
                    <template #leading>
                        <ToggleGroup
                            type="single"
                            variant="outline"
                            size="sm"
                            :model-value="sessionsViewMode"
                            @update:model-value="handleViewModeChange"
                            class="shrink-0">
                            <TooltipWrapper side="bottom" :content="t('view.game_log.sessions.switch_to_sessions')">
                                <ToggleGroupItem
                                    value="sessions"
                                    class="px-2 bv-focus-ring"
                                    :class="sessionsViewMode === 'sessions' && 'bg-accent text-accent-foreground'"
                                    :ariaLabel="t('view.game_log.sessions.switch_to_sessions')">
                                    <Logs class="size-4" />
                                </ToggleGroupItem>
                            </TooltipWrapper>
                            <TooltipWrapper side="bottom" :content="t('view.game_log.sessions.switch_to_table')">
                                <ToggleGroupItem
                                    value="table"
                                    class="px-2 bv-focus-ring"
                                    :class="sessionsViewMode === 'table' && 'bg-accent text-accent-foreground'"
                                    :ariaLabel="t('view.game_log.sessions.switch_to_table')">
                                    <Table2 class="size-4" />
                                </ToggleGroupItem>
                            </TooltipWrapper>
                        </ToggleGroup>
                    </template>
                </GameLogSessions>
            </section>
        </template>

        <template v-else>
            <section class="game-log__table-surface bv-surface" :aria-label="t('nav_tooltip.game_log')">
                <DataTableLayout
                    class="game-log__table bv-surface-raised"
                    :table="table"
                    :loading="gameLogTable.loading"
                    auto-height
                    :page-sizes="pageSizes"
                    :total-items="totalItems"
                    :on-page-size-change="handlePageSizeChange">
                    <template #toolbar>
                        <div class="game-log__control-surface bv-surface-raised">
                            <div class="game-log__primary-controls">
                                <ToggleGroup
                                    type="single"
                                    variant="outline"
                                    size="sm"
                                    :model-value="sessionsViewMode"
                                    @update:model-value="handleViewModeChange"
                                    class="shrink-0">
                                    <TooltipWrapper
                                        side="bottom"
                                        :content="t('view.game_log.sessions.switch_to_sessions')">
                                        <ToggleGroupItem
                                            value="sessions"
                                            class="px-2 bv-focus-ring"
                                            :class="
                                                sessionsViewMode === 'sessions' && 'bg-accent text-accent-foreground'
                                            "
                                            :ariaLabel="t('view.game_log.sessions.switch_to_sessions')">
                                            <Logs class="size-4" />
                                        </ToggleGroupItem>
                                    </TooltipWrapper>
                                    <TooltipWrapper
                                        side="bottom"
                                        :content="t('view.game_log.sessions.switch_to_table')">
                                        <ToggleGroupItem
                                            value="table"
                                            class="px-2 bv-focus-ring"
                                            :class="sessionsViewMode === 'table' && 'bg-accent text-accent-foreground'"
                                            :ariaLabel="t('view.game_log.sessions.switch_to_table')">
                                            <Table2 class="size-4" />
                                        </ToggleGroupItem>
                                    </TooltipWrapper>
                                </ToggleGroup>
                                <TooltipWrapper side="bottom" :content="t('view.feed.favorites_only_tooltip')">
                                    <div>
                                        <Toggle
                                            class="bv-focus-ring"
                                            variant="outline"
                                            size="sm"
                                            :model-value="gameLogTable.vip"
                                            :ariaLabel="t('view.feed.favorites_only_tooltip')"
                                            @update:modelValue="
                                                (v) => {
                                                    gameLogTable.vip = v;
                                                    gameLogTableLookup();
                                                }
                                            ">
                                            <Star fill="currentColor" v-if="gameLogTable.vip" />
                                            <Star v-else />
                                        </Toggle>
                                    </div>
                                </TooltipWrapper>
                            </div>
                            <Select
                                multiple
                                :model-value="Array.isArray(gameLogTable.filter) ? gameLogTable.filter : []"
                                @update:modelValue="handleGameLogFilterChange">
                                <SelectTrigger class="game-log__type-filter bv-focus-ring">
                                    <SelectValue :placeholder="t('view.game_log.filter_placeholder')" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem
                                            v-for="type in [
                                                'Location',
                                                'OnPlayerJoined',
                                                'OnPlayerLeft',
                                                'VideoPlay',
                                                'Event',
                                                'External',
                                                'StringLoad',
                                                'ImageLoad'
                                            ]"
                                            :key="type"
                                            :value="type">
                                            {{ t('view.game_log.filters.' + type) }}
                                        </SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <InputGroupField
                                class="game-log__search bv-focus-ring"
                                v-model="gameLogTable.search"
                                :placeholder="t('view.game_log.search_placeholder')"
                                clearable
                                @keyup.enter="gameLogTableLookup"
                                @change="gameLogTableLookup" />
                        </div>
                    </template>
                </DataTableLayout>
            </section>
        </template>
    </div>
</template>

<script setup>
    import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { computed, ref } from 'vue';
    import { Logs, Star, Table2 } from 'lucide-vue-next';
    import { Toggle } from '@/components/ui/toggle';
    import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import { useAppearanceSettingsStore, useGameLogStore, useModalStore, useVrcxStore } from '../../stores';
    import { DataTableLayout } from '../../components/ui/data-table';
    import { InputGroupField } from '../../components/ui/input-group';
    import { TooltipWrapper } from '../../components/ui/tooltip';
    import { createColumns } from './columns.jsx';
    import { database } from '../../services/database';
    import { useVrcxVueTable } from '../../lib/table/useVrcxVueTable';
    import GameLogSessions from './components/GameLogSessions.vue';

    const { gameLogTableLookup, setSessionsViewMode } = useGameLogStore();
    const { gameLogTable, gameLogTableData, sessionsViewMode, sessionsSegments } = storeToRefs(useGameLogStore());
    const appearanceSettingsStore = useAppearanceSettingsStore();
    const vrcxStore = useVrcxStore();
    const modalStore = useModalStore();

    /**
     *
     * @param row
     */
    function getGameLogCreatedAt(row) {
        if (typeof row?.created_at === 'string' && row.created_at.length > 0) {
            return row.created_at;
        }
        if (typeof row?.createdAt === 'string' && row.createdAt.length > 0) {
            return row.createdAt;
        }
        if (typeof row?.dt === 'string' && row.dt.length > 0) {
            return row.dt;
        }
        return '';
    }

    const { t } = useI18n();

    const gameLogRef = ref(null);

    /**
     *
     * @param row
     */
    function deleteGameLogEntryPrompt(row) {
        modalStore
            .confirm({
                description: t('confirm.delete_log'),
                title: t('common.actions.confirm')
            })
            .then(({ ok }) => ok && deleteGameLogEntry(row))
            .catch(() => {});
    }

    /**
     *
     * @param row
     */
    function deleteGameLogEntry(row) {
        const index = gameLogTableData.value.findIndex((entry) => entry === row);
        if (index !== -1) {
            gameLogTableData.value = [
                ...gameLogTableData.value.slice(0, index),
                ...gameLogTableData.value.slice(index + 1)
            ];
        }
        database.deleteGameLogEntry(row);
    }

    const columns = createColumns({
        getCreatedAt: getGameLogCreatedAt,
        onDelete: deleteGameLogEntry,
        onDeletePrompt: deleteGameLogEntryPrompt
    });

    /**
     *
     * @param value
     */
    function handleGameLogFilterChange(value) {
        gameLogTable.value.filter = Array.isArray(value) ? value : [];
        gameLogTableLookup();
    }

    const pageSizes = computed(() => appearanceSettingsStore.tablePageSizes);

    /**
     *
     * @param row
     */
    function getGameLogRowId(row) {
        if (row?.rowId != null) return `row:${row.rowId}:${row?.type ?? ''}`;

        const type = row?.type ?? '';
        const createdAt = row?.created_at ?? row?.createdAt ?? row?.dt ?? '';
        const userId = row?.userId ?? '';
        const displayName = row?.displayName ?? '';
        const location = row?.location ?? '';

        return `${type}:${createdAt}:${userId}:${displayName}:${location}:${Date.now()}`;
    }

    const { table, pagination } = useVrcxVueTable({
        persistKey: 'gameLog',
        get data() {
            return gameLogTableData.value;
        },
        columns,
        getRowId: getGameLogRowId,
        initialSorting: [],
        initialPagination: {
            pageIndex: 0,
            pageSize: appearanceSettingsStore.tablePageSize
        },
        tableOptions: {
            autoResetPageIndex: false
        }
    });

    const totalItems = computed(() => {
        if (sessionsViewMode.value === 'sessions') {
            return sessionsSegments.value.length;
        }
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

    /**
     * @param {'sessions'|'table'|undefined} mode
     */
    function handleViewModeChange(mode) {
        if (mode === 'sessions' || mode === 'table') {
            setSessionsViewMode(mode);
        }
    }
</script>

<style scoped>
    .game-log {
        display: flex;
        min-height: 0;
        flex-direction: column;
        gap: 14px;
    }

    .game-log__page-header {
        display: flex;
        flex: none;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 14px 16px;
    }

    .game-log__identity {
        display: grid;
        min-width: 0;
        gap: 4px;
    }

    .game-log__identity h1 {
        margin: 0;
        color: var(--bv-text-strong);
        font-size: 20px;
        font-weight: 750;
        line-height: 1.1;
    }

    .game-log__summary {
        display: flex;
        flex: none;
        align-items: center;
    }

    .game-log__record-count {
        color: var(--bv-text-strong);
        font-variant-numeric: tabular-nums;
    }

    .game-log__table-surface,
    .game-log__sessions-surface {
        flex: 1;
        min-height: 0;
        padding: 10px;
        overflow: hidden;
    }

    .game-log__table {
        min-width: 0;
        width: 100%;
    }

    .game-log__control-surface {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0 0 10px;
        padding: 8px;
    }

    .game-log__primary-controls {
        display: flex;
        flex: none;
        align-items: center;
        gap: 6px;
    }

    .game-log__type-filter {
        flex: 1;
        min-width: 240px;
    }

    .game-log__search {
        flex: 0 1 320px;
        min-width: 180px;
    }

    .game-log__table :deep(tbody button:focus-visible) {
        outline: 2px solid var(--bv-accent);
        outline-offset: 2px;
        border-radius: 5px;
    }

    @media (max-width: 900px) {
        .game-log__control-surface {
            flex-wrap: wrap;
        }

        .game-log__type-filter {
            min-width: min(240px, 100%);
        }

        .game-log__search {
            flex: 1 1 220px;
        }
    }
</style>
