import { computed, ref } from 'vue';

/** Group role mutations are checked here as well as at their controls. */
export function useGroupRoles(group, userId, api) {
    const roles = ref([]);
    const permissions = ref([]);
    const loading = ref(false);
    const error = ref('');
    const permissionsLoaded = ref(false);
    let generation = 0;
    const has = (permission) => {
        const granted = group.value?.myMember?.permissions || [];
        return granted.includes('*') || granted.includes(permission);
    };
    const canManage = computed(
        () => permissionsLoaded.value && has('group-roles-manage')
    );
    const isOwner = () => group.value.ownerId === userId.value || has('*');
    const fixed = (role) => role.defaultRole || role.permissions?.includes('*');
    const highestOrder = () =>
        Math.min(
            ...roles.value
                .filter((role) =>
                    group.value.myMember?.roleIds?.includes(role.id)
                )
                .map((role) => role.order)
        );
    const below = (role) => isOwner() || role.order > highestOrder();
    const canEdit = (role) =>
        role.defaultRole
            ? permissionsLoaded.value && has('group-default-role-manage')
            : canManage.value &&
              below(role) &&
              (!role.permissions?.includes('*') || isOwner());
    const canDelete = (role) => canManage.value && !fixed(role) && below(role);
    const canToggleSelf = (role) =>
        !fixed(role) &&
        !role.requiresPurchase &&
        group.value.myMember?.membershipStatus === 'member' &&
        (role.isSelfAssignable || (has('group-roles-assign') && below(role)));

    async function load() {
        const id = group.value.id;
        const token = ++generation;
        roles.value = [];
        permissions.value = [];
        permissionsLoaded.value = false;
        loading.value = true;
        error.value = '';
        try {
            const result =
                has('group-roles-manage') || has('group-default-role-manage')
                    ? await api.getGroupRoles({ groupId: id })
                    : await api.getGroup({ groupId: id, includeRoles: true });
            if (token !== generation || id !== group.value.id) return;
            roles.value = [...(result.json.roles || result.json || [])].sort(
                (a, b) => a.order - b.order
            );
            if (has('group-roles-manage') || has('group-default-role-manage')) {
                const list = await api.getGroupPermissionList({ groupId: id });
                if (token === generation && id === group.value.id) {
                    permissions.value = list.json.filter((p) => p.name !== '*');
                    permissionsLoaded.value = true;
                }
            }
        } catch (e) {
            if (token === generation && id === group.value.id)
                error.value = e.message || String(e);
        } finally {
            if (token === generation) loading.value = false;
        }
    }

    async function mutate(action) {
        if (loading.value) return false;
        loading.value = true;
        error.value = '';
        const id = group.value.id;
        try {
            await action(id);
            return id === group.value.id;
        } catch (e) {
            if (id === group.value.id) error.value = e.message || String(e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function save(fields) {
        const original = roles.value.find((role) => role.id === fields.id);
        if (fields.id ? !original || !canEdit(original) : !canManage.value)
            throw new Error('Role is read-only');
        const selected = [...(fields.permissions || [])];
        if (
            selected.some(
                (name) =>
                    !original?.permissions?.includes(name) &&
                    !permissions.value.some(
                        (p) => p.name === name && p.allowedToAdd
                    )
            )
        )
            throw new Error('Permission cannot be granted');
        if (
            fields.requiresPurchase &&
            (fields.isSelfAssignable ||
                fields.isAddedOnJoin ||
                selected.some(
                    (name) =>
                        name === '*' ||
                        permissions.value.some(
                            (p) => p.name === name && p.isManagementPermission
                        )
                ))
        )
            throw new Error(
                'Purchase roles cannot be self assigned, added on join, or grant management permissions'
            );
        const body = original?.defaultRole
            ? { permissions: selected }
            : {
                  name: fields.name?.trim(),
                  description: fields.description || '',
                  requiresTwoFactor: Boolean(fields.requiresTwoFactor),
                  ...(original?.permissions?.includes('*')
                      ? {}
                      : {
                            isSelfAssignable: Boolean(fields.isSelfAssignable),
                            isAddedOnJoin: Boolean(fields.isAddedOnJoin),
                            requiresPurchase: Boolean(fields.requiresPurchase),
                            permissions: selected
                        })
              };
        if (
            !original?.defaultRole &&
            (!body.name ||
                body.name.length > 64 ||
                body.description.length > 512)
        )
            throw new Error('Name and description are invalid');
        const changed = await mutate((groupId) =>
            original
                ? api.editGroupRole({ groupId, roleId: original.id, ...body })
                : api.createGroupRole({ groupId, ...body })
        );
        if (changed) await load();
    }

    async function remove(role) {
        const original = roles.value.find((item) => item.id === role.id);
        if (!original || !canDelete(original))
            throw new Error('Role cannot be deleted');
        const changed = await mutate((groupId) =>
            api.deleteGroupRole({ groupId, roleId: original.id })
        );
        if (changed) await load();
    }

    async function move(role, direction) {
        const index = roles.value.findIndex((item) => item.id === role.id);
        const original = roles.value[index];
        const target = roles.value[index + direction];
        if (
            ![1, -1].includes(direction) ||
            !original ||
            !target ||
            !canDelete(original) ||
            !canDelete(target) ||
            Boolean(original.isManagementRole) !==
                Boolean(target.isManagementRole)
        )
            return;
        try {
            await mutate(async (groupId) => {
                await api.editGroupRole({
                    groupId,
                    roleId: original.id,
                    order: target.order
                });
                if (groupId === group.value.id)
                    await api.editGroupRole({
                        groupId,
                        roleId: target.id,
                        order: original.order
                    });
            });
        } finally {
            await load();
        }
    }

    async function toggleSelf(role) {
        const original = roles.value.find((item) => item.id === role.id);
        if (!original || !canToggleSelf(original))
            throw new Error('Role cannot be self assigned');
        await mutate(async (groupId) => {
            const removing = group.value.myMember.roleIds?.includes(
                original.id
            );
            const result = await api[
                removing ? 'removeGroupMemberRole' : 'addGroupMemberRole'
            ]({ groupId, userId: userId.value, roleId: original.id });
            if (groupId === group.value.id && Array.isArray(result.json))
                group.value.myMember.roleIds = result.json;
        });
    }
    return {
        roles,
        permissions,
        loading,
        error,
        canManage,
        canEdit,
        canDelete,
        canToggleSelf,
        load,
        save,
        remove,
        move,
        toggleSelf
    };
}
