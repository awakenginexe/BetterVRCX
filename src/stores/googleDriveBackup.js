import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import cloudBackup from '../services/database/cloudBackup.js';

const DEFAULT_STATUS = {
    state: 'not_connected',
    connected: false,
    email: null,
    lastBackupAt: null,
    lastBackupName: null,
    lastBackupSize: 0,
    error: null
};

export const useGoogleDriveBackupStore = defineStore(
    'GoogleDriveBackup',
    () => {
        const status = ref({ ...DEFAULT_STATUS });
        const backups = ref([]);
        const loading = ref(false);
        const initialized = ref(false);

        const connected = computed(() => status.value.connected === true);
        const busy = computed(
            () =>
                loading.value ||
                [
                    'connecting',
                    'backing_up',
                    'downloading',
                    'merging',
                    'restoring'
                ].includes(status.value.state)
        );

        function applyStatus(nextStatus) {
            if (!nextStatus || typeof nextStatus !== 'object') return;
            status.value = { ...status.value, ...nextStatus };
        }

        async function init() {
            if (initialized.value) return;
            initialized.value = true;
            loading.value = true;
            try {
                applyStatus(await cloudBackup.getStatus());
                if (connected.value) {
                    backups.value = await cloudBackup.listBackups();
                }
            } catch (error) {
                status.value = {
                    ...status.value,
                    state: 'error',
                    error:
                        error?.message ||
                        'Unable to load Google Drive backup status.'
                };
            } finally {
                loading.value = false;
            }
        }

        async function connect() {
            if (busy.value) return null;
            loading.value = true;
            try {
                const result = await cloudBackup.connect();
                applyStatus(result);
                if (result?.connected)
                    backups.value = await cloudBackup.listBackups();
                return result;
            } finally {
                loading.value = false;
            }
        }

        async function disconnect() {
            if (busy.value) return null;
            loading.value = true;
            try {
                const result = await cloudBackup.disconnect();
                applyStatus(result);
                backups.value = [];
                return result;
            } finally {
                loading.value = false;
            }
        }

        async function backupNow() {
            if (busy.value || !connected.value) return null;
            loading.value = true;
            try {
                const result = await cloudBackup.backupNow();
                applyStatus(result);
                if (result?.success !== false) {
                    backups.value = await cloudBackup.listBackups();
                }
                return result;
            } finally {
                loading.value = false;
            }
        }

        async function loadBackups() {
            if (
                !connected.value ||
                [
                    'connecting',
                    'backing_up',
                    'downloading',
                    'merging',
                    'restoring'
                ].includes(status.value.state)
            )
                return [];
            loading.value = true;
            try {
                backups.value = await cloudBackup.listBackups();
                return backups.value;
            } finally {
                loading.value = false;
            }
        }

        async function restoreBackup(fileId, mode) {
            if (busy.value || !connected.value) return null;
            loading.value = true;
            try {
                const result = await cloudBackup.restoreBackup(fileId, mode);
                if (result?.state) {
                    status.value = {
                        ...status.value,
                        state: result.state,
                        error: result.error || null
                    };
                }
                if (result?.success) await loadBackups();
                return result;
            } finally {
                loading.value = false;
            }
        }

        return {
            status,
            backups,
            loading,
            connected,
            busy,
            init,
            connect,
            disconnect,
            backupNow,
            loadBackups,
            restoreBackup
        };
    }
);
