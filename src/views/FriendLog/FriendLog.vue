<template>
    <div class="friend-log x-container x-container--auto-height" ref="friendLogRef">
        <header class="friend-log__page-header bv-surface">
            <div class="friend-log__identity">
                <span class="bv-eyebrow">{{ t('nav_tooltip.social') }}</span>
                <h1>{{ t('nav_tooltip.friend_log') }}</h1>
            </div>
            <div class="friend-log__summary" aria-live="polite">
                <span class="friend-log__record-count bv-badge" data-tone="accent">{{ totalItems }}</span>
            </div>
        </header>

        <section class="friend-log__table-surface bv-surface" :aria-label="t('nav_tooltip.friend_log')">
            <DataTableLayout
                class="friend-log__table bv-surface-raised"
                :table="table"
                :loading="friendLogTable.loading"
                auto-height
                :page-sizes="pageSizes"
                :total-items="totalItems"
                :on-page-size-change="handlePageSizeChange">
                <template #toolbar>
                    <div class="friend-log__control-surface bv-surface-raised">
                        <Select
                            multiple
                            :model-value="
                                Array.isArray(friendLogTable.filters?.[0]?.value) ? friendLogTable.filters[0].value : []
                            "
                            @update:modelValue="handleFriendLogFilterChange">
                            <SelectTrigger class="friend-log__type-filter bv-focus-ring">
                                <SelectValue :placeholder="t('view.friend_log.filter_placeholder')" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem
                                        v-for="type in [
                                            'Friend',
                                            'Unfriend',
                                            'FriendRequest',
                                            'CancelFriendRequest',
                                            'DisplayName',
                                            'TrustLevel'
                                        ]"
                                        :key="type"
                                        :value="type">
                                        {{ t('view.friend_log.filters.' + type) }}
                                    </SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <InputGroupField
                            class="friend-log__search bv-focus-ring"
                            v-model="friendLogTable.filters[1].value"
                            :placeholder="t('view.friend_log.search_placeholder')" />
                    </div>
                </template>
            </DataTableLayout>
        </section>
    </div>
</template>

