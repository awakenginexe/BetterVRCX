import { beforeEach, describe, expect, test, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';

const mocks = vi.hoisted(() => ({
    deleteBackup: vi.fn()
}));

vi.mock('@/stores', async () => {
    const { computed, ref } = await import('vue');
    const { defineStore } = await import('pinia');

    const useGoogleDriveBackupStore = defineStore('GoogleDriveBackup', () => {
        const status = ref({
            state: 'connected',
            connected: true,
            email: 'backup@example.com',
            error: null
        });
        const backups = ref([
            {
                id: 'backup-1',
                deviceName: 'Backup PC',
                createdAt: '2026-09-01T00:00:00.000Z',
                size: 1024
            }
        ]);
        const connected = computed(() => status.value.connected === true);
        const busy = computed(() =>
            ['downloading', 'merging', 'restoring'].includes(status.value.state)
        );

        return {
            status,
            backups,
            connected,
            busy,
            init: vi.fn(),
            connect: vi.fn(),
            disconnect: vi.fn(),
            backupNow: vi.fn(),
            loadBackups: vi.fn(),
            deleteBackup: (...args) => mocks.deleteBackup(...args),
            restoreBackup: vi.fn(() => {
                status.value = { ...status.value, state: 'downloading' };
                return new Promise(() => {});
            })
        };
    });

    return {
        useGoogleDriveBackupStore,
        useModalStore: () => ({ confirm: vi.fn() })
    };
});

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key, values = {}) => {
            if (key === 'view.settings.google_drive_backup.states.merging')
                return 'Merging…';
            if (key === 'view.settings.google_drive_backup.states.downloading')
                return 'Downloading…';
            if (key === 'view.settings.google_drive_backup.restore_in_progress')
                return 'Restore in progress';
            if (
                key ===
                'view.settings.google_drive_backup.restore_progress_description'
            )
                return `${values.state} Large databases can take several minutes.`;
            if (
                key ===
                'view.settings.google_drive_backup.restore_progress_elapsed'
            )
                return `Elapsed: ${values.duration}`;
            return key;
        }
    })
}));

import GoogleDriveBackupSettings from '../GoogleDriveBackupSettings.vue';

describe('GoogleDriveBackupSettings', () => {
    beforeEach(() => {
        mocks.deleteBackup.mockReset();
        setActivePinia(createPinia());
    });

    test('shows restore progress in the open restore dialog', async () => {
        const wrapper = mount(GoogleDriveBackupSettings, {
            global: {
                stubs: {
                    Dialog: {
                        props: ['open'],
                        template: '<div v-if="open"><slot /></div>'
                    },
                    DialogContent: {
                        template: '<div data-restore-dialog><slot /></div>'
                    },
                    DialogDescription: { template: '<div><slot /></div>' },
                    DialogFooter: { template: '<div><slot /></div>' },
                    DialogHeader: { template: '<div><slot /></div>' },
                    DialogTitle: { template: '<div><slot /></div>' },
                    Slider: {
                        name: 'Slider',
                        props: ['modelValue'],
                        emits: ['update:modelValue', 'valueCommit'],
                        template:
                            '<button data-backup-delete-slider :data-value="modelValue[0]" />'
                    }
                }
            }
        });

        const restoreButton = wrapper
            .findAll('button')
            .find(
                (button) =>
                    button.text() ===
                    'view.settings.google_drive_backup.restore'
            );
        await restoreButton.trigger('click');

        const confirmButton = wrapper
            .get('[data-restore-dialog]')
            .findAll('button')
            .find(
                (button) =>
                    button.text() ===
                    'view.settings.google_drive_backup.restore'
            );
        await confirmButton.trigger('click');

        await vi.waitFor(() => {
            expect(
                wrapper
                    .get('[data-restore-dialog] [data-backup-restore-progress]')
                    .text()
            ).toContain('Downloading…');
        });

        wrapper.unmount();
    });

    test('requires a completed slider gesture before moving a backup to Drive trash', async () => {
        mocks.deleteBackup.mockResolvedValue({ success: true });
        const wrapper = mount(GoogleDriveBackupSettings, {
            global: {
                stubs: {
                    Dialog: {
                        props: ['open'],
                        template: '<div v-if="open"><slot /></div>'
                    },
                    DialogContent: {
                        template: '<div data-delete-dialog><slot /></div>'
                    },
                    DialogDescription: { template: '<div><slot /></div>' },
                    DialogFooter: { template: '<div><slot /></div>' },
                    DialogHeader: { template: '<div><slot /></div>' },
                    DialogTitle: { template: '<div><slot /></div>' },
                    Slider: {
                        name: 'Slider',
                        props: ['modelValue'],
                        emits: ['update:modelValue', 'valueCommit'],
                        template:
                            '<button data-backup-delete-slider :data-value="modelValue[0]" />'
                    }
                }
            }
        });

        await wrapper
            .get('[aria-label="view.settings.google_drive_backup.delete"]')
            .trigger('click');
        const slider = wrapper.getComponent({ name: 'Slider' });
        slider.vm.$emit('valueCommit', [80]);
        await nextTick();

        expect(mocks.deleteBackup).not.toHaveBeenCalled();

        slider.vm.$emit('valueCommit', [100]);
        await vi.waitFor(() => {
            expect(mocks.deleteBackup).toHaveBeenCalledWith('backup-1');
        });

        wrapper.unmount();
    });

    test('resets a partial delete gesture when the pointer is released', async () => {
        const wrapper = mount(GoogleDriveBackupSettings, {
            global: {
                stubs: {
                    Dialog: {
                        props: ['open'],
                        template: '<div v-if="open"><slot /></div>'
                    },
                    DialogContent: { template: '<div><slot /></div>' },
                    DialogDescription: { template: '<div><slot /></div>' },
                    DialogFooter: { template: '<div><slot /></div>' },
                    DialogHeader: { template: '<div><slot /></div>' },
                    DialogTitle: { template: '<div><slot /></div>' },
                    Slider: {
                        name: 'Slider',
                        props: ['modelValue'],
                        emits: ['update:modelValue', 'valueCommit'],
                        template:
                            '<button data-backup-delete-slider :data-value="modelValue[0]" />'
                    }
                }
            }
        });

        await wrapper
            .get('[aria-label="view.settings.google_drive_backup.delete"]')
            .trigger('click');
        const slider = wrapper.getComponent({ name: 'Slider' });
        slider.vm.$emit('update:modelValue', [72]);
        await nextTick();
        expect(
            wrapper.get('[data-backup-delete-slider]').attributes('data-value')
        ).toBe('72');

        await wrapper.get('[data-backup-delete-slider]').trigger('pointerup');

        expect(
            wrapper.get('[data-backup-delete-slider]').attributes('data-value')
        ).toBe('0');
        expect(mocks.deleteBackup).not.toHaveBeenCalled();

        wrapper.unmount();
    });
});
