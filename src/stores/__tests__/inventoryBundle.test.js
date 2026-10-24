import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { reactive } from 'vue';
import { flushPromises } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({ getInventoryItems: vi.fn() }));
const savedState = new Map();
vi.mock('../../services/config', () => ({
    default: {
        getObject: vi.fn(async (key, fallback) =>
            JSON.parse(savedState.get(key) ?? JSON.stringify(fallback))
        ),
        setObject: vi.fn(async (key, value) => {
            savedState.set(key, JSON.stringify(value));
        })
    }
}));
vi.mock('../../api/inventory', () => ({ default: mocks }));
vi.mock('../settings/notifications', () => ({
    useNotificationsSettingsStore: () => settings
}));
vi.mock('../user', () => ({ useUserStore: () => user }));
import { watchState } from '../../services/watchState';
import { useInventoryBundleStore } from '../inventoryBundle';
import configRepository from '../../services/config';

const settings = reactive({ inventoryBundleNotifications: true });
const user = reactive({ currentUser: { id: 'usr_a' } });
let pinia;
beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    savedState.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    settings.inventoryBundleNotifications = true;
    user.currentUser.id = 'usr_a';
    watchState.isLoggedIn = true;
    pinia = createPinia();
    setActivePinia(pinia);
});
afterEach(() => {
    pinia._s.forEach((store) => store.$dispose());
    vi.restoreAllMocks();
    vi.useRealTimers();
});

it('deduplicates overlapping requests and bundle IDs, then suppresses repeat notifications', async () => {
    let resolve;
    mocks.getInventoryItems.mockReturnValue(new Promise((r) => (resolve = r)));
    const store = useInventoryBundleStore();
    const first = store.checkInventoryBundles();
    const second = store.checkInventoryBundles();
    await flushPromises();
    expect(store.isLoading).toBe(true);
    expect(mocks.getInventoryItems).toHaveBeenCalledTimes(1);
    resolve({ json: { data: [{ id: 'a', name: 'Gift' }, { id: 'a' }, null] } });
    await Promise.all([first, second]);
    expect(store.inventoryBundleDialog).toEqual({
        visible: true,
        bundles: [{ id: 'a', name: 'Gift' }]
    });
    store.inventoryBundleDialog.visible = false;
    await store.checkInventoryBundles();
    expect(mocks.getInventoryItems).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(300_000);
    mocks.getInventoryItems.mockResolvedValue({
        json: { data: [{ id: 'a' }, { id: 'b' }] }
    });
    await store.checkInventoryBundles();
    expect(store.inventoryBundleDialog.bundles).toEqual([{ id: 'b' }]);
});

it('requests active bundles and excludes explicitly archived results', async () => {
    mocks.getInventoryItems.mockResolvedValue({
        json: { data: [{ id: 'archived', isArchived: true }, { id: 'active' }] }
    });
    const store = useInventoryBundleStore();
    await store.checkInventoryBundles();
    expect(mocks.getInventoryItems).toHaveBeenCalledWith(
        expect.objectContaining({ archived: false, types: 'bundle' })
    );
    expect(store.inventoryBundleDialog.bundles).toEqual([{ id: 'active' }]);
});

it('drops stale results on logout and clears seen IDs for another account', async () => {
    let resolve;
    mocks.getInventoryItems.mockReturnValue(new Promise((r) => (resolve = r)));
    const store = useInventoryBundleStore();
    const pending = store.checkInventoryBundles();
    await flushPromises();
    watchState.isLoggedIn = false;
    resolve({ json: { data: [{ id: 'a' }] } });
    await pending;
    expect(store.inventoryBundleDialog).toEqual({
        visible: false,
        bundles: []
    });
    expect(store.isLoading).toBe(false);
    user.currentUser.id = 'usr_b';
    watchState.isLoggedIn = true;
    mocks.getInventoryItems.mockResolvedValue({
        json: { data: [{ id: 'a' }] }
    });
    await store.checkInventoryBundles();
    expect(store.inventoryBundleDialog.visible).toBe(true);
});

it('hides and invalidates pending results when disabled and never requests while logged out', async () => {
    let resolve;
    mocks.getInventoryItems.mockReturnValue(new Promise((r) => (resolve = r)));
    const store = useInventoryBundleStore();
    const pending = store.checkInventoryBundles();
    await flushPromises();
    settings.inventoryBundleNotifications = false;
    resolve({ json: { data: [{ id: 'a' }] } });
    await pending;
    expect(store.inventoryBundleDialog.visible).toBe(false);
    await store.checkInventoryBundles();
    expect(mocks.getInventoryItems).toHaveBeenCalledTimes(1);
    watchState.isLoggedIn = false;
    settings.inventoryBundleNotifications = true;
    await store.checkInventoryBundles();
    expect(mocks.getInventoryItems).toHaveBeenCalledTimes(1);
});

it('contains request errors and permits retry after cooldown', async () => {
    mocks.getInventoryItems.mockRejectedValueOnce(new Error('offline'));
    const store = useInventoryBundleStore();
    await expect(store.checkInventoryBundles()).resolves.toBeUndefined();
    expect(store.error).toBe(true);
    expect(store.isLoading).toBe(false);
    vi.advanceTimersByTime(300_000);
    mocks.getInventoryItems.mockResolvedValueOnce({ json: { data: [] } });
    await store.checkInventoryBundles();
    expect(store.error).toBe(false);
});

