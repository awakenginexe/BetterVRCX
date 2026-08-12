<template>
    <div class="notification x-container x-container--auto-height" ref="notificationsRef">
        <header class="notification__page-header bv-surface">
            <div class="notification__identity">
                <span class="bv-eyebrow">{{ t('nav_tooltip.social') }}</span>
                <h1>{{ t('nav_tooltip.notification') }}</h1>
            </div>
            <div class="notification__summary" aria-live="polite">
                <span
                    class="notification__visible-count bv-badge"
                    data-tone="accent"
                    :aria-label="`${t('view.notification.visible')}: ${notificationDisplayData.length}`">
                    <span class="notification__visible-label">{{ t('view.notification.visible') }}</span>
                    <span class="notification__visible-value">{{ notificationDisplayData.length }}</span>
                </span>
                <span
                    class="notification__unread-count bv-badge"
                    data-tone="warning"
                    :aria-label="`${t('view.notification.unread')}: ${unseenNotifications.length}`">
                    <span class="notification__unread-label">{{ t('view.notification.unread') }}</span>
                    <span class="notification__unread-value">{{ unseenNotifications.length }}</span>
                </span>
            </div>
        </header>

        <section class="notification__table-surface bv-surface" :aria-label="t('nav_tooltip.notification')">
            <DataTableLayout
                class="notification__table bv-surface-raised"
                :table="table"
                :loading="isNotificationsLoading"
                auto-height
                :page-sizes="pageSizes"
                :total-items="totalItems"
                :on-page-size-change="handlePageSizeChange">
                <template #toolbar>
                    <div class="notification__control-surface bv-surface-raised">
                        <Select
                            multiple
                            :model-value="
                                Array.isArray(notificationTable.filters?.[0]?.value)
                                    ? notificationTable.filters[0].value
                                    : []
                            "
                            @update:modelValue="handleNotificationFilterChange">
                            <SelectTrigger class="notification__type-filter bv-focus-ring">
                                <SelectValue :placeholder="t('view.notification.filter_placeholder')" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem
                                        v-for="type in [
                                            'requestInvite',
                                            'invite',
                                            'requestInviteResponse',
                                            'inviteResponse',
                                            'friendRequest',
                                            'ignoredFriendRequest',
                                            'message',
                                            'boop',
                                            'event.announcement',
                                            'groupChange',
                                            'group.announcement',
                                            'group.informative',
                                            'group.invite',
                                            'group.joinRequest',
                                            'group.transfer',
                                            'group.queueReady',
                                            'group.event.created',
                                            'group.event.starting',
                                            'moderation.warning.group',
                                            'moderation.report.closed',
                                            'moderation.contentrestriction',
                                            'instance.closed',
                                            'economy.alert',
                                            'twitchdrop.fulfilled'
                                        ]"
                                        :key="type"
                                        :value="type">
                                        {{ t('view.notification.filters.' + type) }}
                                    </SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <div class="notification__search-actions">
                            <InputGroupField
                                v-model="notificationTable.filters[1].value"
                                :placeholder="t('view.notification.search_placeholder')"
                                clearable
                                class="notification__search bv-focus-ring" />
                            <TooltipWrapper side="bottom" :content="t('view.notification.refresh_tooltip')">
                                <Button
                                    class="notification__refresh bv-focus-ring rounded-full"
                                    variant="ghost"
                                    size="icon-sm"
                                    :disabled="isNotificationsLoading"
                                    style="flex: none"
                                    :ariaLabel="t('view.notification.refresh_tooltip')"
                                    @click="refreshNotifications()">
                                    <Spinner v-if="isNotificationsLoading" />
                                    <RefreshCw v-else />
                                </Button>
                            </TooltipWrapper>
                        </div>
                    </div>
                </template>
                <template #empty>
                    <DataTableEmpty
                        v-if="!isNotificationsLoading"
                        class="notification__empty-state bv-empty-state"
                        :type="notificationEmptyType" />
                </template>
            </DataTableLayout>
        </section>
        <SendInviteResponseDialog
            v-model:send-invite-response-dialog="sendInviteResponseDialog"
            v-model:sendInviteResponseDialogVisible="sendInviteResponseDialogVisible" />
        <SendInviteRequestResponseDialog
            v-model:send-invite-response-dialog="sendInviteResponseDialog"
            v-model:sendInviteRequestResponseDialogVisible="sendInviteRequestResponseDialogVisible" />
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

    import dayjs from 'dayjs';

    import {
        useAppearanceSettingsStore,
        useGalleryStore,
        useInviteStore,
        useNotificationStore,
        useVrcxStore
    } from '../../stores';
    import { DataTableEmpty, DataTableLayout } from '../../components/ui/data-table';
    import { convertFileUrlToImageUrl } from '../../shared/utils';
    import { createColumns } from './columns.jsx';
    import { useVrcxVueTable } from '../../lib/table/useVrcxVueTable';

    import SendInviteRequestResponseDialog from './dialogs/SendInviteRequestResponseDialog.vue';
    import SendInviteResponseDialog from './dialogs/SendInviteResponseDialog.vue';
    import configRepository from '../../services/config';

    const { refreshInviteMessageTableData } = useInviteStore();
    const { clearInviteImageUpload } = useGalleryStore();
    const { notificationTable, isNotificationsLoading, unseenNotifications } = storeToRefs(useNotificationStore());
    const {
        refreshNotifications,
        acceptFriendRequestNotification,
        hideNotification,
        hideNotificationPrompt,
        acceptRequestInvite,
        sendNotificationResponse,
        deleteNotificationLog,
        deleteNotificationLogPrompt,
        openNotificationLink
    } = useNotificationStore();
    const { showFullscreenImageDialog } = useGalleryStore();
    const appearanceSettingsStore = useAppearanceSettingsStore();
    const vrcxStore = useVrcxStore();

    const { t } = useI18n();

    const notificationsRef = ref(null);

    /**
     *
     * @param row
     */
    function getNotificationCreatedAt(row) {
        if (typeof row?.created_at === 'string' && row.created_at.length > 0) {
            return row.created_at;
        }
        if (typeof row?.createdAt === 'string' && row.createdAt.length > 0) {
            return row.createdAt;
        }
        return '';
    }

    /**
     *
     * @param row
     */
    function getNotificationCreatedAtTs(row) {
        const createdAtRaw = row?.created_at ?? row?.createdAt;
        if (typeof createdAtRaw === 'number') {
            const ts = createdAtRaw > 1_000_000_000_000 ? createdAtRaw : createdAtRaw * 1000;
            return Number.isFinite(ts) ? ts : 0;
        }

        const createdAt = getNotificationCreatedAt(row);
        const ts = dayjs(createdAt).valueOf();
        return Number.isFinite(ts) ? ts : 0;
    }

    const asRawArray = (value) => (Array.isArray(value) ? value : []);
    const isEmptyFilterValue = (value) => (Array.isArray(value) ? value.length === 0 : !value);
    const applyFilter = (row, filter) => {
        if (Array.isArray(filter.prop)) {
            return filter.prop.some((propItem) => applyFilter(row, { prop: propItem, value: filter.value }));
        }

        const cellValue = row[filter.prop];
        if (cellValue === undefined || cellValue === null) {
            return false;
        }

        if (Array.isArray(filter.value)) {
            return filter.value.some((val) => String(cellValue).toLowerCase() === String(val).toLowerCase());
        }
        return String(cellValue).toLowerCase().includes(String(filter.value).toLowerCase());
    };

    const notificationDisplayData = computed(() => {
        const rawData = asRawArray(notificationTable.value.data);
        const rawFilters = Array.isArray(notificationTable.value.filters) ? notificationTable.value.filters : [];
        const activeFilters = rawFilters.filter((filter) => !isEmptyFilterValue(filter?.value));

        if (activeFilters.length === 0) {
            return rawData.slice();
        }

        return rawData.filter((row) => {
            for (const filter of activeFilters) {
                if (filter.filterFn) {
                    if (!filter.filterFn(row, filter)) {
                        return false;
                    }
                    continue;
                }
                if (!applyFilter(row, filter)) {
                    return false;
                }
            }
            return true;
        });
    });

    const notificationEmptyType = computed(() => {
        const rawData = asRawArray(notificationTable.value.data);
        return rawData.length > 0 && notificationDisplayData.value.length === 0 ? 'nomatch' : 'nodata';
    });

    const columns = createColumns({
        getNotificationCreatedAt,
        getNotificationCreatedAtTs,
        openNotificationLink,
        showFullscreenImageDialog,
        getSmallThumbnailUrl,
        acceptFriendRequestNotification,
        showSendInviteResponseDialog,
        showSendInviteRequestResponseDialog,
        acceptRequestInvite,
        sendNotificationResponse,
        hideNotification,
        hideNotificationPrompt,
        deleteNotificationLog,
        deleteNotificationLogPrompt
    });

    const pageSizes = computed(() => appearanceSettingsStore.tablePageSizes);

    const { table, pagination } = useVrcxVueTable({
        persistKey: 'notifications',
        get data() {
            return notificationDisplayData.value;
        },
        columns,
        getRowId: (row) => row.id ?? `${row.type}:${row.senderUserId ?? ''}:${row.created_at ?? ''}`,
        initialSorting: [{ id: 'created_at', desc: true }],
        initialPagination: {
            pageIndex: 0,
            pageSize: appearanceSettingsStore.tablePageSize
        },
        tableOptions: {
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

    const sendInviteResponseDialog = ref({
        messageSlot: {},
        invite: {}
    });

    const sendInviteResponseDialogVisible = ref(false);

    const sendInviteRequestResponseDialogVisible = ref(false);

    /**
     *
     */
    function saveTableFilters() {
        configRepository.setString(
            'VRCX_notificationTableFilters',
            JSON.stringify(notificationTable.value.filters[0].value)
        );
    }

    /**
     *
     * @param value
     */
    function handleNotificationFilterChange(value) {
        notificationTable.value.filters[0].value = Array.isArray(value) ? value : [];
        saveTableFilters();
    }

    /**
     *
     * @param url
     */
    function getSmallThumbnailUrl(url) {
        return convertFileUrlToImageUrl(url);
    }

    /**
     *
     * @param invite
     */
    function showSendInviteResponseDialog(invite) {
        sendInviteResponseDialog.value.invite = invite;
        sendInviteResponseDialog.value.messageSlot = {};
        refreshInviteMessageTableData('response');
        clearInviteImageUpload();
        sendInviteResponseDialogVisible.value = true;
    }

    /**
     *
     * @param invite
     */
    function showSendInviteRequestResponseDialog(invite) {
        sendInviteResponseDialog.value.invite = invite;
        sendInviteResponseDialog.value.messageSlot = {};
        refreshInviteMessageTableData('requestResponse');
        clearInviteImageUpload();
        sendInviteRequestResponseDialogVisible.value = true;
    }
</script>

<style scoped>
    .notification {
        display: flex;
        min-height: 0;
        flex-direction: column;
        gap: 14px;
    }

    .notification__page-header {
        display: flex;
        flex: none;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 14px 16px;
    }

    .notification__identity {
        display: grid;
        min-width: 0;
        gap: 4px;
    }

    .notification__identity h1 {
        margin: 0;
        color: var(--bv-text-strong);
        font-size: 20px;
        font-weight: 750;
        line-height: 1.1;
    }

    .notification__summary {
        display: flex;
        flex: none;
        align-items: center;
        gap: 8px;
    }

    .notification__visible-count,
    .notification__unread-count {
        display: inline-flex;
        align-items: baseline;
        gap: 4px;
        color: var(--bv-text-strong);
        font-variant-numeric: tabular-nums;
    }

    .notification__visible-label,
    .notification__unread-label {
        color: var(--bv-text-muted);
        font-weight: 600;
    }

    .notification__visible-value,
    .notification__unread-value {
        font-weight: 750;
    }

    .notification__table-surface {
        flex: 1;
        min-height: 0;
        padding: 10px;
        overflow: hidden;
    }

    .notification__table {
        min-width: 0;
        width: 100%;
    }

    .notification__control-surface {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0 0 10px;
        padding: 8px;
    }

    .notification__type-filter {
        flex: 1;
        min-width: 260px;
    }

    .notification__search-actions {
        display: flex;
        min-width: 0;
        flex: 0 1 340px;
        align-items: center;
        gap: 8px;
    }

    .notification__search {
        min-width: 0;
        flex: 1;
    }

    .notification__empty-state {
        min-height: 160px;
    }

    .notification__table :deep(tbody button:focus-visible),
    .notification__table :deep(a:focus-visible) {
        outline: 2px solid var(--bv-accent);
        outline-offset: 2px;
        border-radius: 5px;
    }

    @media (max-width: 760px) {
        .notification__page-header,
        .notification__control-surface {
            align-items: stretch;
            flex-wrap: wrap;
        }

        .notification__type-filter,
        .notification__search-actions {
            flex: 1 1 100%;
            min-width: 0;
        }

        .notification__summary {
            width: 100%;
        }
    }
</style>
