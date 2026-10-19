import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { reactive } from 'vue';

const mocks = vi.hoisted(() => ({
    getInfoPush: vi.fn(),
    openExternalLink: vi.fn()
}));
vi.mock('../../../../api/misc', () => ({ default: mocks }));
vi.mock('../../../../stores/user', () => ({ useUserStore: () => user }));
vi.mock('../../../../shared/utils', () => ({
    openExternalLink: mocks.openExternalLink,
    formatDateFilter: (date) => date
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock('@/components/ui/dialog', () => ({
    Dialog: { template: '<div><slot /></div>' },
    DialogContent: { template: '<div><slot /></div>' },
    DialogHeader: { template: '<div><slot /></div>' },
    DialogTitle: { template: '<h2><slot /></h2>' },
    DialogDescription: { template: '<p><slot /></p>' }
}));
vi.mock('@/components/ui/button', () => ({
    Button: { template: '<button><slot /></button>' }
}));
import { watchState } from '../../../../services/watchState';
import InfoPushDialog from '../InfoPushDialog.vue';
const user = reactive({ currentUser: { id: 'usr_a' } });
let wrapper;
beforeEach(() => {
    vi.clearAllMocks();
    user.currentUser.id = 'usr_a';
    watchState.isLoggedIn = true;
});
afterEach(() => {
    wrapper?.unmount();
    delete window.HTMLElement.prototype.scrollIntoView;
});

it('loads on first visible mount, renders text safely and delegates allowed external links', async () => {
    mocks.getInfoPush.mockResolvedValue({
        json: [
            {
                id: 'a',
                data: {
                    name: '<script>bad()</script>',
                    description: 'News',
                    onPressed: {
                        command: 'OpenURL',
                        parameters: ['https://example.com'],
                        name: 'Read'
                    }
                }
            }
        ]
    });
    wrapper = mount(InfoPushDialog, {
        props: { isInfoPushDialogVisible: true }
    });
    await flushPromises();
    expect(mocks.getInfoPush).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('<script>bad()</script>');
    expect(wrapper.find('script').exists()).toBe(false);
    await wrapper
        .findAll('button')
        .find((button) => button.text() === 'Read')
        .trigger('click');
    expect(mocks.openExternalLink).toHaveBeenCalledWith('https://example.com');
});

it('shows request failure and retries with the refresh control', async () => {
    mocks.getInfoPush
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValueOnce({ json: [] });
    wrapper = mount(InfoPushDialog, {
        props: { isInfoPushDialogVisible: true }
    });
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toContain(
        'announcements.load_failed'
    );
    await wrapper
        .find('button[aria-label="announcements.refresh"]')
        .trigger('click');
    await flushPromises();
    expect(mocks.getInfoPush).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('announcements.empty');
});

it('opens referenced help articles and disables missing article targets', async () => {
    mocks.getInfoPush.mockResolvedValue({
        json: [
            {
                id: 'a',
                data: {
                    name: 'Article A',
                    article: {
                        moreInfoLinks: [
                            {
                                command: 'OpenHelpArticle',
                                parameters: ['b'],
                                name: 'Related article'
                            },
                            {
                                command: 'OpenHelpArticle',
                                parameters: ['missing'],
                                name: 'Unavailable article'
                            }
                        ]
                    }
                }
            },
            { id: 'b', data: { name: 'Article B' } }
        ]
    });
    const scrollIntoView = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
    wrapper = mount(InfoPushDialog, {
        props: { isInfoPushDialogVisible: true }
    });
    await flushPromises();
    await wrapper
        .findAll('button')
        .find((button) => button.text() === 'Related article')
        .trigger('click');
    expect(
        wrapper.find('details[data-id="b"]').attributes('open')
    ).toBeDefined();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(
        wrapper
            .findAll('button')
            .find((button) => button.text() === 'Unavailable article')
            .attributes('disabled')
    ).toBeDefined();
    expect(mocks.openExternalLink).not.toHaveBeenCalled();
});

it('ignores results after closing and logout, and fetches afresh when reopened', async () => {
    let resolve;
    mocks.getInfoPush.mockReturnValue(new Promise((r) => (resolve = r)));
    wrapper = mount(InfoPushDialog, {
        props: { isInfoPushDialogVisible: true }
    });
    await wrapper.setProps({ isInfoPushDialogVisible: false });
    resolve({ json: [{ id: 'old', data: { name: 'Old account news' } }] });
    await flushPromises();
    expect(wrapper.text()).not.toContain('Old account news');
    mocks.getInfoPush.mockResolvedValue({
        json: [{ id: 'new', data: { name: 'New news' } }]
    });
    await wrapper.setProps({ isInfoPushDialogVisible: true });
    await flushPromises();
    expect(wrapper.text()).toContain('New news');
    watchState.isLoggedIn = false;
    await flushPromises();
    expect(wrapper.text()).not.toContain('New news');
});
