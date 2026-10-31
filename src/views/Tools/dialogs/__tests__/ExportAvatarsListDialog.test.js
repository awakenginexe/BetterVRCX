import { mount } from '@vue/test-utils';
import { describe, expect, test, vi } from 'vitest';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock('pinia', async (original) => ({
    ...(await original()),
    storeToRefs: (store) => store
}));
vi.mock('@/components/ui/dialog', () => ({
    Dialog: { template: '<div><slot /></div>' },
    DialogContent: { template: '<div><slot /></div>' },
    DialogHeader: { template: '<div><slot /></div>' },
    DialogTitle: { template: '<div><slot /></div>' }
}));
vi.mock('@/components/ui/input-group', () => ({
    InputGroupTextareaField: { template: '<textarea />' }
}));
vi.mock('../../../../stores', () => ({
    useAvatarStore: () => ({ cachedAvatars: new Map() }),
    useUserStore: () => ({ currentUser: { value: { id: 'usr_me' } } })
}));
vi.mock('../../../../coordinators/avatarCoordinator', () => ({
    applyAvatar: (avatar) => avatar,
    removeAvatarFromCache: vi.fn()
}));
vi.mock('../../../../api', () => ({ avatarRequest: { getAvatars: vi.fn() } }));
vi.mock('../../../../services/request', () => ({
    processBulk: ({ handle, done }) => {
        handle({
            json: [
                {
                    id: 'avtr_public',
                    name: 'Public, "Avatar"',
                    releaseStatus: 'public'
                },
                {
                    id: 'avtr_private',
                    name: 'Private',
                    releaseStatus: 'private'
                },
                { id: 'avtr_unknown', name: 'Unknown' }
            ]
        });
        done();
    }
}));

import ExportAvatarsListDialog from '../ExportAvatarsListDialog.vue';

describe('avatar list export', () => {
    test('switches to public-only without refetching and preserves CSV escaping', async () => {
        const wrapper = mount(ExportAvatarsListDialog, {
            props: { isExportAvatarsListDialogVisible: false },
            global: {
                stubs: {
                    Dialog: { template: '<div><slot /></div>' },
                    DialogContent: { template: '<div><slot /></div>' }
                }
            }
        });
        await wrapper.setProps({ isExportAvatarsListDialogVisible: true });
        expect(wrapper.vm.exportAvatarsListCsv).toContain(
            'avtr_private,Private'
        );
        wrapper.vm.publicOnly = true;
        expect(wrapper.vm.exportAvatarsListCsv).toBe(
            'AvatarID,AvatarName\navtr_public,"Public, ""Avatar"""'
        );
    });
});
