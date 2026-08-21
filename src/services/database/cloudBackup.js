function getNativeApi() {
    if (!window.DatabaseBackupApi) {
        throw new Error('Database backup is not available in this build.');
    }
    return window.DatabaseBackupApi;
}

function parseNativeResult(result) {
    if (typeof result !== 'string') return result;
    return JSON.parse(result);
}

const cloudBackup = {
    async getStatus() {
        return parseNativeResult(await getNativeApi().GetStatus());
    },

    async connect() {
        return parseNativeResult(await getNativeApi().ConnectGoogleDrive());
    },

    async disconnect() {
        return parseNativeResult(await getNativeApi().DisconnectGoogleDrive());
    },

    async backupNow() {
        return parseNativeResult(await getNativeApi().BackupNow());
    },

    async listBackups() {
        const result = parseNativeResult(await getNativeApi().ListBackups());
        if (result && result.success === false) {
            throw new Error(
                result.error || 'Unable to list Google Drive backups.'
            );
        }
        return Array.isArray(result) ? result : [];
    },

    async restoreBackup(fileId, mode) {
        return parseNativeResult(
            await getNativeApi().RestoreBackup(fileId, mode)
        );
    }
};

export default cloudBackup;
