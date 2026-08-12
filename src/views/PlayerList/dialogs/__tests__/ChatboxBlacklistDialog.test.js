import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';

const mocks = vi.hoisted(() => ({
    chatboxUserBlacklist: null,
    chatboxBlacklist: null,
    saveChatboxBlacklist: vi.fn()
}));

vi.mock('pinia', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        storeToRefs: (store) => store
    };
});

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key) => key
    })
}));

vi.mock('../../../../stores', () => ({
    usePhotonStore: () => ({
        chatboxUserBlacklist: mocks.chatboxUserBlacklist,
        chatboxBlacklist: mocks.chatboxBlacklist,
        saveChatboxBlacklist: (...args) => mocks.saveChatboxBlacklist(...args)
    })
}));

vi.mock('@/components/ui/dialog', () => ({
    Dialog: { template: '<div><slot /></div>' },
    DialogContent: { template: '<section v-bind="$attrs"><slot /></section>' },
    DialogHeader: { template: '<header><slot /></header>' },
    DialogTitle: { template: '<h1><slot /></h1>' }
}));

vi.mock('@/components/ui/button', () => ({
    Button: {
        emits: ['click'],
        template:
            '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>'
    }
}));

vi.mock('@/components/ui/input-group', () => ({
    InputGroupAction: {
        template: '<div><slot name="actions" /></div>'
    }
}));

vi.mock('@/components/ui/badge', () => ({
    Badge: { template: '<div v-bind="$attrs"><slot /></div>' }
}));

vi.mock('lucide-vue-next', () => ({
    X: { template: '<i />' }
}));

import ChatboxBlacklistDialog from '../ChatboxBlacklistDialog.vue';

describe('ChatboxBlacklistDialog.vue', () => {
    beforeEach(() => {
        mocks.chatboxBlacklist = ref(['spam']);
        mocks.chatboxUserBlacklist = ref(
            new Map([['usr_blocked', 'Blocked User']])
        );
        mocks.saveChatboxBlacklist.mockReset();
    });

    it('groups destructive actions and labels both delete paths', async () => {
        const wrapper = mount(ChatboxBlacklistDialog, {
            props: {
                chatboxBlacklistDialog: { visible: true, loading: false }
            }
        });

        expect(wrapper.get('.bv-danger-zone').exists()).toBe(true);

        const deleteButtons = wrapper.findAll('[data-action="delete"]');
        expect(deleteButtons).toHaveLength(2);
        expect(deleteButtons[0].attributes('aria-label')).toContain(
            'common.actions.delete'
        );
        expect(deleteButtons[1].attributes('aria-label')).toContain(
            'Blocked User'
        );

        await deleteButtons[1].trigger('click');

        expect(wrapper.emitted('deleteChatboxUserBlacklist')).toEqual([
            ['usr_blocked']
        ]);
    });
});
