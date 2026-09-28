<template>
    <Dialog
        :open="isSendInviteConfirmDialogVisible"
        @update:open="
            (open) => {
                if (!open) cancelInviteConfirm();
            }
        ">
        <DialogContent class="x-dialog sm:max-w-100">
            <DialogHeader>
                <DialogTitle>{{ t(`dialog.${i18nPrefix}.header`) }}</DialogTitle>
            </DialogHeader>

            <div class="text-xs">
                <span>{{ t(`dialog.${i18nPrefix}.confirmation`) }}</span>
            </div>

            <DialogFooter>
                <Button variant="secondary" @click="cancelInviteConfirm">
                    {{ t(`dialog.${i18nPrefix}.cancel`) }}
                </Button>
                <Button :disabled="inviteBatch.status === 'running'" @click="sendInviteConfirm">
                    {{ t('common.actions.confirm') }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup>
    import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
    import { Button } from '@/components/ui/button';
    import { computed } from 'vue';
    import { storeToRefs } from 'pinia';
    import { toast } from 'vue-sonner';
    import { useI18n } from 'vue-i18n';

    import { notificationRequest } from '../../../api';
    import { useGalleryStore, useInviteStore } from '../../../stores';
    import { recordRecentAction } from '../../../composables/useRecentActions';

    const { t } = useI18n();

    const { uploadImage } = storeToRefs(useGalleryStore());
    const { clearInviteImageUpload } = useGalleryStore();
    const inviteStore = useInviteStore();
    const { inviteBatch } = storeToRefs(inviteStore);

    const props = defineProps({
        isSendInviteConfirmDialogVisible: {
            type: Boolean,
            required: true
        },
        sendInviteDialog: {
            type: Object,
            required: true
        },
        inviteDialog: {
            type: Object,
            required: false,
            default: () => ({})
        }
    });

    const emit = defineEmits(['update:isSendInviteConfirmDialogVisible', 'closeInviteDialog', 'batchStarted']);

    const i18nPrefix = computed(() => {
        const messageType = props.sendInviteDialog?.messageSlot?.messageType;
        return messageType === 'request' ? 'invite_request_message' : 'invite_message';
    });

    function cancelInviteConfirm() {
        emit('update:isSendInviteConfirmDialogVisible', false);
    }

    function sendInviteConfirm() {
        const D = props.sendInviteDialog;
        const J = props.inviteDialog;
        const messageType = D.messageSlot.messageType;
        const slot = D.messageSlot.slot;
        if (J?.visible) {
            inviteStore.startInviteBatch({
                instanceId: J.worldId,
                worldName: J.worldName,
                recipients: J.userIds,
                messageSlot: slot,
                imageData: uploadImage.value
            });
            cancelInviteConfirm();
            emit('batchStarted');
            return;
        } else if (messageType === 'message') {
            // invite message
            D.params.messageSlot = slot;
            if (uploadImage.value) {
                notificationRequest
                    .sendInvitePhoto(D.params, D.userId)
                    .catch((err) => {
                        throw err;
                    })
                    .then((args) => {
                        recordRecentAction(D.userId, 'Invite Photo');
                        toast.success('Invite photo message sent');
                        return args;
                    });
            } else {
                notificationRequest
                    .sendInvite(D.params, D.userId)
                    .catch((err) => {
                        throw err;
                    })
                    .then((args) => {
                        recordRecentAction(D.userId, 'Invite Message');
                        toast.success('Invite message sent');
                        return args;
                    });
            }
        } else if (messageType === 'request') {
            D.params.requestSlot = slot;
            if (uploadImage.value) {
                notificationRequest
                    .sendRequestInvitePhoto(D.params, D.userId)
                    .catch((err) => {
                        clearInviteImageUpload();
                        throw err;
                    })
                    .then((args) => {
                        recordRecentAction(D.userId, 'Request Invite Photo');
                        toast.success('Request invite photo message sent');
                        return args;
                    });
            } else {
                notificationRequest
                    .sendRequestInvite(D.params, D.userId)
                    .catch((err) => {
                        throw err;
                    })
                    .then((args) => {
                        recordRecentAction(D.userId, 'Request Invite Message');
                        toast.success('Request invite message sent');
                        return args;
                    });
            }
        }
        cancelInviteConfirm();
        emit('closeInviteDialog');
    }
</script>
