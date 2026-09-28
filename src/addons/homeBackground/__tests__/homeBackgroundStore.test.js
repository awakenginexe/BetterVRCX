import { describe, expect, test, vi } from 'vitest';
import { useHomeBackground } from '../homeBackgroundStore';

describe('Home Wallpaper photo discovery', () => {
    test('continues to enumerate photos with the existing empty-search native contract', async () => {
        const findScreenshotsBySearch = vi
            .fn()
            .mockResolvedValue(JSON.stringify(['C:/shots/one.png']));
        globalThis.AppApi = {
            FindScreenshotsBySearch: findScreenshotsBySearch
        };

        const result = await useHomeBackground().fetchRandomVRChatPhoto();

        expect(findScreenshotsBySearch).toHaveBeenCalledWith('', 0);
        expect(result).toContain('one.png');
    });
});
