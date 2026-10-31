import { describe, expect, test, vi } from 'vitest';
import { ref } from 'vue';
import { useModerationReports } from '../useModerationReports';
function setup() {
    const type = ref('all');
    const api = {
        getModerationReports: vi.fn().mockResolvedValue({
            json: {
                results: [{ id: 'report_1', reportingUserId: 'usr_me' }],
                hasNext: true
            }
        }),
        deleteModerationReport: vi.fn().mockResolvedValue({})
    };
    return { type, api, state: useModerationReports(type, ref('usr_me'), api) };
}
describe('personal moderation reports', () => {
    test('restricts queries to the current user and paginates', async () => {
        const { state, api, type } = setup();
        type.value = 'group';
        await state.load(true);
        expect(api.getModerationReports).toHaveBeenLastCalledWith({
            reportingUserId: 'usr_me',
            type: 'group',
            n: 100,
            offset: 0
        });
        expect(state.hasNext.value).toBe(true);
        await state.load(false);
        expect(api.getModerationReports).toHaveBeenLastCalledWith({
            reportingUserId: 'usr_me',
            type: 'group',
            n: 100,
            offset: 1
        });
    });
    test('stale filter responses do not contaminate the new list', async () => {
        const { state, api, type } = setup();
        let resolve;
        api.getModerationReports
            .mockReturnValueOnce(
                new Promise((r) => {
                    resolve = r;
                })
            )
            .mockResolvedValueOnce({
                json: { results: [{ id: 'new' }], hasNext: false }
            });
        const previous = state.load(true);
        type.value = 'group';
        await state.load(true);
        resolve({ json: { results: [{ id: 'old' }], hasNext: true } });
        await previous;
        expect(state.reports.value).toEqual([{ id: 'new' }]);
        expect(state.hasNext.value).toBe(false);
    });
    test('reports are read-only because the delete endpoint is deprecated', () => {
        const { state } = setup();
        expect(state).not.toHaveProperty('remove');
    });
});
