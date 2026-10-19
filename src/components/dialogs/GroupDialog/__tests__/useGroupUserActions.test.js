import { describe, expect, test, vi } from 'vitest';
import { ref } from 'vue';
import { useGroupUserActions } from '../useGroupUserActions';

function setup() {
    const tab = ref('invited');
    const api = {
        getBlockedGroups: vi.fn().mockResolvedValue({
            json: [{ id: 'member_1', groupId: 'grp_1' }]
        }),
        joinGroup: vi.fn().mockResolvedValue({}),
        declineGroupInvite: vi.fn().mockResolvedValue({}),
        cancelGroupRequest: vi.fn().mockResolvedValue({}),
        blockGroup: vi.fn().mockResolvedValue({}),
        unblockGroup: vi.fn().mockResolvedValue({})
    };
    return { tab, api, state: useGroupUserActions(tab, ref('usr_me'), api) };
}
describe('personal group actions', () => {
    test('loads invitations and removes accepted invitations', async () => {
        const { state, api } = setup();
        await state.load();
        await state.act(state.groups.value[0], 'accept');
        expect(api.joinGroup).toHaveBeenCalledWith({ groupId: 'grp_1' });
        expect(state.groups.value).toEqual([]);
    });
    test('only permits actions for the current membership status', async () => {
        const { state, api } = setup();
        await state.load();
        await state.act(state.groups.value[0], 'unblock');
        expect(api.unblockGroup).not.toHaveBeenCalled();
        expect(state.groups.value).toHaveLength(1);
    });
    test('unblocking targets the current user', async () => {
        const { state, api, tab } = setup();
        tab.value = 'userblocked';
        await state.load();
        await state.act(state.groups.value[0], 'unblock');
        expect(api.unblockGroup).toHaveBeenCalledWith({
            groupId: 'grp_1',
            userId: 'usr_me'
        });
    });
    test('ignores earlier requests after changing tabs', async () => {
        const { state, api, tab } = setup();
        let resolve;
        api.getBlockedGroups
            .mockReturnValueOnce(
                new Promise((r) => {
                    resolve = r;
                })
            )
            .mockResolvedValueOnce({ json: [{ id: 'blocked' }] });
        const previous = state.load();
        tab.value = 'userblocked';
        await state.load();
        resolve({ json: [{ id: 'invited' }] });
        await previous;
        expect(state.groups.value).toEqual([{ id: 'blocked' }]);
    });
    test('failed actions retain the entry and show errors', async () => {
        const { state, api } = setup();
        await state.load();
        api.joinGroup.mockRejectedValue(new Error('Unavailable'));
        await state.act(state.groups.value[0], 'accept');
        expect(state.groups.value).toHaveLength(1);
        expect(state.error.value).toBe('Unavailable');
        expect(state.loading.value).toBe(false);
    });
});
