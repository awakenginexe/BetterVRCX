import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';

import {
    instanceRequest,
    inviteMessagesRequest,
    notificationRequest
} from '../api';
import { toast } from 'vue-sonner';
import { i18n } from '../plugins/i18n';
import { parseLocation } from '../shared/utils';
import { recordRecentAction } from '../composables/useRecentActions';
import { createInviteBatchManager } from '../services/inviteBatch';
import { useUserStore } from './user';
import { useFriendStore } from './friend';
import { useAdvancedSettingsStore } from './settings/advanced';
import { useGameStore } from './game';
import { watchState } from '../services/watchState';

export const useInviteStore = defineStore('Invite', () => {
    const gameStore = useGameStore();
    const advancedSettingsStore = useAdvancedSettingsStore();
    const userStore = useUserStore();
    const friendStore = useFriendStore();
    const batchManager = createInviteBatchManager({
        getAccountId: () => userStore.currentUser.id,
        isLoggedIn: () => watchState.isLoggedIn,
        send: async (item) => {
            if (item.id === item.accountId) {
                const location = parseLocation(item.instanceId);
                return instanceRequest.selfInvite({
                    instanceId: location.instanceId,
                    worldId: location.worldId
                });
            }
            const params = {
                instanceId: item.instanceId,
                worldId: item.instanceId,
                worldName: item.worldName,
                ...(item.messageSlot ? { messageSlot: item.messageSlot } : {})
            };
            return item.imageData
                ? notificationRequest.sendInvitePhoto(
                      params,
                      item.id,
                      item.imageData
                  )
                : notificationRequest.sendInvite(params, item.id);
        },
        onSuccess: (entry, item) => {
            recordRecentAction(
                entry.id,
                item.imageData
                    ? 'Invite Photo'
                    : item.messageSlot
                      ? 'Invite Message'
                      : 'Invite'
            );
        },
        onFinished: (status) => {
            if (userStore.currentUser.id !== batchManager.state.accountId)
                return;
            const message = i18n.global.t(`dialog.invite.batch_${status}`);
            if (status === 'success') toast.success(message);
            else if (status === 'partial' || status === 'cancelled')
                toast.warning(message);
            else toast.error(message);
        }
    });
    const inviteBatch = batchManager.state;
    const inviteBatchSummary = computed(() => batchManager.summary());

    watch(
        [() => watchState.isLoggedIn, () => userStore.currentUser.id],
        ([loggedIn, accountId]) => {
            if (
                !loggedIn ||
                (inviteBatch.status === 'running' &&
                    accountId !== inviteBatch.accountId)
            ) {
                batchManager.cancel();
            }
        },
        { flush: 'sync' }
    );

    function startInviteBatch(options) {
        const recipients = (options.recipients || []).map((person) => {
            const id = String(person?.id || person || '');
            return {
                id,
                name:
                    person?.name ||
                    (id === userStore.currentUser.id
                        ? userStore.currentUser.displayName
                        : friendStore.friends.get(id)?.ref?.displayName) ||
                    id
            };
        });
        return batchManager.start({
            ...options,
            recipients,
            accountId: userStore.currentUser.id
        });
    }

    function cancelInviteBatch() {
        batchManager.cancel();
    }

    function retryFailedInviteBatch() {
        return batchManager.retryFailed();
    }

    const inviteMessageTable = ref({
        data: [],
        layout: 'table',
        visible: false
    });

    const inviteResponseMessageTable = ref({
        data: [],
        layout: 'table',
        visible: false
    });

    const inviteRequestMessageTable = ref({
        data: [],
        layout: 'table',
        visible: false
    });

    const inviteRequestResponseMessageTable = ref({
        data: [],
        layout: 'table',
        visible: false
    });

    watch(
        () => watchState.isLoggedIn,
        () => {
            inviteMessageTable.value.data = [];
            inviteResponseMessageTable.value.data = [];
            inviteRequestMessageTable.value.data = [];
            inviteRequestResponseMessageTable.value.data = [];
            inviteMessageTable.value.visible = false;
            inviteResponseMessageTable.value.visible = false;
            inviteRequestMessageTable.value.visible = false;
            inviteRequestResponseMessageTable.value.visible = false;
        },
        { flush: 'sync' }
    );

    const canOpenInstanceInGame = computed(() => {
        return (
            gameStore.isGameRunning && !advancedSettingsStore.selfInviteOverride
        );
    });

    /**
     *
     * @param {'message' | 'request' | 'response' | 'requestResponse'} mode
     */
    function refreshInviteMessageTableData(mode) {
        inviteMessagesRequest
            .refreshInviteMessageTableData(mode)
            .then(({ json }) => {
                switch (mode) {
                    case 'message':
                        inviteMessageTable.value.data = json;
                        break;
                    case 'response':
                        inviteResponseMessageTable.value.data = json;
                        break;
                    case 'request':
                        inviteRequestMessageTable.value.data = json;
                        break;
                    case 'requestResponse':
                        inviteRequestResponseMessageTable.value.data = json;
                        break;
                }
            })
            .catch((err) => {
                console.error('refreshInviteMessageTableData Failed：', err);
            });
    }

    return {
        inviteMessageTable,
        inviteResponseMessageTable,
        inviteRequestMessageTable,
        inviteRequestResponseMessageTable,
        inviteBatch,
        inviteBatchSummary,
        startInviteBatch,
        cancelInviteBatch,
        retryFailedInviteBatch,
        refreshInviteMessageTableData,
        canOpenInstanceInGame
    };
});
