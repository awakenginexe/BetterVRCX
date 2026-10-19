import { describe, expect, test, vi } from 'vitest';
import { ref } from 'vue';
import { useGroupGalleryManagement } from '../useGroupGalleryManagement';

function setup(permissions = ['group-galleries-manage']) {
    const gallery = {
        id: 'gal_1',
        name: 'Photos',
        roleIdsToManage: ['role_1'],
        roleIdsToSubmit: ['role_2']
    };
    const dialog = ref({
        id: 'grp_1',
        ref: { galleries: [gallery], myMember: { roleIds: [], permissions } },
        galleries: { gal_1: [{ id: 'img_1' }] }
    });
    const api = {
        createGroupGallery: vi
            .fn()
            .mockResolvedValue({ json: { id: 'gal_new', name: 'New' } }),
        editGroupGallery: vi
            .fn()
            .mockResolvedValue({ json: { name: 'Updated' } }),
        deleteGroupGallery: vi.fn().mockResolvedValue({}),
        addGroupGalleryImage: vi
            .fn()
            .mockResolvedValue({ json: { id: 'img_new', approved: false } }),
        deleteGroupGalleryImage: vi.fn().mockResolvedValue({})
    };
    return {
        dialog,
        gallery,
        api,
        state: useGroupGalleryManagement(dialog, ref('usr_me'), api)
    };
}
describe('group gallery management', () => {
    test('checks global and gallery role permissions at mutations', async () => {
        const { state, gallery, dialog, api } = setup([]);
        expect(state.canManage(gallery)).toBe(false);
        await expect(state.save({ name: 'New' })).rejects.toThrow();
        dialog.value.ref.myMember.roleIds = ['role_1'];
        expect(state.canManage(gallery)).toBe(true);
        expect(state.canCreate.value).toBe(false);
        await state.save({ id: 'gal_1', name: 'Updated' });
        expect(dialog.value.ref.galleries[0].name).toBe('Updated');
        expect(api.createGroupGallery).not.toHaveBeenCalled();
    });
    test('creates gallery and rejects empty names', async () => {
        const { state, dialog } = setup();
        await expect(state.save({ name: ' ' })).rejects.toThrow();
        await state.save({ name: 'New', membersOnly: true });
        expect(dialog.value.ref.galleries).toHaveLength(2);
        expect(dialog.value.galleries.gal_new).toEqual([]);
    });
    test('pending image submission is not presented as approved', async () => {
        const { state, gallery, dialog } = setup();
        expect(await state.addImage(gallery, 'file_1')).toBe(false);
        expect(dialog.value.galleries.gal_1).toHaveLength(1);
    });
    test('permits deletion only by gallery manager or image author', async () => {
        const { state, gallery, api } = setup([]);
        await expect(
            state.removeImage(gallery, {
                id: 'img_1',
                submittedByUserId: 'other'
            })
        ).rejects.toThrow();
        expect(api.deleteGroupGalleryImage).not.toHaveBeenCalled();
        await state.removeImage(gallery, {
            id: 'img_1',
            submittedByUserId: 'usr_me'
        });
    });
    test('stale mutations do not populate another group', async () => {
        const { state, dialog, api } = setup();
        let resolve;
        api.createGroupGallery.mockReturnValue(
            new Promise((r) => {
                resolve = r;
            })
        );
        const pending = state.save({ name: 'New' });
        dialog.value.id = 'grp_2';
        resolve({ json: { id: 'stale' } });
        await pending;
        expect(dialog.value.ref.galleries).toHaveLength(1);
        expect(state.loading.value).toBe(false);
    });
});
