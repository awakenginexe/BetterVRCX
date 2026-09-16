import { beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
vi.mock('../../config', () => ({
    default: { getBool: vi.fn(), setBool: vi.fn() }
}));
vi.mock('../tracker', () => ({
    createAppUsageTracker: vi.fn(() => ({
        start: vi.fn(),
        disable: vi.fn(),
        close: vi.fn(),
        dispose: vi.fn()
    }))
}));
import config from '../../config';
import { useAppAnalyticsStore } from '../store';
beforeEach(() => {
    setActivePinia(createPinia());
    config.getBool.mockReset().mockResolvedValue(true);
    config.setBool.mockReset().mockResolvedValue();
});
it('defaults on and persists only the user setting', async () => {
    const store = useAppAnalyticsStore();
    await store.init();
    expect(config.getBool).toHaveBeenCalledWith(
        'BetterVRCX_appUsageAnalyticsEnabled',
        true
    );
    expect(store.enabled).toBe(true);
    await store.setEnabled(false);
    expect(store.enabled).toBe(false);
    expect(config.setBool).toHaveBeenCalledWith(
        'BetterVRCX_appUsageAnalyticsEnabled',
        false
    );
});
it('honors a saved opt-out', async () => {
    config.getBool.mockResolvedValue(false);
    const store = useAppAnalyticsStore();
    await store.init();
    expect(store.enabled).toBe(false);
});
it('late config load cannot undo an explicit opt-out', async () => {
    let resolve;
    config.getBool.mockImplementation(
        () =>
            new Promise((r) => {
                resolve = r;
            })
    );
    const store = useAppAnalyticsStore();
    const loading = store.init();
    await store.setEnabled(false);
    resolve(true);
    await loading;
    expect(store.enabled).toBe(false);
});