<script setup>
    import { computed, ref, watch } from 'vue';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import dayjs from 'dayjs';

    import {
        Select,
        SelectContent,
        SelectGroup,
        SelectItem,
        SelectTrigger,
        SelectValue
    } from '../../components/ui/select';
    import { useAppearanceSettingsStore, useFriendStore, useModalStore, useVrcxStore } from '../../stores';
    import { DataTableLayout } from '../../components/ui/data-table';
    import { InputGroupField } from '../../components/ui/input-group';
    import { createColumns } from './columns.jsx';
    import { database } from '../../services/database';
    import { removeFromArray } from '../../shared/utils';
    import { useVrcxVueTable } from '../../lib/table/useVrcxVueTable';

    import configRepository from '../../services/config';

    const appearanceSettingsStore = useAppearanceSettingsStore();
    const vrcxStore = useVrcxStore();
    const modalStore = useModalStore();
    const { hideUnfriends } = storeToRefs(appearanceSettingsStore);
    const { friendLogTable } = storeToRefs(useFriendStore());

    const friendLogRef = ref(null);

    const friendLogDisplayData = computed(() => {
        const data = friendLogTable.value.data;
        const typeFilter = friendLogTable.value.filters?.[0]?.value ?? [];
        const searchFilter = friendLogTable.value.filters?.[1]?.value ?? '';
        const hideUnfriendsFilter = friendLogTable.value.filters?.[2]?.value;
        const typeSet = Array.isArray(typeFilter)
            ? new Set(typeFilter.map((value) => String(value).toLowerCase()))
            : null;
        const searchValue = String(searchFilter).trim().toLowerCase();

        const filtered = data.filter((row) => {
            if (hideUnfriendsFilter && row.type === 'Unfriend') {
                return false;
            }
            if (typeSet && typeSet.size > 0) {
                const rowType = String(row.type ?? '').toLowerCase();
                if (!typeSet.has(rowType)) {
                    return false;
                }
            }
            if (searchValue) {
                const displayName = row.displayName;
                if (
                    displayName === undefined ||
                    displayName === null ||
                    !String(displayName).toLowerCase().includes(searchValue)
                ) {
                    return false;
                }
            }
            return true;
        });

        return filtered.slice().sort((a, b) => {
            const aTime = typeof a?.created_at === 'string' ? a.created_at : '';
            const bTime = typeof b?.created_at === 'string' ? b.created_at : '';
            const aTs = dayjs(aTime).valueOf();
            const bTs = dayjs(bTime).valueOf();
            if (Number.isFinite(aTs) && Number.isFinite(bTs) && aTs !== bTs) {
                return bTs - aTs;
            }

            const aId = typeof a?.rowId === 'number' ? a.rowId : 0;
            const bId = typeof b?.rowId === 'number' ? b.rowId : 0;
            return bId - aId;
        });
    });

    watch(
        () => hideUnfriends.value,
        (newValue) => {
            friendLogTable.value.filters[2].value = newValue;
        },
        { immediate: true }
    );

    const { t } = useI18n();
    /**
     *
     */
    function saveTableFilters() {
        configRepository.setString('VRCX_friendLogTableFilters', JSON.stringify(friendLogTable.value.filters[0].value));
    }
    /**
     *
     * @param value
     */
    function handleFriendLogFilterChange(value) {
        friendLogTable.value.filters[0].value = Array.isArray(value) ? value : [];
        saveTableFilters();
    }
    /**
     *
     * @param row
     */
    function deleteFriendLogPrompt(row) {
        modalStore
            .confirm({
                description: t('confirm.delete_log'),
                title: 'Confirm'
            })
            .then(({ ok }) => ok && deleteFriendLog(row))
            .catch(() => {});
    }
    /**
     *
     * @param row
     */
    function deleteFriendLog(row) {
        removeFromArray(friendLogTable.value.data, row);
        database.deleteFriendLogHistory(row);
    }

    const columns = createColumns({
        onDelete: deleteFriendLog,
        onDeletePrompt: deleteFriendLogPrompt
    });

    const pageSizes = computed(() => appearanceSettingsStore.tablePageSizes);

    const { table, pagination } = useVrcxVueTable({
        persistKey: 'friendLog',
        get data() {
            return friendLogDisplayData.value;
        },
        columns,
        getRowId: (row) => `${row.type}:${row.rowId ?? row.userId ?? row.created_at ?? ''}`,
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
    .friend-log {
        display: flex;
        min-height: 0;
        flex-direction: column;
        gap: 14px;
    }

    .friend-log__page-header {
        display: flex;
        flex: none;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 14px 16px;
    }

    .friend-log__identity {
        display: grid;
        min-width: 0;
        gap: 4px;
    }

    .friend-log__identity h1 {
        margin: 0;
        color: var(--bv-text-strong);
        font-size: 20px;
        font-weight: 750;
        line-height: 1.1;
    }

    .friend-log__summary {
        display: flex;
        flex: none;
        align-items: center;
    }

    .friend-log__record-count {
        color: var(--bv-text-strong);
        font-variant-numeric: tabular-nums;
    }

    .friend-log__table-surface {
        flex: 1;
        min-height: 0;
        padding: 10px;
        overflow: hidden;
    }

    .friend-log__table {
        min-width: 0;
        width: 100%;
    }

    .friend-log__control-surface {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0 0 10px;
        padding: 8px;
    }

    .friend-log__type-filter {
        flex: 1;
        min-width: 260px;
    }

    .friend-log__search {
        flex: 0 1 320px;
        min-width: 180px;
    }

    .friend-log__table :deep(tbody button:focus-visible) {
        outline: 2px solid var(--bv-accent-primary);
        outline-offset: 2px;
        border-radius: var(--bv-radius-xs);
    }

    @media (max-width: 760px) {
        .friend-log__control-surface {
            flex-wrap: wrap;
        }

        .friend-log__type-filter,
        .friend-log__search {
            flex: 1 1 100%;
            min-width: 0;
        }
    }
</style>
