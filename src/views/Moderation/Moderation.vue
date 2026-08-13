<template>
    <div class="moderation x-container x-container--auto-height" ref="moderationRef">
        <header class="moderation__page-header bv-surface">
            <div class="moderation__identity">
                <span class="bv-eyebrow">{{ t('nav_tooltip.social') }}</span>
                <h1>{{ t('nav_tooltip.moderation') }}</h1>
            </div>
            <div class="moderation__summary" aria-live="polite">
                <span class="moderation__record-count bv-badge" data-tone="accent">{{ totalItems }}</span>
            </div>
        </header>

        <div class="moderation__control-surface bv-surface-raised">
            <Select
                multiple
                :model-value="
                    Array.isArray(playerModerationTable.filters?.[0]?.value)
                        ? playerModerationTable.filters[0].value
                        : []
                "
                @update:modelValue="handleModerationFilterChange">
                <SelectTrigger class="moderation__type-filter bv-focus-ring">
                    <SelectValue :placeholder="t('view.moderation.filter_placeholder')" />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        <SelectItem v-for="item in moderationTypes" :key="item" :value="item">
                            {{ t('view.moderation.filters.' + item) }}
                        </SelectItem>
                    </SelectGroup>
                </SelectContent>
            </Select>
            <InputGroupField
                v-model="playerModerationTable.filters[1].value"
                :placeholder="t('view.moderation.search_placeholder')"
                class="moderation__search bv-focus-ring" />
            <TooltipWrapper side="bottom" :content="t('view.moderation.refresh_tooltip')">
                <Button
                    class="rounded-full bv-focus-ring"
                    variant="ghost"
                    size="icon-sm"
                    :disabled="playerModerationTable.loading"
                    @click="refreshPlayerModerations()">
                    <Spinner v-if="playerModerationTable.loading" />
                    <RefreshCw v-else />
                </Button>
            </TooltipWrapper>
        </div>

        <section class="moderation__table-surface bv-surface" :aria-label="t('nav_tooltip.moderation')">
            <DataTableLayout
                class="moderation__table bv-surface-raised"
                :table="table"
                :loading="playerModerationTable.loading"
                auto-height
                :page-sizes="pageSizes"
                :total-items="totalItems"
                :on-page-size-change="handlePageSizeChange" />
        </section>
    </div>
</template>

