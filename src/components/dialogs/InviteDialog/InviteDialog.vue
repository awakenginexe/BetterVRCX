<template>
    <Dialog
        :open="inviteDialog.visible"
        @update:open="
            (open) => {
                if (!open) closeInviteDialog();
            }
        ">
        <DialogContent class="x-dialog sm:max-w-125">
            <DialogHeader>
                <DialogTitle>{{ t('dialog.invite.header') }}</DialogTitle>
            </DialogHeader>

            <div v-if="inviteDialog.visible" class="overflow-hidden">
                <Location :location="inviteDialog.worldId" :link="false" class="cursor-default" />
                <br />
                <Button size="sm" class="mr-2 mt-2" variant="outline" @click="addSelfToInvite">{{
                    t('dialog.invite.add_self')
                }}</Button>
                <Button
                    size="sm"
                    class="mr-2 mt-2"
                    variant="outline"
                    :disabled="inviteDialog.friendsInInstance.length === 0"
                    @click="addFriendsInInstanceToInvite"
                    >{{ t('dialog.invite.add_friends_in_instance') }}</Button
                >
                <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                        <Button
                            class="mt-2"
                            size="sm"
                            variant="outline"
                            :disabled="
                                remoteFriendFavoriteGroupItems.length === 0 &&
                                localFriendFavoriteGroupItems.length === 0
                            "
                            >{{ t('dialog.invite.add_favorite_friends') }}</Button
                        >
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" class="w-48">
                        <DropdownMenuItem
                            v-for="group in remoteFriendFavoriteGroupItems"
                            :key="group.key"
                            @select.prevent
                            @click="addGroupOnlineFriendsToInvite(group)">
                            {{ group.displayName }}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator
                            v-if="remoteFriendFavoriteGroupItems.length && localFriendFavoriteGroupItems.length" />
                        <DropdownMenuItem
                            v-for="group in localFriendFavoriteGroupItems"
                            :key="group.key"
                            @select.prevent
                            @click="addGroupOnlineFriendsToInvite(group)">
                            {{ group.displayName }}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <div class="mt-4" style="width: 100%">
                    <VirtualCombobox
                        :model-value="Array.isArray(inviteDialog.userIds) ? inviteDialog.userIds : []"
                        @update:modelValue="setInviteUserIds"
                        :groups="userPickerGroups"
                        multiple
                        :disabled="batchBusy"
                        :placeholder="t('dialog.invite.select_placeholder')"
                        :search-placeholder="t('dialog.invite.select_placeholder')"
                        :clearable="true">
                        <template #item="{ item, selected }">
                            <div class="flex w-full items-center p-1.5 text-[13px]">
                                <template v-if="item.user">
                                    <div
                                        class="relative inline-block flex-none size-9 mr-2.5"
                                        :class="userStatusClass(item.user)">
                                        <img
                                            class="size-full rounded-full object-cover"
                                            :src="userImage(item.user)"
                                            loading="lazy" />
                                    </div>
                                    <div class="flex-1 overflow-hidden">
                                        <span
                                            class="block truncate font-medium leading-[18px]"
                                            :style="{ color: item.user.$userColour }"
                                            >{{ item.user.displayName }}</span
                                        >
                                    </div>
                                </template>
                                <template v-else>
                                    <span>{{ item.label }}</span>
                                </template>

                                <CheckIcon :class="['ml-auto size-4', selected ? 'opacity-100' : 'opacity-0']" />
                            </div>
                        </template>
                    </VirtualCombobox>
                </div>

                <div v-if="batchForDialog" class="mt-4 rounded-md border p-3 text-sm" role="status" aria-live="polite">
                    <div>
                        {{
                            t('dialog.invite.batch_target', { target: inviteBatch.worldName || inviteBatch.instanceId })
                        }}
                    </div>
                    <div>
                        {{
                            t('dialog.invite.batch_progress', {
                                completed: inviteBatchSummary.completed,
                                total: inviteBatchSummary.total
                            })
                        }}
                    </div>
                    <div class="mt-1 flex flex-wrap gap-3 text-xs">
                        <span>{{ t('dialog.invite.batch_succeeded', { count: inviteBatchSummary.succeeded }) }}</span>
                        <span>{{ t('dialog.invite.batch_failed', { count: inviteBatchSummary.failed }) }}</span>
                        <span>{{
                            t('dialog.invite.batch_cancelled_count', { count: inviteBatchSummary.cancelled })
                        }}</span>
                        <span>{{ t('dialog.invite.batch_unknown', { count: inviteBatchSummary.unknown }) }}</span>
                    </div>
                    <ul class="mt-2 max-h-36 overflow-y-auto text-xs">
                        <li v-for="entry in inviteBatch.entries" :key="entry.id" class="py-0.5">
                            {{ entry.name }} —
                            {{
                                entry.reason
                                    ? t(`dialog.invite.batch_reason_${entry.reason}`)
                                    : t(`dialog.invite.batch_status_${entry.status}`)
                            }}
                        </li>
                    </ul>
                    <div class="mt-2 flex gap-2">
                        <Button v-if="batchBusy" size="sm" variant="outline" @click="cancelInviteBatch">
                            {{ t('dialog.invite.batch_cancel_action') }}
                        </Button>
                        <Button
                            v-else-if="hasRetryableFailures"
                            size="sm"
                            variant="outline"
                            :disabled="retryNow < inviteBatch.retryAfterAt"
                            @click="retryFailedInviteBatch">
                            {{ t('dialog.invite.batch_retry_action') }}
                        </Button>
                    </div>
                    <div v-if="hasRetryableFailures && retryNow < inviteBatch.retryAfterAt" class="mt-1 text-xs">
                        {{ t('dialog.invite.batch_retry_after') }}
                    </div>
                </div>
            </div>

            <DialogFooter>
                <Button
                    variant="secondary"
                    class="mr-2"
                    :disabled="batchBusy || confirmationPending || !inviteDialog.userIds.length"
                    @click="showSendInviteDialog"
                    >{{ t('dialog.invite.invite_with_message') }}</Button
                >
                <Button
                    :disabled="batchBusy || confirmationPending || !inviteDialog.userIds.length"
                    @click="sendInvite"
                    >{{ t('dialog.invite.invite') }}</Button
                >
            </DialogFooter>
        </DialogContent>

        <SendInviteDialog
            v-model:sendInviteDialogVisible="sendInviteDialogVisible"
            v-model:sendInviteDialog="sendInviteDialog"
            :invite-dialog="inviteDialog"
            @closeInviteDialog="closeInviteDialog" />
    </Dialog>
