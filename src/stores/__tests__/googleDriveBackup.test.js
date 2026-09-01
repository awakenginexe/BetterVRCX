import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const mocks = vi.hoisted(() => ({
    getStatus: vi.fn(),
    restoreBackup: vi.fn(),
    deleteBackup: vi.fn(),
    listBackups: vi.fn()
}));

vi.mock('../../services/database/cloudBackup.js', () => ({
    default: {
        getStatus: (...args) => mocks.getStatus(...args),
        restoreBackup: (...args) => mocks.restoreBackup(...args),
        deleteBackup: (...args) => mocks.deleteBackup(...args),
        listBackups: (...args) => mocks.listBackups(...args)
    }
}));

import { useGoogleDriveBackupStore } from '../googleDriveBackup.js';

function createDeferred() {
    let resolve;
    const promise = new Promise((nextResolve) => {
        resolve = nextResolve;
    });
    return { promise, resolve };
}

describe('Google Drive backup restore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('shows native merge progress before the restore promise resolves', async () => {
        const pendingRestore = createDeferred();
        mocks.restoreBackup.mockReturnValue(pendingRestore.promise);
        mocks.getStatus.mockResolvedValue({
            state: 'merging',
            connected: true,
            error: null
        });

        const store = useGoogleDriveBackupStore();
        store.status = { state: 'connected', connected: true };

        const restore = store.restoreBackup('backup-1', 'merge');

        expect(store.status.state).toBe('downloading');

        await vi.advanceTimersByTimeAsync(1000);

        expect(mocks.getStatus).toHaveBeenCalledTimes(1);
        expect(store.status.state).toBe('merging');

        pendingRestore.resolve({ success: false, state: 'error' });
        await restore;
    });

    test('stops status polling after a restore error', async () => {
        const pendingRestore = createDeferred();
        mocks.restoreBackup.mockReturnValue(pendingRestore.promise);
        mocks.getStatus.mockResolvedValue({
            state: 'merging',
            connected: true
        });

        const store = useGoogleDriveBackupStore();
        store.status = { state: 'connected', connected: true };

        const restore = store.restoreBackup('backup-1', 'merge');
        await vi.advanceTimersByTimeAsync(1000);

        pendingRestore.resolve({ success: false, state: 'error' });
        await restore;
        await vi.advanceTimersByTimeAsync(1000);

        expect(mocks.getStatus).toHaveBeenCalledTimes(1);
    });

    test('keeps the completed restore state when an earlier status poll resolves late', async () => {
        const pendingRestore = createDeferred();
        const pendingStatus = createDeferred();
        mocks.restoreBackup.mockReturnValue(pendingRestore.promise);
        mocks.getStatus.mockReturnValue(pendingStatus.promise);

        const store = useGoogleDriveBackupStore();
        store.status = { state: 'connected', connected: true };

        const restore = store.restoreBackup('backup-1', 'merge');
        await vi.advanceTimersByTimeAsync(1000);

        pendingRestore.resolve({ success: false, state: 'error' });
        await restore;
        pendingStatus.resolve({ state: 'merging', connected: true });
        await Promise.resolve();

        expect(store.status.state).toBe('error');
    });

    test('removes a backup and refreshes the list after Drive moves it to trash', async () => {
        mocks.deleteBackup.mockResolvedValue({
            success: true,
            state: 'backup_deleted',
            connected: true
        });
        mocks.listBackups.mockResolvedValue([{ id: 'backup-2' }]);

        const store = useGoogleDriveBackupStore();
        store.status = { state: 'connected', connected: true };

        await expect(store.deleteBackup('backup-1')).resolves.toMatchObject({
            success: true,
            state: 'backup_deleted'
        });

        expect(mocks.deleteBackup).toHaveBeenCalledWith('backup-1');
        expect(mocks.listBackups).toHaveBeenCalledTimes(1);
        expect(store.backups).toEqual([{ id: 'backup-2' }]);
    });

    test('treats deletion as a busy cloud operation', () => {
        const store = useGoogleDriveBackupStore();
        store.status = { state: 'deleting', connected: true };

        expect(store.busy).toBe(true);
    });
});
