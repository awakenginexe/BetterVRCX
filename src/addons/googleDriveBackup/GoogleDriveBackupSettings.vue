<template>
    <div class="space-y-4" data-google-drive-backup>
        <SettingsGroup :title="t('view.settings.google_drive_backup.header')" tone="platform">
            <template #description>
                {{ t('view.settings.google_drive_backup.description') }}
            </template>

            <SettingsItem
                :label="t('view.settings.google_drive_backup.connection')"
                :description="connectionDescription"
                intent="platform">
                <Button v-if="!connected" size="sm" :disabled="busy" @click="connect">
                    {{ t('view.settings.google_drive_backup.connect') }}
                </Button>
                <Button v-else size="sm" variant="outline" :disabled="busy" @click="disconnect">
                    {{ t('view.settings.google_drive_backup.disconnect') }}
                </Button>
            </SettingsItem>

            <SettingsItem
                v-if="connected"
                :label="t('view.settings.google_drive_backup.backup_now')"
                :description="t('view.settings.google_drive_backup.backup_now_description')">
                <Button size="sm" :disabled="busy" @click="backupNow">
                    {{ t('view.settings.google_drive_backup.backup_now') }}
                </Button>
            </SettingsItem>

            <SettingsItem
                v-if="connected"
                :label="t('view.settings.google_drive_backup.last_backup')"
                :description="lastBackupDescription">
                <Button size="sm" variant="outline" :disabled="busy" @click="loadBackups">
                    {{ t('view.settings.google_drive_backup.view_backups') }}
                </Button>
            </SettingsItem>

            <p v-if="displayError" class="px-2 pb-3 text-xs text-destructive" role="alert">
                {{ displayError }}
            </p>

            <div v-if="requiresRestart" class="mx-2 mb-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
                <p class="font-medium text-foreground">{{ t('view.settings.google_drive_backup.restart_required') }}</p>
                <Button class="mt-2" size="sm" @click="restartApp">
                    {{ t('view.settings.google_drive_backup.restart') }}
                </Button>
            </div>
        </SettingsGroup>

        <SettingsGroup v-if="connected" :title="t('view.settings.google_drive_backup.available_backups')">
            <div v-if="!backups.length" class="px-2 py-4 text-xs text-muted-foreground">
                {{ t('view.settings.google_drive_backup.no_backups') }}
            </div>
            <div
                v-for="backup in backups"
                :key="backup.id"
                class="flex flex-wrap items-center justify-between gap-3 px-2 py-3">
                <div class="min-w-0">
                    <p class="truncate text-xs font-medium text-foreground">{{ backup.deviceName || backup.name }}</p>
                    <p class="text-[11px] text-muted-foreground">
                        {{ formatDate(backup.createdAt) }} · {{ formatSize(backup.size) }}
                    </p>
                </div>
                <Button size="sm" variant="outline" :disabled="busy" @click="openRestore(backup)">
                    {{ t('view.settings.google_drive_backup.restore') }}
                </Button>
            </div>
        </SettingsGroup>

        <Dialog v-model:open="restoreDialogOpen">
            <DialogContent class="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{{ t('view.settings.google_drive_backup.restore_title') }}</DialogTitle>
                    <DialogDescription>{{
                        t('view.settings.google_drive_backup.restore_description')
                    }}</DialogDescription>
                </DialogHeader>
                <div class="space-y-3">
                    <label
                        class="flex cursor-pointer gap-3 rounded-md border p-3"
                        :class="restoreMode === 'merge' ? 'border-primary bg-primary/10' : 'border-border'">
                        <input v-model="restoreMode" type="radio" value="merge" class="mt-0.5" />
                        <span>
                            <span class="block text-xs font-medium text-foreground">{{
                                t('view.settings.google_drive_backup.merge')
                            }}</span>
                            <span class="mt-1 block text-[11px] text-muted-foreground">{{
                                t('view.settings.google_drive_backup.merge_description')
                            }}</span>
                        </span>
                    </label>
                    <label
                        class="flex cursor-pointer gap-3 rounded-md border p-3"
                        :class="restoreMode === 'replace' ? 'border-destructive bg-destructive/10' : 'border-border'">
                        <input v-model="restoreMode" type="radio" value="replace" class="mt-0.5" />
                        <span>
                            <span class="block text-xs font-medium text-foreground">{{
                                t('view.settings.google_drive_backup.replace')
                            }}</span>
                            <span class="mt-1 block text-[11px] text-muted-foreground">{{
                                t('view.settings.google_drive_backup.replace_description')
                            }}</span>
                        </span>
                    </label>
                </div>
                <DialogFooter>
                    <Button variant="outline" :disabled="busy" @click="restoreDialogOpen = false">
                        {{ t('dialog.alertdialog.cancel') }}
                    </Button>
                    <Button :disabled="busy" @click="restore">
                        {{ t('view.settings.google_drive_backup.restore') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>

<script setup>
    import { computed, onMounted, ref } from 'vue';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import { Button } from '@/components/ui/button';
    import {
        Dialog,
        DialogContent,
        DialogDescription,
        DialogFooter,
        DialogHeader,
        DialogTitle
    } from '@/components/ui/dialog';
    import SettingsGroup from '@/views/Settings/components/SettingsGroup.vue';
    import SettingsItem from '@/views/Settings/components/SettingsItem.vue';
    import { useGoogleDriveBackupStore, useModalStore } from '@/stores';

    const { t } = useI18n();
    const backupStore = useGoogleDriveBackupStore();
    const modalStore = useModalStore();
    const { status, backups, connected, busy } = storeToRefs(backupStore);

    const restoreDialogOpen = ref(false);
    const restoreMode = ref('merge');
    const selectedBackup = ref(null);
    const localError = ref('');
    const requiresRestart = ref(false);

    const connectionDescription = computed(() => {
        if (status.value.email) return `${stateLabel.value} · ${status.value.email}`;
        return stateLabel.value;
    });
    const stateLabel = computed(() => t(`view.settings.google_drive_backup.states.${status.value.state || 'error'}`));
    const lastBackupDescription = computed(() =>
        status.value.lastBackupAt
            ? `${formatDate(status.value.lastBackupAt)} · ${formatSize(status.value.lastBackupSize)}`
            : t('view.settings.google_drive_backup.never')
    );
    const displayError = computed(() => localError.value || status.value.error);

    onMounted(() => backupStore.init());

    async function connect() {
        localError.value = '';
        try {
            await backupStore.connect();
        } catch (error) {
            localError.value = error?.message || t('view.settings.google_drive_backup.generic_error');
        }
    }

    async function disconnect() {
        localError.value = '';
        try {
            await backupStore.disconnect();
        } catch (error) {
            localError.value = error?.message || t('view.settings.google_drive_backup.generic_error');
        }
    }

    async function backupNow() {
        localError.value = '';
        try {
            await backupStore.backupNow();
        } catch (error) {
            localError.value = error?.message || t('view.settings.google_drive_backup.generic_error');
        }
    }

    async function loadBackups() {
        localError.value = '';
        try {
            await backupStore.loadBackups();
        } catch (error) {
            localError.value = error?.message || t('view.settings.google_drive_backup.generic_error');
        }
    }

    function openRestore(backup) {
        selectedBackup.value = backup;
        restoreMode.value = 'merge';
        restoreDialogOpen.value = true;
    }

    async function restore() {
        if (!selectedBackup.value) return;
        if (restoreMode.value === 'replace') {
            const { ok } = await modalStore.confirm({
                title: t('view.settings.google_drive_backup.replace_confirm_title'),
                description: t('view.settings.google_drive_backup.replace_confirm_description'),
                confirmText: t('view.settings.google_drive_backup.replace'),
                cancelText: t('dialog.alertdialog.cancel'),
                destructive: true,
                dismissible: false
            });
            if (!ok) return;
        }

        localError.value = '';
        try {
            const result = await backupStore.restoreBackup(selectedBackup.value.id, restoreMode.value);
            if (result?.success) {
                requiresRestart.value = result.restartRequired === true;
                restoreDialogOpen.value = false;
            }
        } catch (error) {
            localError.value = error?.message || t('view.settings.google_drive_backup.generic_error');
        }
    }

    function restartApp() {
        AppApi.RestartApplication(false);
    }

    function formatDate(value) {
        if (!value) return t('view.settings.google_drive_backup.unknown_date');
        const date = new Date(value);
        return Number.isNaN(date.getTime())
            ? t('view.settings.google_drive_backup.unknown_date')
            : date.toLocaleString();
    }

    function formatSize(value) {
        const size = Number(value) || 0;
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
</script>
