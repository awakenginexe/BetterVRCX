import { beforeEach, expect, test, vi } from 'vitest';
import { ref } from 'vue';

const mocks = vi.hoisted(() => ({
    order: vi.fn(),
    remove: vi.fn(),
    invalidate: vi.fn()
}));
vi.mock('../../../../api', () => ({
    avatarRequest: { setAvatarGalleryOrder: mocks.order },
    miscRequest: { deleteFile: mocks.remove }
}));
vi.mock('../../../../queries', () => ({
    queryClient: { invalidateQueries: mocks.invalidate },
    queryKeys: { avatarGallery: (id) => ['avatar', id, 'gallery'] }
}));
import { useAvatarGalleryManagement } from '../useAvatarGalleryManagement';

let dialog, user, confirm, refresh;
beforeEach(() => {
    vi.clearAllMocks();
    dialog = ref({
        id: 'avtr_own',
        galleryLoading: false,
        galleryImages: ['a', 'b'],
        ref: {
            authorId: 'usr_me',
            gallery: [{ id: 'file_a' }, { id: 'file_b' }]
        }
    });
    user = ref({ id: 'usr_me' });
    confirm = vi.fn().mockResolvedValue({ ok: true });
    refresh = vi.fn().mockResolvedValue(undefined);
});

test('reorders the complete gallery in the correct avatar scope and invalidates its query', async () => {
    const gallery = useAvatarGalleryManagement(dialog, user, confirm, refresh);
    await gallery.moveImage(1, -1);
    expect(mocks.order).toHaveBeenCalledWith(['file_b', 'file_a'], 'avtr_own');
    expect(mocks.invalidate).toHaveBeenCalledWith({
        queryKey: ['avatar', 'avtr_own', 'gallery'],
        refetchType: 'none'
    });
    expect(refresh).toHaveBeenCalledWith('avtr_own');
    expect(dialog.value.galleryLoading).toBe(false);
});

test('does not mutate another author gallery or move outside bounds', async () => {
    const gallery = useAvatarGalleryManagement(dialog, user, confirm, refresh);
    await gallery.moveImage(0, -1);
    user.value.id = 'usr_other';
    await gallery.moveImage(0, 1);
    await gallery.removeImage(0);
    expect(mocks.order).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
});

test('requires confirmation and rechecks the avatar after the prompt', async () => {
    confirm.mockImplementation(async () => {
        dialog.value.id = 'avtr_other';
        return { ok: true };
    });
    await useAvatarGalleryManagement(
        dialog,
        user,
        confirm,
        refresh
    ).removeImage(0);
    expect(mocks.remove).not.toHaveBeenCalled();
});

test('removes only the selected file and leaves failures visible to the caller', async () => {
    const gallery = useAvatarGalleryManagement(dialog, user, confirm, refresh);
    await gallery.removeImage(1);
    expect(mocks.remove).toHaveBeenCalledWith('file_b');
    mocks.order.mockRejectedValueOnce(new Error('Permission denied'));
    await expect(gallery.moveImage(0, 1)).rejects.toThrow('Permission denied');
    expect(dialog.value.galleryLoading).toBe(false);
});
