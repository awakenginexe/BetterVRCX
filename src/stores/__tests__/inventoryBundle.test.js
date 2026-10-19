import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { reactive } from 'vue';

const mocks = vi.hoisted(() => ({ getInventoryItems: vi.fn() }));
vi.mock('../../api/inventory', () => ({ default: mocks }));
vi.mock('../settings/notifications', () => ({
    useNotificationsSettingsStore: () => settings
}));
vi.mock('../user', () => ({ useUserStore: () => user }));
import { watchState } from '../../services/watchState';
import { useInventoryBundleStore } from '../inventoryBundle';

const settings = reactive({ inventoryBundleNotifications: true });
const user = reactive({ currentUser: { id: 'usr_a' } });
let pinia;
beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
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

it('drops stale results on logout and clears seen IDs for another account', async () => {
    let resolve;
    mocks.getInventoryItems.mockReturnValue(new Promise((r) => (resolve = r)));
    const store = useInventoryBundleStore();
    const pending = store.checkInventoryBundles();
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
