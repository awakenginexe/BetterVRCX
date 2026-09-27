import { describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    request: vi.fn().mockResolvedValue({ id: 'invite_1' })
}));

vi.mock('../../services/request', () => ({ request: mocks.request }));
vi.mock('../../stores', () => ({
    useGalleryStore: () => ({ uploadImage: 'current-image' })
}));

import notificationRequest from '../notification';

describe('notification invite photo', () => {
    test('uses captured batch image without changing existing callers', async () => {
        await notificationRequest.sendInvitePhoto(
            { messageSlot: 1 },
            'usr_a',
            'captured-image'
        );
        expect(mocks.request).toHaveBeenCalledWith('invite/usr_a/photo', {
            uploadImageLegacy: true,
            postData: JSON.stringify({ messageSlot: 1 }),
            imageData: 'captured-image'
        });
        await notificationRequest.sendInvitePhoto({ messageSlot: 1 }, 'usr_b');
        expect(mocks.request).toHaveBeenCalledWith('invite/usr_b/photo', {
            uploadImageLegacy: true,
            postData: JSON.stringify({ messageSlot: 1 }),
            imageData: 'current-image'
        });
    });
});