it('recovers when the request transport throws synchronously during its cooldown', async () => {
    mocks.getInventoryItems.mockImplementationOnce(() => {
        throw new Error('request blocked');
    });
    const store = useInventoryBundleStore();
    await store.checkInventoryBundles();
    expect(store.error).toBe(true);
    expect(store.isLoading).toBe(false);
    vi.advanceTimersByTime(300_000);
    mocks.getInventoryItems.mockResolvedValueOnce({
        json: { data: [{ id: 'recovered' }] }
    });
    await store.checkInventoryBundles();
    expect(store.inventoryBundleDialog.visible).toBe(true);
});

it('remembers notified bundles after restart while still notifying for new bundles', async () => {
    mocks.getInventoryItems.mockResolvedValue({
        json: { data: [{ id: 'old' }] }
    });
    const first = useInventoryBundleStore();
    await first.checkInventoryBundles();
    expect(first.inventoryBundleDialog.visible).toBe(true);
    first.$dispose();
    setActivePinia(createPinia());
    mocks.getInventoryItems.mockResolvedValue({
        json: { data: [{ id: 'old' }, { id: 'new' }] }
    });
    const restarted = useInventoryBundleStore();
    await restarted.checkInventoryBundles();
    expect(restarted.inventoryBundleDialog.bundles).toEqual([{ id: 'new' }]);
    restarted.$dispose();
});

it('persists unavailable bundles, removes them from the popup, and allows explicit retry', async () => {
    mocks.getInventoryItems.mockResolvedValue({
        json: { data: [{ id: 'empty' }] }
    });
    const first = useInventoryBundleStore();
    await first.checkInventoryBundles();
    await first.markInventoryBundleUnavailable('empty');
    expect(first.inventoryBundleDialog).toEqual({
        visible: false,
        bundles: []
    });
    first.$dispose();
    setActivePinia(createPinia());
    const restarted = useInventoryBundleStore();
    await restarted.checkInventoryBundles();
    expect(restarted.unavailableInventoryIds.has('empty')).toBe(true);
    expect(restarted.inventoryBundleDialog.visible).toBe(false);
    await restarted.retryUnavailableBundles();
    expect(restarted.unavailableInventoryIds.has('empty')).toBe(false);
    vi.advanceTimersByTime(300_000);
    await restarted.checkInventoryBundles();
    expect(restarted.inventoryBundleDialog.visible).toBe(false);
    restarted.$dispose();
});

it('keeps saved bundle state separate for each account', async () => {
    mocks.getInventoryItems.mockResolvedValue({
        json: { data: [{ id: 'gift' }] }
    });
    const store = useInventoryBundleStore();
    await store.checkInventoryBundles();
    await store.markInventoryBundleUnavailable('gift');
    user.currentUser.id = 'usr_b';
    await store.checkInventoryBundles();
    expect(store.unavailableInventoryIds.size).toBe(0);
    expect(store.inventoryBundleDialog.bundles).toEqual([{ id: 'gift' }]);
    user.currentUser.id = 'usr_a';
    await store.checkInventoryBundles();
    expect(store.unavailableInventoryIds.has('gift')).toBe(true);
    expect(store.inventoryBundleDialog.visible).toBe(false);
});

it('ignores saved state still loading for a previous account', async () => {
    let resolve;
    configRepository.getObject.mockImplementationOnce(
        () =>
            new Promise((r) => {
                resolve = r;
            })
    );
    mocks.getInventoryItems.mockResolvedValue({
        json: { data: [{ id: 'gift' }] }
    });
    const store = useInventoryBundleStore();
    const pending = store.checkInventoryBundles();
    user.currentUser.id = 'usr_b';
    await store.checkInventoryBundles();
    resolve({ shownIds: ['gift'], unavailableIds: ['gift'] });
    await pending;
    expect(store.unavailableInventoryIds.size).toBe(0);
    expect(store.inventoryBundleDialog.bundles).toEqual([{ id: 'gift' }]);
});

it('validates saved IDs and excludes unavailable bundles before showing a popup', async () => {
    savedState.set(
        'VRCX_inventoryBundleState_usr_a',
        JSON.stringify({
            shownIds: ['old', null, 42, ''],
            unavailableIds: ['empty', false]
        })
    );
    mocks.getInventoryItems.mockResolvedValue({
        json: { data: [{ id: 'old' }, { id: 'empty' }, { id: 'new' }] }
    });
    const store = useInventoryBundleStore();
    await store.checkInventoryBundles();
    expect([...store.unavailableInventoryIds]).toEqual(['empty']);
    expect(store.inventoryBundleDialog.bundles).toEqual([{ id: 'new' }]);
});

it('does not overwrite unreadable saved state and retries loading after cooldown', async () => {
    configRepository.getObject.mockRejectedValueOnce(
        new Error('database unavailable')
    );
    mocks.getInventoryItems.mockResolvedValue({
        json: { data: [{ id: 'gift' }] }
    });
    const store = useInventoryBundleStore();
    await store.checkInventoryBundles();
    expect(store.error).toBe(true);
    expect(store.inventoryBundleDialog.visible).toBe(false);
    expect(configRepository.setObject).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300_000);
    await store.checkInventoryBundles();
    expect(store.inventoryBundleDialog.bundles).toEqual([{ id: 'gift' }]);
});

it('reports a failed save while retaining the current notification', async () => {
    configRepository.setObject.mockRejectedValueOnce(new Error('disk full'));
    mocks.getInventoryItems.mockResolvedValue({
        json: { data: [{ id: 'gift' }] }
    });
    const store = useInventoryBundleStore();
    await store.checkInventoryBundles();
    expect(store.error).toBe(true);
    expect(store.inventoryBundleDialog.bundles).toEqual([{ id: 'gift' }]);
    expect(savedState.size).toBe(0);
});
