import { beforeEach, describe, expect, test, vi } from 'vitest';

import cloudBackup from './cloudBackup.js';

describe('cloudBackup service', () => {
    const api = {
        GetStatus: vi.fn(),
        ConnectGoogleDrive: vi.fn(),
        DisconnectGoogleDrive: vi.fn(),
        BackupNow: vi.fn(),
        ListBackups: vi.fn(),
        RestoreBackup: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        window.DatabaseBackupApi = api;
    });

    test('parses native status and backup list results', async () => {
        api.GetStatus.mockResolvedValue(
            JSON.stringify({ state: 'connected', connected: true })
        );
        api.ListBackups.mockResolvedValue(
            JSON.stringify([{ id: 'backup-1', name: 'Desktop.sqlite3' }])
        );

        await expect(cloudBackup.getStatus()).resolves.toEqual({
            state: 'connected',
            connected: true
        });
        await expect(cloudBackup.listBackups()).resolves.toEqual([
            { id: 'backup-1', name: 'Desktop.sqlite3' }
        ]);
    });

    test('passes merge or replace mode to the native restore boundary', async () => {
        api.RestoreBackup.mockResolvedValue(
            JSON.stringify({ success: true, state: 'restore_complete' })
        );

        await cloudBackup.restoreBackup('backup-1', 'replace');

        expect(api.RestoreBackup).toHaveBeenCalledWith('backup-1', 'replace');
    });

    test('surfaces native backup-list failures instead of treating them as empty', async () => {
        api.ListBackups.mockResolvedValue(
            JSON.stringify({
                success: false,
                state: 'download_failed',
                error: 'Drive unavailable'
            })
        );

        await expect(cloudBackup.listBackups()).rejects.toThrow(
            'Drive unavailable'
        );
    });
});
