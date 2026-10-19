import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('../../addons/lastKnownPresence/store', () => ({
    useLastKnownPresenceStore: vi.fn()
}));
vi.mock('../../services/request', () => ({ request: vi.fn() }));
vi.mock('../../plugins/i18n', () => ({
    i18n: { global: { t: (key) => key } }
}));
vi.mock('../../stores', () => ({
    useInstanceStore: () => ({ applyInstance: (json) => json })
}));
import { request } from '../../services/request';
import instanceRequest from '../instance';

beforeEach(() => vi.resetAllMocks());
it('updates instance metadata without sending the location in the body', async () => {
    const json = { id: 'wrld_a:1', displayName: 'Name' };
    request.mockResolvedValue(json);
    const result = await instanceRequest.updateInstance({
        location: 'wrld_a:1',
        displayName: 'Name',
        calendarEntryId: null
    });
    expect(request).toHaveBeenCalledWith('instances/wrld_a:1', {
        method: 'PUT',
        params: { displayName: 'Name', calendarEntryId: null }
    });
    expect(result.ref).toBe(json);
});
it('retrieves active instance and event counts', async () => {
    request.mockResolvedValue({ instances: 20, events: 4, asOf: '2026-10-19' });
    expect((await instanceRequest.getInstanceCount()).json.instances).toBe(20);
    expect(request).toHaveBeenCalledWith('instances/count', { method: 'GET' });
});
