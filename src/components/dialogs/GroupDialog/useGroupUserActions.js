import { ref } from 'vue';

export function useGroupUserActions(tab, userId, api) {
    const groups = ref([]);
    const loading = ref(false);
    const error = ref('');
    let generation = 0;
    function cancel() {
        generation++;
        loading.value = false;
    }
    async function load() {
        const token = ++generation;
        const status = tab.value;
        const user = userId.value;
        groups.value = [];
        error.value = '';
        if (!user || !['invited', 'requested', 'userblocked'].includes(status))
            return;
        loading.value = true;
        try {
            const { json } = await api.getBlockedGroups({
                membershipStatus: status
            });
            if (
                token === generation &&
                user === userId.value &&
                status === tab.value
            )
                groups.value = json || [];
        } catch (e) {
            if (token === generation) error.value = e.message || String(e);
        } finally {
            if (token === generation) loading.value = false;
        }
    }
    async function act(group, action) {
        const actions = {
            invited: {
                accept: 'joinGroup',
                decline: 'declineGroupInvite',
                block: 'blockGroup'
            },
            requested: { cancel: 'cancelGroupRequest', block: 'blockGroup' },
            userblocked: { unblock: 'unblockGroup' }
        };
        const method = actions[tab.value]?.[action];
        const groupId = group.groupId || group.id;
        if (
            loading.value ||
            !method ||
            !userId.value ||
            !groupId?.startsWith('grp_') ||
            !groups.value.some((item) => item.id === group.id)
        )
            return;
        const token = generation;
        const status = tab.value;
        const user = userId.value;
        loading.value = true;
        error.value = '';
        try {
            await api[method]({
                groupId,
                ...(action === 'unblock' ? { userId: user } : {})
            });
            if (
                token === generation &&
                status === tab.value &&
                user === userId.value
            )
                groups.value = groups.value.filter(
                    (item) => item.id !== group.id
                );
        } catch (e) {
            if (token === generation) error.value = e.message || String(e);
        } finally {
            if (token === generation) loading.value = false;
        }
    }
    return { groups, loading, error, load, act, cancel };
}