</template>

<script setup>
    import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
    import { computed, onUnmounted, ref, watch } from 'vue';
    import { Button } from '@/components/ui/button';
    import { Check as CheckIcon } from 'lucide-vue-next';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import {
        useFavoriteStore,
        useFriendStore,
        useGalleryStore,
        useInviteStore,
        useModalStore,
        useUserStore
    } from '../../../stores';
    import { useUserDisplay } from '../../../composables/useUserDisplay';
    import { VirtualCombobox } from '../../ui/virtual-combobox';
    import {
        DropdownMenu,
        DropdownMenuContent,
        DropdownMenuItem,
        DropdownMenuSeparator,
        DropdownMenuTrigger
    } from '../../ui/dropdown-menu';

    import SendInviteDialog from './SendInviteDialog.vue';

    const { userImage, userStatusClass } = useUserDisplay();
    const friendStore = useFriendStore();
    const { vipFriends, onlineFriends, activeFriends, friends } = storeToRefs(friendStore);
    const favoriteStore = useFavoriteStore();
    const { favoriteFriendGroups, localFriendFavoriteGroups, localFriendFavorites, groupedByGroupKeyFavoriteFriends } =
        storeToRefs(favoriteStore);
    const inviteStore = useInviteStore();
    const { refreshInviteMessageTableData, startInviteBatch, cancelInviteBatch, retryFailedInviteBatch } = inviteStore;
    const { inviteBatch, inviteBatchSummary } = storeToRefs(inviteStore);
    const { currentUser } = storeToRefs(useUserStore());
    const { clearInviteImageUpload } = useGalleryStore();

    const modalStore = useModalStore();

    const { t } = useI18n();
    const props = defineProps({
        inviteDialog: {
            type: Object,
            required: true
        }
    });

    const emit = defineEmits(['closeInviteDialog']);

    const sendInviteDialogVisible = ref(false);
    const confirmationPending = ref(false);
    const retryNow = ref(Date.now());
    const batchBusy = computed(() => inviteBatch.value.status === 'running');
    const batchForDialog = computed(
        () => inviteBatch.value.status !== 'idle' && inviteBatch.value.accountId === currentUser.value?.id
    );
    const hasRetryableFailures = computed(
        () =>
            batchForDialog.value &&
            inviteBatch.value.entries.some((entry) => entry.status === 'failed' && entry.retryable)
    );
    let retryTimer;
    watch(
        () => [props.inviteDialog.visible, inviteBatch.value.retryAfterAt],
        ([visible, retryAfterAt]) => {
            clearTimeout(retryTimer);
            retryNow.value = Date.now();
            if (visible && retryAfterAt > retryNow.value) {
                retryTimer = setTimeout(() => {
                    retryNow.value = Date.now();
                }, retryAfterAt - retryNow.value);
            }
        }
    );
    onUnmounted(() => clearTimeout(retryTimer));
    const sendInviteDialog = ref({
        messageSlot: {},
        userId: '',
        params: {}
    });

    const friendSections = computed(() => [
        {
            key: 'friendsInInstance',
            label: t('dialog.invite.friends_in_instance'),
            friends: props.inviteDialog?.friendsInInstance ?? []
        },
        {
            key: 'vip',
            label: t('side_panel.favorite'),
            friends: vipFriends.value
        },
        {
            key: 'online',
            label: t('side_panel.online'),
            friends: onlineFriends.value
        },
        {
            key: 'active',
            label: t('side_panel.active'),
            friends: activeFriends.value
        }
    ]);

    const userPickerGroups = computed(() => {
        const groups = [];

        if (currentUser.value) {
            groups.push({
                key: 'me',
                label: t('side_panel.me'),
                items: [
                    {
                        value: String(currentUser.value.id),
                        label: currentUser.value.displayName,
                        search: currentUser.value.displayName,
                        user: currentUser.value
                    }
                ]
            });
        }

        const addFriendGroup = ({ key, label, friends }) => {
            if (!friends?.length) return;
            groups.push({
                key,
                label,
                items: friends.map((friend) => {
                    const user = friend?.ref ?? null;
                    const displayName = resolveUserDisplayName(friend.id);
                    return {
                        value: String(friend.id),
                        label: displayName,
                        search: displayName,
                        user
                    };
                })
            });
        };

        friendSections.value.forEach(addFriendGroup);

        return groups;
    });

    /**
     *
     * @param value
     */
    function setInviteUserIds(value) {
        const next = Array.isArray(value) ? value.map((v) => String(v ?? '')).filter(Boolean) : [];
        const ids = Array.isArray(props.inviteDialog.userIds) ? props.inviteDialog.userIds : [];
        ids.splice(0, ids.length, ...next);
    }

    const friendById = computed(() => {
        const map = new Map();
        for (const section of friendSections.value) {
            for (const friend of section.friends ?? []) {
                map.set(friend.id, friend);
            }
        }
        return map;
    });

    /**
     *
     * @param userId
     */
    function resolveUserDisplayName(userId) {
        if (currentUser.value?.id && currentUser.value.id === userId) {
            return currentUser.value.displayName;
        }
        const friend = friendById.value.get(userId);
        return friend?.ref?.displayName ?? friend?.name ?? String(userId);
    }

    /**
     *
     */
    function closeInviteDialog() {
        emit('closeInviteDialog');
    }

    /**
     *
     * @param params
     * @param userId
     */
    function showSendInviteDialog(params, userId) {
        sendInviteDialog.value = {
            params,
            userId,
            messageSlot: {}
        };
        refreshInviteMessageTableData('message');
        clearInviteImageUpload();
        sendInviteDialogVisible.value = true;
    }

    /**
     *
     */
    function addSelfToInvite() {
        const D = props.inviteDialog;
        if (!D.userIds.includes(currentUser.value.id)) {
            D.userIds.push(currentUser.value.id);
        }
    }

    /**
     *
     */
    function addFriendsInInstanceToInvite() {
        const D = props.inviteDialog;
        for (const friend of D.friendsInInstance) {
            if (!D.userIds.includes(friend.id)) {
                D.userIds.push(friend.id);
            }
        }
    }

    /**
     * @param {string[]} userIds
     * @returns {boolean}
     */
    function hasOnlineFriend(userIds) {
        for (const id of userIds) {
            const ctx = friends.value.get(id);
            if (ctx && ctx.state === 'online') return true;
        }
        return false;
    }

    const remoteFriendFavoriteGroupItems = computed(() =>
        favoriteFriendGroups.value
            .filter((group) => {
                const favorites = groupedByGroupKeyFavoriteFriends.value[group.key];
                return favorites?.length && hasOnlineFriend(favorites.map((f) => f.id));
            })
            .map((group) => ({
                key: group.key,
                displayName: group.displayName,
                type: 'remote'
            }))
    );

    const localFriendFavoriteGroupItems = computed(() =>
        localFriendFavoriteGroups.value
            .filter((groupName) => {
                const userIds = localFriendFavorites.value[groupName];
                return userIds?.length && hasOnlineFriend(userIds);
            })
            .map((groupName) => ({
                key: `local:${groupName}`,
                displayName: groupName,
                type: 'local',
                localName: groupName
            }))
    );

    /**
     * @param {object} group
     */
    function addGroupOnlineFriendsToInvite(group) {
        const D = props.inviteDialog;
        let userIds;

        if (group.type === 'remote') {
            const favorites = groupedByGroupKeyFavoriteFriends.value[group.key] || [];
            userIds = favorites.map((fav) => fav.id);
        } else {
            userIds = localFriendFavorites.value[group.localName] || [];
        }

        for (const userId of userIds) {
            const ctx = friends.value.get(userId);
            if (ctx && ctx.state === 'online' && !D.userIds.includes(userId)) {
                D.userIds.push(userId);
            }
        }
    }

    /**
     *
     */
    async function sendInvite() {
        if (batchBusy.value || confirmationPending.value) return;
        confirmationPending.value = true;
        try {
            const { ok } = await modalStore.confirm({
                description: t('confirm.invite'),
                title: 'Confirm'
            });
            if (!ok || batchBusy.value) return;
            const D = props.inviteDialog;
            startInviteBatch({
                instanceId: D.worldId,
                worldName: D.worldName,
                recipients: D.userIds.map((id) => ({ id, name: resolveUserDisplayName(id) }))
            });
        } finally {
            confirmationPending.value = false;
        }
    }
</script>

}) .catch(() => {});
