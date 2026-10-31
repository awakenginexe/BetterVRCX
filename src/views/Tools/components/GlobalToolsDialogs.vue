<template>
    <PurchaseHistoryDialog :visible="purchaseHistory" @close="closeDialog('purchaseHistory')" />
    <GroupUserActionsDialog v-model:open="groupUserActions" />
    <ModerationReportsDialog v-model:open="moderationReports" />
    <InfoPushDialog :is-info-push-dialog-visible="infoPush" @close="closeDialog('infoPush')" />
    <GroupCalendarDialog :visible="groupCalendar" @close="closeDialog('groupCalendar')" />
    <NoteExportDialog :isNoteExportDialogVisible="noteExport" @close="closeDialog('noteExport')" />
    <ExportDiscordNamesDialog v-model:discordNamesDialogVisible="exportDiscordNames" :friends="friends" />
    <ExportFriendsListDialog v-model:isExportFriendsListDialogVisible="exportFriendsList" :friends="friends" />
    <ExportAvatarsListDialog v-model:isExportAvatarsListDialogVisible="exportAvatarsList" />
    <EditInviteMessageDialog
        v-model:isEditInviteMessagesDialogVisible="editInviteMessages"
        @close="closeDialog('editInviteMessages')" />
    <RegistryBackupDialog />
    <AutoChangeStatusDialog
        :isAutoChangeStatusDialogVisible="autoChangeStatus"
        @close="closeDialog('autoChangeStatus')" />
</template>

<script setup>
    import { storeToRefs } from 'pinia';
    import GroupUserActionsDialog from '../../../components/dialogs/GroupDialog/GroupUserActionsDialog.vue';
    import PurchaseHistoryDialog from '../dialogs/PurchaseHistoryDialog.vue';
    import ModerationReportsDialog from '../../../components/dialogs/GroupDialog/ModerationReportsDialog.vue';

    import { useFriendStore, useToolsStore } from '../../../stores';

    import AutoChangeStatusDialog from '../dialogs/AutoChangeStatusDialog.vue';
    import RegistryBackupDialog from '../dialogs/RegistryBackupDialog.vue';
    import InfoPushDialog from '../dialogs/InfoPushDialog.vue';

    import EditInviteMessageDialog from '../dialogs/EditInviteMessagesDialog.vue';
    import ExportAvatarsListDialog from '../dialogs/ExportAvatarsListDialog.vue';
    import ExportDiscordNamesDialog from '../dialogs/ExportDiscordNamesDialog.vue';
    import ExportFriendsListDialog from '../dialogs/ExportFriendsListDialog.vue';
    import GroupCalendarDialog from '../dialogs/GroupCalendarDialog.vue';
    import NoteExportDialog from '../dialogs/NoteExportDialog.vue';

    const { friends } = storeToRefs(useFriendStore());
    const toolsStore = useToolsStore();
    const {
        purchaseHistory,
        autoChangeStatus,
        infoPush,
        groupUserActions,
        moderationReports,
        editInviteMessages,
        exportAvatarsList,
        exportDiscordNames,
        exportFriendsList,
        groupCalendar,
        noteExport
    } = storeToRefs(toolsStore);

    const { closeDialog } = toolsStore;
</script>
