import { beforeEach, describe, expect, test, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import {
    AVAILABILITY_NOTIFY_DURATIONS,
    AVAILABILITY_NOTIFY_TRIGGERS
} from '../../../shared/utils/friendAvailabilityNotify';

const mocks = vi.hoisted(() => ({
    availabilityStore: {
        dialog: {
            open: true,
            userId: 'usr_1',
            displayName: 'Aki',
            watch: null
        },
        saveWatch: vi.fn().mockResolvedValue({}),
        removeWatch: vi.fn().mockResolvedValue(undefined),
        closeDialog: vi.fn()
    },
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

vi.mock('../../../stores', () => ({
    useFriendAvailabilityNotifyStore: () => mocks.availabilityStore
}));

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key, params) => (params?.name ? `${key}:${params.name}` : key)
    })
}));

vi.mock('vue-sonner', () => ({
    toast: mocks.toast
}));

vi.mock('lucide-vue-next', () => ({
    Bell: { template: '<span />' },
    Trash2: { template: '<span />' }
}));

import FriendAvailabilityNotifyDialog from '../FriendAvailabilityNotifyDialog.vue';

const stubs = {
    Dialog: { props: ['open'], template: '<div v-if="open"><slot /></div>' },
    DialogContent: { template: '<section><slot /></section>' },
    DialogHeader: { template: '<header><slot /></header>' },
    DialogTitle: { template: '<h2><slot /></h2>' },
    DialogDescription: { template: '<p><slot /></p>' },
    DialogFooter: { template: '<footer><slot /></footer>' },
    Button: {
        props: ['disabled'],
        template:
            '<button :disabled="disabled" v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></button>'
    },
    Checkbox: {
        props: ['modelValue'],
        emits: ['update:modelValue'],
        template:
            '<button type="button" v-bind="$attrs" :data-checked="modelValue" @click="$emit(\'update:modelValue\', !modelValue)"><slot /></button>'
    },
    Label: { template: '<label><slot /></label>' },
    RadioGroup: {
        props: ['modelValue'],
        emits: ['update:modelValue'],
        template: '<div><slot /></div>'
    },
    RadioGroupItem: {
        props: ['value'],
        template: '<button type="button" v-bind="$attrs"><slot /></button>'
    }
};

describe('FriendAvailabilityNotifyDialog', () => {
    beforeEach(() => {
        mocks.availabilityStore.dialog.open = true;
        mocks.availabilityStore.dialog.userId = 'usr_1';
        mocks.availabilityStore.dialog.displayName = 'Aki';
        mocks.availabilityStore.dialog.watch = null;
        mocks.availabilityStore.saveWatch.mockClear();
        mocks.availabilityStore.removeWatch.mockClear();
        mocks.availabilityStore.closeDialog.mockClear();
        mocks.toast.success.mockClear();
        mocks.toast.error.mockClear();
    });

    test('saves default one-shot active and online triggers', async () => {
        const wrapper = mount(FriendAvailabilityNotifyDialog, {
            global: { stubs }
        });

        await wrapper
            .get('[data-testid="friend-availability-save"]')
            .trigger('click');

        expect(mocks.availabilityStore.saveWatch).toHaveBeenCalledWith(
            { id: 'usr_1', displayName: 'Aki' },
            {
                duration: AVAILABILITY_NOTIFY_DURATIONS.ONCE,
                triggers: {
                    [AVAILABILITY_NOTIFY_TRIGGERS.ACTIVE]: true,
                    [AVAILABILITY_NOTIFY_TRIGGERS.ONLINE]: true
                }
            }
        );
        expect(mocks.availabilityStore.closeDialog).toHaveBeenCalled();
    });

    test('disables save when both triggers are unchecked', async () => {
        const wrapper = mount(FriendAvailabilityNotifyDialog, {
            global: { stubs }
        });

        await wrapper
            .get('[data-testid="friend-availability-active"]')
            .trigger('click');
        await wrapper
            .get('[data-testid="friend-availability-online"]')
            .trigger('click');
        await nextTick();

        expect(
            wrapper
                .get('[data-testid="friend-availability-save"]')
                .attributes('disabled')
        ).toBeDefined();
    });
});
