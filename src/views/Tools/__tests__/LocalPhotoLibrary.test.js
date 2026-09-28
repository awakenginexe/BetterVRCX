import { beforeEach, describe, expect, test, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';

const mocks = vi.hoisted(() => ({
    page: vi.fn(),
    thumbnail: vi.fn(),
    folder: vi.fn(),
    user: vi.fn(),
    world: vi.fn(),
    history: vi.fn(),
    push: vi.fn()
}));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/coordinators/userCoordinator', () => ({
    showUserDialog: mocks.user
}));
vi.mock('@/coordinators/worldCoordinator', () => ({
    showWorldDialog: mocks.world
}));
vi.mock('@/services/database', () => ({
    database: { getPhotoHistoryContext: mocks.history }
}));
vi.mock('@/stores', () => ({
    useUserStore: () => ({ currentUser: { id: 'usr_owner' } })
}));

globalThis.AppApi = {
    GetLocalPhotoPage: mocks.page,
    GetLocalPhotoThumbnail: mocks.thumbnail,
    OpenFolderAndSelectItem: mocks.folder
};

import LocalPhotoLibrary from '../LocalPhotoLibrary.vue';

const item = (path, overrides = {}) => ({
    filePath: path,
    fileName: path.split('/').at(-1),
    timestamp: '2025-01-01T10:00:00Z',
    timeSource: 'metadata',
    status: 'metadata',
    world: { id: 'wrld_1', name: 'World', instanceId: 'wrld_1:1' },
    author: { id: 'usr_owner' },
    players: [{ id: 'usr_1', displayName: 'Alice' }],
    historyTimeUtc: '2025-01-01T10:00:00Z',
    ...overrides
});
const page = (items, hasMore = false, nextTime = '1') =>
    JSON.stringify({
        items,
        hasMore,
        nextTime,
        nextPath: items.at(-1)?.filePath || ''
    });
const deferred = () => {
    let resolve;
    const promise = new Promise((r) => {
        resolve = r;
    });
    return { promise, resolve };
};

describe('LocalPhotoLibrary', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.thumbnail.mockResolvedValue('data:image/jpeg;base64,AAAA');
        mocks.history.mockResolvedValue({
            players: [{ userId: 'usr_2', displayName: 'Bob' }]
        });
    });

    test('shows loading, empty, and errors', async () => {
        const pending = deferred();
        mocks.page.mockReturnValueOnce(pending.promise);
        const wrapper = mount(LocalPhotoLibrary);
        await nextTick();
        expect(wrapper.text()).toContain('view.tools.photo_library.loading');
        pending.resolve(page([]));
        await flushPromises();
        expect(wrapper.find('[data-testid="photo-empty"]').exists()).toBe(true);
        mocks.page.mockRejectedValueOnce(new Error('disk unavailable'));
        const refresh = wrapper
            .findAll('button')
            .find((button) => button.text().includes('refresh'));
        await refresh.trigger('click');
        await flushPromises();
        expect(wrapper.get('[role="alert"]').text()).toContain(
            'disk unavailable'
        );
        wrapper.unmount();
    });

    test('paginates, filters, opens detail and existing dialogs without API fan-out', async () => {
        mocks.page
            .mockResolvedValueOnce(page([item('/photos/one.png')], true, '500'))
            .mockResolvedValueOnce(
                page([item('/photos/two.png')], false, '400')
            )
            .mockResolvedValueOnce(page([item('/photos/one.png')], true, '500'))
            .mockResolvedValueOnce(
                page([item('/photos/three.png')], false, '300')
            );
        const wrapper = mount(LocalPhotoLibrary);
        await flushPromises();
        expect(wrapper.findAll('[data-testid="photo-card"]')).toHaveLength(1);
        const more = wrapper
            .findAll('button')
            .find((button) => button.text().includes('load_more'));
        await more.trigger('click');
        await flushPromises();
        expect(mocks.page.mock.calls[1][3]).toBe('500');
        expect(wrapper.findAll('[data-testid="photo-card"]')).toHaveLength(1);
        expect(wrapper.text()).toContain('two.png');
        const previous = wrapper
            .findAll('button')
            .find((button) => button.text().includes('previous'));
        await previous.trigger('click');
        await flushPromises();
        expect(wrapper.text()).toContain('one.png');
        await wrapper.find('[data-testid="photo-card"]').trigger('click');
        await flushPromises();
        expect(mocks.history).toHaveBeenCalledOnce();
        const dialog = wrapper.get('[role="dialog"]');
        expect(dialog.text()).toContain('Alice');
        expect(dialog.text()).toContain('Bob');
        await dialog
            .findAll('button')
            .find((button) => button.text() === 'World')
            .trigger('click');
        await dialog
            .findAll('button')
            .find((button) => button.text() === 'Alice')
            .trigger('click');
        await dialog
            .findAll('button')
            .find((button) => button.text().includes('open_folder'))
            .trigger('click');
        expect(mocks.world).toHaveBeenCalledWith('wrld_1');
        expect(mocks.user).toHaveBeenCalledWith('usr_1');
        expect(mocks.folder).toHaveBeenCalledWith('/photos/one.png');
        expect(mocks.thumbnail).toHaveBeenCalledTimes(3);
        const search = wrapper.find(
            'input[placeholder="view.tools.photo_library.search_hint"]'
        );
        await search.setValue('World');
        await wrapper.get('form').trigger('submit');
        await flushPromises();
        expect(mocks.page.mock.calls[3][0]).toBe('World');
        expect(wrapper.findAll('[data-testid="photo-card"]')).toHaveLength(1);
        wrapper.unmount();
    });

    test('keeps the latest filter response and labels missing metadata', async () => {
        const first = deferred();
        mocks.page.mockReturnValueOnce(first.promise).mockResolvedValueOnce(
            page([
                item('/photos/no-meta.png', {
                    status: 'missing_metadata',
                    world: null,
                    players: [],
                    timestamp: null,
                    fileModifiedUtc: '2025-01-01T10:00:00Z',
                    timeSource: 'file_modified',
                    historyTimeUtc: null
                })
            ])
        );
        const wrapper = mount(LocalPhotoLibrary);
        const search = wrapper.find(
            'input[placeholder="view.tools.photo_library.search_hint"]'
        );
        await search.setValue('new');
        await wrapper.get('form').trigger('submit');
        await flushPromises();
        first.resolve(page([item('/photos/stale.png')]));
        await flushPromises();
        expect(wrapper.text()).toContain('no-meta.png');
        expect(wrapper.text()).not.toContain('stale.png');
        expect(wrapper.text()).toContain(
            'view.tools.photo_library.status_missing_metadata'
        );
        wrapper.unmount();
    });
});
