import { beforeEach, expect, test, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), error: vi.fn() }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock('vue-sonner', () => ({ toast: { error: mocks.error } }));
vi.mock('../../shared/utils', () => ({}));
vi.mock('../../coordinators/imageUploadCoordinator', () => ({}));
vi.mock('../../plugins/router', () => ({ router: {} }));
vi.mock('../../services/watchState', () => ({
    watchState: { isLoggedIn: false }
}));
vi.mock('../../api', () => ({ queryRequest: { fetch: mocks.fetch } }));
vi.mock('../settings/advanced', () => ({
    useAdvancedSettingsStore: () => ({ ugcFolderPath: 'C:/stickers' })
}));
vi.mock('../modal', () => ({ useModalStore: () => ({}) }));

import { useGalleryStore } from '../gallery';

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mocks.fetch.mockResolvedValue({
        json: {
            itemType: 'sticker',
            flags: ['ugc'],
            imageUrl: 'https://example.com/image.png',
            created_at: '2026-10-19T00:00:00Z'
        }
    });
    globalThis.AppApi = { SaveStickerToFile: vi.fn() };
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

test('reports a failed save without poisoning the retry cache', async () => {
    AppApi.SaveStickerToFile.mockRejectedValueOnce(
        new Error('Access denied')
    ).mockResolvedValueOnce('C:/stickers/saved.png');
    const store = useGalleryStore();
    await expect(
        store.trySaveStickerToFile('User', 'usr_user', 'inv_sticker')
    ).resolves.toBe(false);
    expect(mocks.error).toHaveBeenCalledWith(
        'compatibility.sticker_save_failed'
    );
    await store.trySaveStickerToFile('User', 'usr_user', 'inv_sticker');
    await store.trySaveStickerToFile('User', 'usr_user', 'inv_sticker');
    expect(AppApi.SaveStickerToFile).toHaveBeenCalledTimes(2);
});

test('reports inventory request failures and allows retry', async () => {
    mocks.fetch.mockRejectedValueOnce(new Error('Network failure'));
    const store = useGalleryStore();
    await expect(
        store.trySaveStickerToFile('User', 'usr_user', 'inv_sticker')
    ).resolves.toBe(false);
    expect(store.instanceStickersCache).not.toContain('inv_sticker');
});

test('treats an empty native save result as a failure', async () => {
    AppApi.SaveStickerToFile.mockResolvedValue('');
    const store = useGalleryStore();
    await expect(
        store.trySaveStickerToFile('User', 'usr_user', 'inv_sticker')
    ).resolves.toBe(false);
    expect(mocks.error).toHaveBeenCalled();
});
