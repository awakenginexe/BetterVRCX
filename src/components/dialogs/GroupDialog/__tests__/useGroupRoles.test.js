import { describe, expect, test, vi } from 'vitest';
import { ref } from 'vue';
import { useGroupRoles } from '../useGroupRoles';

const owner = { id: 'owner', order: 0, permissions: ['*'] };
const member = {
    id: 'member',
    name: 'Member',
    order: 2,
    permissions: [],
    isSelfAssignable: true
};
function setup(permissions = ['group-roles-manage', 'group-roles-assign']) {
    const group = ref({
        id: 'grp_1',
        ownerId: 'usr_owner',
        myMember: {
            membershipStatus: 'member',
            roleIds: ['manager'],
            permissions
        }
    });
    const api = {
        getGroup: vi
            .fn()
            .mockResolvedValue({
                json: {
                    roles: [
                        owner,
                        { id: 'manager', order: 1, permissions: [] },
                        member
                    ]
                }
            }),
        getGroupRoles: vi
            .fn()
            .mockResolvedValue({
                json: [
                    owner,
                    { id: 'manager', order: 1, permissions: [] },
                    member
                ]
            }),
        getGroupPermissionList: vi
            .fn()
            .mockResolvedValue({
                json: [
                    {
                        name: 'group-members-remove',
                        allowedToAdd: true,
                        isManagementPermission: true
                    }
                ]
            }),
        editGroupRole: vi.fn().mockResolvedValue({}),
        createGroupRole: vi.fn().mockResolvedValue({ json: { id: 'new' } }),
        deleteGroupRole: vi.fn().mockResolvedValue({}),
        addGroupMemberRole: vi
            .fn()
            .mockResolvedValue({ json: ['manager', 'member'] }),
        removeGroupMemberRole: vi.fn().mockResolvedValue({ json: ['manager'] })
    };
    return { group, api, state: useGroupRoles(group, ref('usr_me'), api) };
}
describe('group roles', () => {
    test('does not allow editing when permission metadata cannot be loaded', async () => {
        const { state, api } = setup();
        api.getGroupPermissionList.mockRejectedValue(new Error('Unavailable'));
        await state.load();
        expect(state.canEdit(member)).toBe(false);
        await expect(
            state.save({ ...member, permissions: [] })
        ).rejects.toThrow();
        expect(api.editGroupRole).not.toHaveBeenCalled();
    });
    test('reorders only mutable roles within their management section', async () => {
        const { state, api } = setup();
        const next = { id: 'next', name: 'Next', order: 3, permissions: [] };
        api.getGroupRoles.mockResolvedValue({
            json: [
                owner,
                { id: 'manager', order: 1, permissions: [] },
                member,
                next
            ]
        });
        await state.load();
        await state.move(member, -1);
        expect(api.editGroupRole).not.toHaveBeenCalled();
        await state.move(member, 1);
        expect(api.editGroupRole).toHaveBeenCalledWith({
            groupId: 'grp_1',
            roleId: 'member',
            order: 3
        });
        expect(api.editGroupRole).toHaveBeenCalledWith({
            groupId: 'grp_1',
            roleId: 'next',
            order: 2
        });
    });
    test('enforces role hierarchy and protects owner/default roles', async () => {
        const { state } = setup();
        await state.load();
        expect(state.canEdit(owner)).toBe(false);
        expect(state.canEdit({ ...member, defaultRole: true })).toBe(false);
        expect(state.canEdit(member)).toBe(true);
        expect(state.canDelete({ ...member, defaultRole: true })).toBe(false);
    });
    test('purchase roles cannot be manually assigned or grant management permissions', async () => {
        const { state, api } = setup();
        await state.load();
        expect(state.canToggleSelf({ ...member, requiresPurchase: true })).toBe(
            false
        );
        await expect(
            state.save({
                ...member,
                requiresPurchase: true,
                permissions: ['group-members-remove']
            })
        ).rejects.toThrow();
        expect(api.editGroupRole).not.toHaveBeenCalled();
    });
    test('read-only members can self assign eligible roles but cannot edit', async () => {
        const { state, group } = setup([]);
        await state.load();
        expect(state.canEdit(member)).toBe(false);
        await state.toggleSelf(member);
        expect(group.value.myMember.roleIds).toContain('member');
    });
    test('ignores stale role results when group changes', async () => {
        const { state, api, group } = setup();
        let resolve;
        api.getGroupRoles.mockReturnValue(
            new Promise((r) => {
                resolve = r;
            })
        );
        const pending = state.load();
        group.value = { id: 'grp_2', myMember: {} };
        resolve({ json: [member] });
        await pending;
        expect(state.roles.value).toEqual([]);
    });
    test('rejects permission escalation and changing protected roles at the mutation boundary', async () => {
        const { state, api } = setup();
        await state.load();
        await expect(
            state.save({ ...member, permissions: ['*'] })
        ).rejects.toThrow();
        await expect(state.remove(owner)).rejects.toThrow();
        expect(api.deleteGroupRole).not.toHaveBeenCalled();
    });
});
