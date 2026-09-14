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
                    <div
                        v-if="selectedCount > 0"
                        class="notification__bulk-surface bv-surface-raised"
                        aria-live="polite">
                        <div class="notification__bulk-info">
                            <span class="notification__bulk-count bv-badge" data-tone="accent">
                                {{ t('view.notification.bulk.selected', { count: selectedCount }, `${selectedCount} selected`) }}
                            </span>
                            <Spinner v-if="isBulkProcessing" class="size-4" />
                        </div>
                        <div class="notification__bulk-actions">
                            <Button
                                size="sm"
                                variant="outline"
                                class="bv-focus-ring"
                                :disabled="isBulkProcessing || selectedAcceptableCount === 0"
                                @click="handleBulkAccept">
                                <Check class="mr-1.5 h-3.5 w-3.5 text-green-500" />
                                {{ t('view.notification.bulk.accept', 'Accept') }} ({{ selectedAcceptableCount }})
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                class="bv-focus-ring"
                                :disabled="isBulkProcessing || selectedDeclinableCount === 0"
                                @click="handleBulkDecline">
                                <X class="mr-1.5 h-3.5 w-3.5 text-amber-500" />
                                {{ t('view.notification.bulk.decline', 'Decline') }} ({{ selectedDeclinableCount }})
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                class="bv-focus-ring"
                                :disabled="isBulkProcessing || selectedUnreadCount === 0"
                                @click="handleBulkMarkAsRead">
                                <CheckCheck class="mr-1.5 h-3.5 w-3.5 text-blue-500" />
                                {{ t('view.notification.bulk.mark_as_read', 'Mark as read') }} ({{ selectedUnreadCount }})
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                class="bv-focus-ring hover:text-destructive hover:border-destructive/40"
                                :disabled="isBulkProcessing || selectedDeletableCount === 0"
                                @click="handleBulkDelete">
                                <Trash2 class="mr-1.5 h-3.5 w-3.5 text-destructive" />
                                {{ t('view.notification.bulk.delete', 'Delete') }} ({{ selectedDeletableCount }})
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                class="bv-focus-ring text-muted-foreground"
                                :disabled="isBulkProcessing"
                                @click="clearSelection">
                                {{ t('view.notification.bulk.clear', 'Clear selection') }}
                            </Button>
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
    import { Check, CheckCheck, RefreshCw, Trash2, X } from 'lucide-vue-next';
    import { Spinner } from '@/components/ui/spinner';
    import { toast } from 'vue-sonner';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import dayjs from 'dayjs';

    import {
        useAppearanceSettingsStore,
        useGalleryStore,
        useGameStore,
        useInstanceStore,
        useInviteStore,
        useLocationStore,
        useModalStore,
        useNotificationStore,
        useUserStore,
        useVrcxStore
    } from '../../stores';
    import { DataTableEmpty, DataTableLayout } from '../../components/ui/data-table';
    import { convertFileUrlToImageUrl, executeWithBackoff, parseLocation } from '../../shared/utils';
    import { checkCanInvite } from '../../shared/utils/invite';
    import { friendRequest, notificationRequest, queryRequest } from '../../api';
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
        openNotificationLink,
        isNotificationExpired,
        handleNotificationAccept,
        handleNotificationHide,
        handleNotificationV2Hide,
        handleNotificationSee,
        handleNotificationV2Update
    } = useNotificationStore();
    const { showFullscreenImageDialog } = useGalleryStore();
    const appearanceSettingsStore = useAppearanceSettingsStore();
    const vrcxStore = useVrcxStore();
    const userStore = useUserStore();
    const locationStore = useLocationStore();
    const gameStore = useGameStore();
    const instanceStore = useInstanceStore();
    const modalStore = useModalStore();

    const { currentUser } = storeToRefs(userStore);
    const { lastLocation } = storeToRefs(locationStore);
    const { isGameRunning } = storeToRefs(gameStore);
    const { cachedInstances } = instanceStore;

    const { t } = useI18n();

    const notificationsRef = ref(null);
    const selectedNotificationIds = ref(new Set());
    const isBulkProcessing = ref(false);

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

    const canInvite = () => {
        const location = lastLocation.value?.location;
        return (
            Boolean(location) &&
            isGameRunning.value &&
            checkCanInvite(location, {
                currentUserId: currentUser.value?.id,
                lastLocationStr: lastLocation.value?.location,
                cachedInstances: cachedInstances
            })
        );
    };

    function canAcceptNotification(row) {
        if (!row || isNotificationExpired(row) || row.senderUserId === currentUser.value?.id) {
            return false;
        }
        if (row.type === 'friendRequest') {
            return true;
        }
        if (row.type === 'requestInvite') {
            return canInvite();
        }
        if (Array.isArray(row.responses)) {
            return row.responses.some((r) => r.type === 'accept' || r.icon === 'check');
        }
        return false;
    }

    function canDeclineNotification(row) {
        if (!row || isNotificationExpired(row) || row.senderUserId === currentUser.value?.id) {
            return false;
        }
        if (Array.isArray(row.responses) && row.responses.some((r) => r.type === 'decline' || r.icon === 'cancel')) {
            return true;
        }
        return (
            row.type !== 'requestInviteResponse' &&
            row.type !== 'inviteResponse' &&
            row.type !== 'message' &&
            row.type !== 'boop' &&
            row.type !== 'groupChange' &&
            !row.type?.includes('group.') &&
            !row.type?.includes('moderation.') &&
            !row.type?.includes('instance.') &&
            !row.link?.startsWith('economy.')
        );
    }

    function canMarkAsReadNotification(row) {
        if (!row) return false;
        return row.seen === false || unseenNotifications.value.includes(row.id);
    }

    function canDeleteNotification(row) {
        if (!row) return false;
        return row.type !== 'friendRequest' && row.type !== 'ignoredFriendRequest';
    }

    const selectedCount = computed(() => selectedNotificationIds.value.size);

    const selectedNotifications = computed(() => {
        const ids = selectedNotificationIds.value;
        if (ids.size === 0) return [];
        const data = asRawArray(notificationTable.value.data);
        return data.filter((row) => ids.has(row.id));
    });

    const isAllSelected = computed(() => {
        const display = notificationDisplayData.value;
        if (display.length === 0) return false;
        return display.every((row) => selectedNotificationIds.value.has(row.id));
    });

    const isSomeSelected = computed(() => {
        const display = notificationDisplayData.value;
        if (display.length === 0 || isAllSelected.value) return false;
        return display.some((row) => selectedNotificationIds.value.has(row.id));
    });

    const selectedAcceptableCount = computed(() => {
        return selectedNotifications.value.filter(canAcceptNotification).length;
    });

    const selectedDeclinableCount = computed(() => {
        return selectedNotifications.value.filter(canDeclineNotification).length;
    });

    const selectedUnreadCount = computed(() => {
        return selectedNotifications.value.filter(canMarkAsReadNotification).length;
    });

    const selectedDeletableCount = computed(() => {
        return selectedNotifications.value.filter(canDeleteNotification).length;
    });

    function toggleNotificationSelection(id) {
        if (!id) return;
        const next = new Set(selectedNotificationIds.value);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        selectedNotificationIds.value = next;
    }

    function toggleSelectAll() {
        if (isAllSelected.value) {
            clearSelection();
        } else {
            const next = new Set(selectedNotificationIds.value);
            for (const row of notificationDisplayData.value) {
                if (row.id) next.add(row.id);
            }
            selectedNotificationIds.value = next;
        }
    }

    function clearSelection() {
        selectedNotificationIds.value = new Set();
    }

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
        deleteNotificationLogPrompt,
        selectedNotificationIds,
        onToggleNotificationSelection: toggleNotificationSelection,
        isAllSelected,
        isSomeSelected,
        onToggleSelectAll: toggleSelectAll
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

    async function runThrottledBulkAction({
        items,
        actionFn,
        delayMs = import.meta.env?.MODE === 'test' ? 0 : 350,
        onProgress
    }) {
        let succeeded = 0;
        let failed = 0;
        const errors = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            try {
                await executeWithBackoff(
                    async () => {
                        return await actionFn(item);
                    },
                    {
                        maxRetries: 3,
                        baseDelay: 1000,
                        shouldRetry: (err) =>
                            err?.status === 429 ||
                            (err?.message || '').includes('429')
                    }
                );
                succeeded++;
                const next = new Set(selectedNotificationIds.value);
                next.delete(item.id);
                selectedNotificationIds.value = next;
            } catch (err) {
                console.error(`Bulk action error for notification ${item.id}:`, err);
                failed++;
                errors.push({ item, error: err });
            }

            onProgress?.(i + 1, items.length);

            if (i < items.length - 1 && delayMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }

        return { succeeded, failed, errors };
    }

    function reportBulkResult(succeeded, failed, actionName) {
        if (succeeded > 0 && failed === 0) {
            toast.success(
                t('view.notification.bulk.success_all', { count: succeeded }, `${actionName} ${succeeded} notifications.`)
            );
        } else if (succeeded > 0 && failed > 0) {
            toast.warning(
                t(
                    'view.notification.bulk.partial_failure',
                    { succeeded, failed },
                    `Completed ${succeeded} notifications (${failed} failed).`
                )
            );
        } else if (failed > 0) {
            toast.error(
                t(
                    'view.notification.bulk.all_failed',
                    { count: failed },
                    `Failed to process ${failed} notifications.`
                )
            );
        }
    }

    async function executeAcceptItem(row) {
        if (row.type === 'friendRequest') {
            try {
                const args = await notificationRequest.acceptFriendRequestNotification({
                    notificationId: row.id
                });
                handleNotificationAccept(args);
            } catch (err) {
                if (err && err.message && err.message.includes('404')) {
                    handleNotificationHide(row.id);
                    return;
                }
                throw err;
            }
            return;
        }

        if (row.type === 'requestInvite') {
            let currentLocation = lastLocation.value?.location;
            if (currentLocation === 'traveling') {
                currentLocation = locationStore.lastLocationDestination;
            }
            if (!currentLocation) {
                currentLocation = currentUser.value?.$locationTag;
            }
            const L = parseLocation(currentLocation);
            let worldName = row.details?.worldName || '';
            try {
                const worldRes = await queryRequest.fetch('world', { worldId: L.worldId });
                if (worldRes?.ref?.name) {
                    worldName = worldRes.ref.name;
                }
            } catch {}
            await notificationRequest.sendInvite(
                {
                    instanceId: L.tag,
                    worldId: L.tag,
                    worldName,
                    rsvp: true
                },
                row.senderUserId
            );
            await notificationRequest.hideNotification({ notificationId: row.id });
            handleNotificationHide(row.id);
            return;
        }

        if (Array.isArray(row.responses)) {
            const acceptResp = row.responses.find((r) => r.type === 'accept' || r.icon === 'check');
            if (acceptResp) {
                const responseType = acceptResp.type || 'accept';
                const responseData = acceptResp.data || '';
                await notificationRequest.sendNotificationResponse({
                    notificationId: row.id,
                    responseType,
                    responseData
                });
                handleNotificationV2Hide(row.id);
                return;
            }
        }
    }

    async function executeDeclineItem(row) {
        if (Array.isArray(row.responses)) {
            const declineResp = row.responses.find((r) => r.type === 'decline' || r.icon === 'cancel');
            if (declineResp) {
                const responseType = declineResp.type || 'decline';
                const responseData = declineResp.data || '';
                await notificationRequest.sendNotificationResponse({
                    notificationId: row.id,
                    responseType,
                    responseData
                });
                handleNotificationV2Hide(row.id);
                return;
            }
        }

        if (row.type === 'ignoredFriendRequest') {
            await friendRequest.deleteHiddenFriendRequest(
                { notificationId: row.id },
                row.senderUserId
            );
            handleNotificationHide(row.id);
            return;
        }

        await notificationRequest.hideNotification({
            notificationId: row.id
        });
        handleNotificationHide(row.id);
    }

    async function executeMarkAsReadItem(row) {
        if (row.version && row.version >= 2) {
            const args = await notificationRequest.seeNotificationV2({
                notificationId: row.id
            });
            handleNotificationV2Update({
                params: { notificationId: row.id },
                json: { ...(args?.json || {}), seen: true }
            });
            handleNotificationSee(row.id);
        } else {
            await notificationRequest.seeNotification({
                notificationId: row.id
            });
            handleNotificationSee(row.id);
        }
    }

    function handleBulkAccept() {
        const items = selectedNotifications.value.filter(canAcceptNotification);
        if (items.length === 0) return;
        const count = items.length;
        modalStore
            .confirm({
                title: t('view.notification.bulk.confirm_accept_title', { count }, `Accept ${count} notifications?`),
                description: t(
                    'view.notification.bulk.confirm_accept_desc',
                    { count },
                    `Are you sure you want to accept ${count} notifications? Unsupported items will be skipped.`
                )
            })
            .then(async ({ ok }) => {
                if (!ok) return;
                isBulkProcessing.value = true;
                try {
                    const { succeeded, failed } = await runThrottledBulkAction({
                        items,
                        actionFn: executeAcceptItem
                    });
                    reportBulkResult(succeeded, failed, 'Accepted');
                } finally {
                    isBulkProcessing.value = false;
                }
            })
            .catch(() => {});
    }

    function handleBulkDecline() {
        const items = selectedNotifications.value.filter(canDeclineNotification);
        if (items.length === 0) return;
        const count = items.length;
        modalStore
            .confirm({
                title: t('view.notification.bulk.confirm_decline_title', { count }, `Decline ${count} notifications?`),
                description: t(
                    'view.notification.bulk.confirm_decline_desc',
                    { count },
                    `Are you sure you want to decline ${count} notifications? Unsupported items will be skipped.`
                )
            })
            .then(async ({ ok }) => {
                if (!ok) return;
                isBulkProcessing.value = true;
                try {
                    const { succeeded, failed } = await runThrottledBulkAction({
                        items,
                        actionFn: executeDeclineItem
                    });
                    reportBulkResult(succeeded, failed, 'Declined');
                } finally {
                    isBulkProcessing.value = false;
                }
            })
            .catch(() => {});
    }

    async function handleBulkMarkAsRead() {
        const items = selectedNotifications.value.filter(canMarkAsReadNotification);
        if (items.length === 0) return;
        isBulkProcessing.value = true;
        try {
            const { succeeded, failed } = await runThrottledBulkAction({
                items,
                actionFn: executeMarkAsReadItem
            });
            reportBulkResult(succeeded, failed, 'Marked as read');
        } finally {
            isBulkProcessing.value = false;
        }
    }

    function handleBulkDelete() {
        const items = selectedNotifications.value.filter(canDeleteNotification);
        if (items.length === 0) return;
        const count = items.length;
        modalStore
            .confirm({
                title: t('view.notification.bulk.confirm_delete_title', { count }, `Delete ${count} notifications?`),
                description: t(
                    'view.notification.bulk.confirm_delete_desc',
                    { count },
                    `Are you sure you want to delete ${count} notifications from your history?`
                )
            })
            .then(({ ok }) => {
                if (!ok) return;
                let deleted = 0;
                for (const item of items) {
                    deleteNotificationLog(item);
                    deleted++;
                }
                const next = new Set(selectedNotificationIds.value);
                for (const item of items) {
                    next.delete(item.id);
                }
                selectedNotificationIds.value = next;
                toast.success(
                    t('view.notification.bulk.success_all', { count: deleted }, `Deleted ${deleted} notifications.`)
                );
            })
            .catch(() => {});
    }

    watch(
        () => notificationTable.value.data,
        (data) => {
            if (selectedNotificationIds.value.size === 0) return;
            const validIds = new Set((data || []).map((r) => r.id));
            let hasOrphans = false;
            for (const id of selectedNotificationIds.value) {
                if (!validIds.has(id)) {
                    hasOrphans = true;
                    break;
                }
            }
            if (hasOrphans) {
                const next = new Set();
                for (const id of selectedNotificationIds.value) {
                    if (validIds.has(id)) next.add(id);
                }
                selectedNotificationIds.value = next;
            }
        },
        { deep: false }
    );
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
        display: flex;
        flex-direction: column;
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

    .notification__bulk-surface {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin: 0 0 10px;
        padding: 8px 12px;
        border-radius: var(--radius);
    }

    .notification__bulk-info {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .notification__bulk-count {
        font-weight: 600;
        font-size: 12px;
    }

    .notification__bulk-actions {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
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
        .notification__control-surface,
        .notification__bulk-surface {
            align-items: stretch;
            flex-wrap: wrap;
        }

        .notification__bulk-actions {
            width: 100%;
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