<script setup>
    import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { computed, ref, watch } from 'vue';
    import { Button } from '@/components/ui/button';
    import { InputGroupField } from '@/components/ui/input-group';
    import { RefreshCw } from 'lucide-vue-next';
    import { Spinner } from '@/components/ui/spinner';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import { useAppearanceSettingsStore, useModalStore, useModerationStore, useVrcxStore } from '../../stores';
    import { runRefreshPlayerModerationsFlow as refreshPlayerModerations } from '../../coordinators/moderationCoordinator';
    import { DataTableLayout } from '../../components/ui/data-table';
    import { createColumns } from './columns.jsx';
    import { moderationTypes } from '../../shared/constants';
    import { playerModerationRequest } from '../../api';
    import { useVrcxVueTable } from '../../lib/table/useVrcxVueTable';

    import configRepository from '../../services/config.js';

    const { t } = useI18n();
    const { playerModerationTable } = storeToRefs(useModerationStore());
    const { handlePlayerModerationDelete } = useModerationStore();
    const appearanceSettingsStore = useAppearanceSettingsStore();
    const vrcxStore = useVrcxStore();
    const modalStore = useModalStore();

    const moderationRef = ref(null);

    async function init() {
        playerModerationTable.value.filters[0].value = JSON.parse(
            await configRepository.getString('VRCX_playerModerationTableFilters', '[]')
        );
    }

    init();

    function saveTableFilters() {
        configRepository.setString(
            'VRCX_playerModerationTableFilters',
            JSON.stringify(playerModerationTable.value.filters[0].value)
        );
    }

    function handleModerationFilterChange(value) {
        playerModerationTable.value.filters[0].value = Array.isArray(value) ? value : [];
        saveTableFilters();
    }

    async function deletePlayerModeration(row) {
        const args = await playerModerationRequest.deletePlayerModeration({
            moderated: row.targetUserId,
            type: row.type
        });
        handlePlayerModerationDelete(args);
    }

    function deletePlayerModerationPrompt(row) {
        modalStore
            .confirm({
                description: `Continue? Moderation ${row.type}`,
                title: 'Confirm'
            })
            .then(({ ok }) => ok && deletePlayerModeration(row))
            .catch(() => {});
    }

    const moderationDisplayData = computed(() => {
        const data = playerModerationTable.value.data;
        const typeFilter = playerModerationTable.value.filters?.[0]?.value ?? [];
        const searchFilter = playerModerationTable.value.filters?.[1]?.value ?? '';
        const typeSet = Array.isArray(typeFilter)
            ? new Set(typeFilter.map((value) => String(value).toLowerCase()))
            : null;
        const searchValue = String(searchFilter).trim().toLowerCase();

        return data.filter((row) => {
            if (typeSet && typeSet.size > 0) {
                const rowType = String(row.type ?? '').toLowerCase();
                if (!typeSet.has(rowType)) {
                    return false;
                }
            }
            if (searchValue) {
                const source = String(row.sourceDisplayName ?? '').toLowerCase();
                const target = String(row.targetDisplayName ?? '').toLowerCase();
                if (!source.includes(searchValue) && !target.includes(searchValue)) {
                    return false;
                }
            }
            return true;
        });
    });

    const columns = createColumns({
        onDelete: deletePlayerModeration,
        onDeletePrompt: deletePlayerModerationPrompt
    });

    const pageSizes = computed(() => appearanceSettingsStore.tablePageSizes);

    const { table, pagination } = useVrcxVueTable({
        persistKey: 'moderation',
        get data() {
            return moderationDisplayData.value;
        },
        columns,
        getRowId: (row) => row.id ?? `${row.type}:${row.sourceUserId}:${row.targetUserId}:${row.created ?? ''}`,
        initialSorting: [{ id: 'created', desc: true }],
        initialPagination: {
            pageIndex: 0,
            pageSize: appearanceSettingsStore.tablePageSize
        }
    });

    const totalItems = computed(() => {
        return table.getFilteredRowModel().rows.length;
    });

    const handlePageSizeChange = (size) => {
        pagination.value = {
            ...pagination.value,
            pageIndex: 0,
            pageSize: size
        };
    };
</script>

<style scoped>
    .moderation {
        display: flex;
        min-height: 0;
        flex-direction: column;
        gap: 14px;
    }

    .moderation__page-header {
        display: flex;
        flex: none;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 14px 16px;
    }

    .moderation__identity {
        display: grid;
        min-width: 0;
        gap: 4px;
    }

    .moderation__identity h1 {
        margin: 0;
        color: var(--bv-text-strong);
        font-size: 20px;
        font-weight: 750;
        line-height: 1.1;
    }

    .moderation__summary {
        display: flex;
        flex: none;
        align-items: center;
    }

    .moderation__record-count {
        color: var(--bv-text-strong);
        font-variant-numeric: tabular-nums;
    }

    .moderation__control-surface {
        display: flex;
        flex: none;
        align-items: center;
        gap: 10px;
        padding: 8px;
    }

    .moderation__type-filter {
        flex: 1;
        min-width: 260px;
    }

    .moderation__search {
        flex: 0 1 320px;
        min-width: 180px;
    }

    .moderation__table-surface {
        flex: 1;
        min-height: 0;
        padding: 10px;
        overflow: hidden;
    }

    .moderation__table {
        min-width: 0;
        width: 100%;
    }

    .moderation__table :deep(tbody button:focus-visible) {
        outline: 2px solid var(--bv-accent-primary);
        outline-offset: 2px;
        border-radius: var(--bv-radius-xs);
    }

    @media (max-width: 760px) {
        .moderation__control-surface {
            flex-wrap: wrap;
        }

        .moderation__type-filter,
        .moderation__search {
            flex: 1 1 100%;
            min-width: 0;
        }
    }
</style>
