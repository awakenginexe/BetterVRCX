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
                <div class="flex shrink-0 items-center gap-2">
                    <Button size="sm" variant="outline" :disabled="busy" @click="openRestore(backup)">
                        {{ t('view.settings.google_drive_backup.restore') }}
                    </Button>
                    <Button
                        size="icon-sm"
                        variant="outline"
                        class="text-destructive hover:text-destructive"
                        :aria-label="t('view.settings.google_drive_backup.delete')"
                        :disabled="busy"
                        @click="openDelete(backup)">
                        <Trash2 class="h-4 w-4" />
                    </Button>
                </div>
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
                <div
                    v-if="restoreInProgress"
                    class="flex gap-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs"
                    data-backup-restore-progress
                    role="status"
                    aria-live="polite">
                    <Spinner class="mt-0.5 shrink-0 text-primary" />
                    <div class="min-w-0 space-y-1">
                        <p class="font-medium text-foreground">
                            {{ t('view.settings.google_drive_backup.restore_in_progress') }}
                        </p>
                        <p class="text-muted-foreground">{{ restoreProgressDescription }}</p>
                        <p class="text-muted-foreground">{{ restoreElapsedDescription }}</p>
                    </div>
                </div>
                <div v-else class="space-y-3">
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
                    <p
                        v-if="restoreMode === 'replace'"
                        class="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
                        {{ t('view.settings.google_drive_backup.replace_sign_in_warning') }}
                    </p>
                </div>
                <DialogFooter v-if="!restoreInProgress">
                    <Button variant="outline" :disabled="busy" @click="restoreDialogOpen = false">
                        {{ t('dialog.alertdialog.cancel') }}
                    </Button>
                    <Button :disabled="busy" @click="restore">
                        {{ t('view.settings.google_drive_backup.restore') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog v-model:open="deleteDialogOpen">
            <DialogContent class="sm:max-w-md" data-backup-delete-dialog>
                <DialogHeader>
                    <DialogTitle>{{ t('view.settings.google_drive_backup.delete_title') }}</DialogTitle>
                    <DialogDescription>{{
                        t('view.settings.google_drive_backup.delete_description')
                    }}</DialogDescription>
                </DialogHeader>
                <div
                    v-if="backupPendingDeletion"
                    class="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs">
                    <p class="font-medium text-foreground">
                        {{ backupPendingDeletion.name || backupPendingDeletion.deviceName }}
                    </p>
                    <p class="mt-1 text-muted-foreground">
                        {{ backupPendingDeletion.deviceName || backupPendingDeletion.name }} ·
                        {{ formatDate(backupPendingDeletion.createdAt) }} · {{ formatSize(backupPendingDeletion.size) }}
                    </p>
                </div>
                <p v-if="displayError" class="text-xs text-destructive" role="alert">{{ displayError }}</p>
                <div class="space-y-2">
                    <p class="text-xs font-medium text-destructive">
                        {{ t('view.settings.google_drive_backup.delete_slide_label') }}
                    </p>
                    <Slider
                        v-model="deleteSlideValue"
                        :min="0"
                        :max="100"
                        :step="1"
                        :disabled="busy"
                        :thumb-icon="ArrowRight"
                        class="min-h-14 py-2 [&_[data-slot=slider-track]]:h-10 [&_[data-slot=slider-range]]:bg-destructive [&_[data-slot=slider-range]]:transition-[width,height] [&_[data-slot=slider-range]]:duration-150 [&_[data-slot=slider-range]]:ease-out [&_[data-slot=slider-range]]:motion-reduce:transition-none [&_[data-slot=slider-thumb]]:size-8 [&_[data-slot=slider-thumb]]:border-destructive [&_[data-slot=slider-thumb]]:transition-[transform,box-shadow,color] [&_[data-slot=slider-thumb]]:duration-150 [&_[data-slot=slider-thumb]]:ease-out [&_[data-slot=slider-thumb]]:motion-reduce:transition-none [&_[data-slot=slider-thumb]_svg]:text-destructive"
                        data-backup-delete-slider
                        @pointerup="resetDeleteSlider"
                        @pointercancel="resetDeleteSlider"
                        @value-commit="confirmDelete" />
                    <p class="text-[11px] text-muted-foreground">
                        {{ t('view.settings.google_drive_backup.delete_recoverable') }}
                    </p>
                </div>
                <DialogFooter>
                    <Button variant="outline" :disabled="busy" @click="deleteDialogOpen = false">
                        {{ t('dialog.alertdialog.cancel') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>

<script setup>
    import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';
    import { ArrowRight, Trash2 } from 'lucide-vue-next';

    import { Button } from '@/components/ui/button';
    import { Slider } from '@/components/ui/slider';
    import { Spinner } from '@/components/ui/spinner';
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
    const deleteDialogOpen = ref(false);
    const restoreMode = ref('merge');
    const selectedBackup = ref(null);
    const backupPendingDeletion = ref(null);
    const deleteSlideValue = ref([0]);
    const localError = ref('');
    const requiresRestart = ref(false);
    const restoreElapsedSeconds = ref(0);
    let restoreElapsedTimer = null;

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
    const restoreInProgress = computed(() => ['downloading', 'merging', 'restoring'].includes(status.value.state));
    const restoreProgressDescription = computed(() =>
        t('view.settings.google_drive_backup.restore_progress_description', { state: stateLabel.value })
    );
    const restoreElapsedDescription = computed(() =>
        t('view.settings.google_drive_backup.restore_progress_elapsed', {
            duration: formatElapsed(restoreElapsedSeconds.value)
        })
    );

    onMounted(() => backupStore.init());
    onUnmounted(stopRestoreElapsedTimer);

    watch(restoreInProgress, (isInProgress) => {
        if (isInProgress) {
            restoreElapsedSeconds.value = 0;
            startRestoreElapsedTimer();
            return;
        }
        stopRestoreElapsedTimer();
    });

    watch(deleteDialogOpen, (isOpen) => {
        if (!isOpen) {
            backupPendingDeletion.value = null;
            deleteSlideValue.value = [0];
        }
    });

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

    function openDelete(backup) {
        localError.value = '';
        backupPendingDeletion.value = backup;
        deleteSlideValue.value = [0];
        deleteDialogOpen.value = true;
    }

    function resetDeleteSlider() {
        if (!busy.value) deleteSlideValue.value = [0];
    }

    async function confirmDelete(value) {
        if (!backupPendingDeletion.value || busy.value || value?.[0] !== 100) return;

        localError.value = '';
        try {
            const result = await backupStore.deleteBackup(backupPendingDeletion.value.id);
            if (result?.success) deleteDialogOpen.value = false;
        } catch (error) {
            localError.value = error?.message || t('view.settings.google_drive_backup.generic_error');
        } finally {
            deleteSlideValue.value = [0];
        }
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

    function startRestoreElapsedTimer() {
        if (restoreElapsedTimer) return;
        restoreElapsedTimer = setInterval(() => {
            restoreElapsedSeconds.value += 1;
        }, 1000);
    }

    function stopRestoreElapsedTimer() {
        if (!restoreElapsedTimer) return;
        clearInterval(restoreElapsedTimer);
        restoreElapsedTimer = null;
    }

    function formatElapsed(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return minutes > 0
            ? `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
            : `0:${String(remainingSeconds).padStart(2, '0')}`;
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
