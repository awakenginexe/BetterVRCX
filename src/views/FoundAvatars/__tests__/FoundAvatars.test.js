import { mount, flushPromises } from '@vue/test-utils';
import { beforeEach, expect, it, vi } from 'vitest';
import { reactive, ref } from 'vue';
import en from '../../../localization/en.json';
const mocks = vi.hoisted(() => ({ showUserDialog: vi.fn() }));
vi.mock('../../../stores/settings/general', () => ({
    useGeneralSettingsStore: () => ({ disableGpuAcceleration: ref(false) })
}));
vi.mock('../../../coordinators/userCoordinator', () => mocks);
vi.mock('../../../stores/foundAvatars', () => ({
    useFoundAvatarsStore: () => store
}));
vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key) =>
            key.split('.').reduce((value, part) => value?.[part], en) || key
    })
}));
import FoundAvatars from '../FoundAvatars.vue';
const ID = 'avtr_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER = 'usr_11111111-1111-1111-1111-111111111111';
const store = reactive({
    entries: [],
    loading: false,
    error: false,
    importState: { status: 'idle' },
    autoLookupFriends: true,
    importHistory: vi.fn(),
    lookupAvatar: vi.fn(),
    changeIntoAvatar: vi.fn(),
    setAutoLookupFriends: vi.fn()
});
const record = () => ({
    id: ID,
    metadata: {},
    firstSeenAt: '2026-10-27T10:00:00Z',
    lastSeenAt: '2026-10-27T10:00:00Z',
    firstWearerId: null,
    wearers: [],
    source: 'log',
    lookupState: 'not_searched'
});
beforeEach(() => {
    vi.clearAllMocks();
    store.entries = [];
    store.loading = false;
    store.error = false;
    store.importState = { status: 'idle' };
    store.autoLookupFriends = true;
    store.changeIntoAvatar.mockResolvedValue('selected');
});

it('shows an honest empty state and offers local import', async () => {
    const wrapper = mount(FoundAvatars);
    expect(wrapper.text()).toContain('No avatars found yet');
    expect(store.importHistory).toHaveBeenCalledTimes(1);
    await wrapper.get('[data-action="import"]').trigger('click');
    expect(store.importHistory).toHaveBeenCalledTimes(2);
    wrapper.unmount();
});
it('opens local details without searching and keeps unknown wearer unlinked', async () => {
    store.entries = [record()];
    const wrapper = mount(FoundAvatars, { attachTo: document.body });
    await wrapper.get('[data-action="details"]').trigger('click');
    await flushPromises();
    expect(document.body.textContent).toContain('Unknown');
    expect(document.body.textContent).toContain(ID);
    expect(store.lookupAvatar).not.toHaveBeenCalled();
    expect(mocks.showUserDialog).not.toHaveBeenCalled();
    wrapper.unmount();
});
it('provides explicit lookup and local filtering', async () => {
    store.entries = [record()];
    const wrapper = mount(FoundAvatars);
    await wrapper.get('[data-action="lookup"]').trigger('click');
    expect(store.lookupAvatar).toHaveBeenCalledWith(ID);
    await wrapper.get('input[type="search"]').setValue('does not match');
    expect(wrapper.find('[data-action="details"]').exists()).toBe(false);
    wrapper.unmount();
});
it.each([
    ['not_found', 'Not found'],
    ['unavailable', 'Retry search']
])(
    'labels %s correctly and allows retry from the card and details',
    async (lookupState, label) => {
        store.entries = [{ ...record(), lookupState }];
        const wrapper = mount(FoundAvatars, { attachTo: document.body });
        const action = wrapper.get('[data-action="lookup"]');
        expect(action.text()).toBe(label);
        await action.trigger('click');
        expect(store.lookupAvatar).toHaveBeenCalledWith(ID);
        await wrapper.get('[data-action="details"]').trigger('click');
        await flushPromises();
        const detailAction = document.body.querySelector(
            '[data-slot="dialog-content"] [data-action="lookup"]'
        );
        expect(detailAction.textContent.trim()).toBe(label);
        detailAction.click();
        await flushPromises();
        expect(store.lookupAvatar).toHaveBeenCalledTimes(2);
        expect(store.changeIntoAvatar).not.toHaveBeenCalled();
        wrapper.unmount();
    }
);
it('replaces Search by ID with Change into avatar when public details become available', async () => {
    store.entries = [record()];
    const wrapper = mount(FoundAvatars);
    expect(wrapper.get('[data-action="lookup"]').text()).toBe('Search by ID');
    store.entries[0].metadata = {
        name: 'Public avatar',
        releaseStatus: 'public'
    };
    store.entries[0].lookupState = 'found';
    store.entries[0].publicVerifiedAt = new Date().toISOString();
    await flushPromises();
    expect(wrapper.find('[data-action="lookup"]').exists()).toBe(false);
    expect(wrapper.get('[data-action="change-avatar"]').text()).toBe(
        'Change into avatar'
    );
    await wrapper.get('[data-action="change-avatar"]').trigger('click');
    expect(store.changeIntoAvatar).toHaveBeenCalledWith(ID);
    expect(store.lookupAvatar).not.toHaveBeenCalled();
    wrapper.unmount();
});
it('shows failed card selection inline and disables it while verifying', async () => {
    store.entries = [
        {
            ...record(),
            metadata: { releaseStatus: 'public' },
            publicVerifiedAt: new Date().toISOString()
        }
    ];
    let finish;
    store.changeIntoAvatar.mockImplementation(
        () =>
            new Promise((resolve) => {
                finish = resolve;
            })
    );
    const wrapper = mount(FoundAvatars);
    await wrapper.get('[data-action="change-avatar"]').trigger('click');
    expect(
        wrapper.get('[data-action="change-avatar"]').attributes('disabled')
    ).toBeDefined();
    finish('not_public');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toBe(
        'This avatar is no longer public.'
    );
    expect(
        wrapper.get('[data-action="change-avatar"]').attributes('disabled')
    ).toBeUndefined();
    wrapper.unmount();
});
it('offers changing into a public avatar in details and reports failed verification', async () => {
    store.entries = [
        {
            ...record(),
            metadata: { releaseStatus: 'public' },
            publicVerifiedAt: new Date().toISOString()
        }
    ];
    let finish;
    store.changeIntoAvatar.mockImplementation(
        () =>
            new Promise((resolve) => {
                finish = resolve;
            })
    );
    const wrapper = mount(FoundAvatars, { attachTo: document.body });
    await wrapper.get('[data-action="details"]').trigger('click');
    await flushPromises();
    const changeButton = document.body.querySelector(
        '[data-slot="dialog-content"] [data-action="change-avatar"]'
    );
    expect(changeButton).not.toBeNull();
    changeButton.click();
    await flushPromises();
    expect(store.changeIntoAvatar).toHaveBeenCalledWith(ID);
    expect(changeButton.disabled).toBe(true);
    finish('not_public');
    await flushPromises();
    expect(document.body.textContent).toContain(
        'This avatar is no longer public.'
    );
    expect(changeButton.disabled).toBe(false);
    wrapper.unmount();
});
it.each(['not_searched', 'found', 'unavailable'])(
    'does not offer Change from historical public metadata alone: %s',
    async (lookupState) => {
        store.entries = [
            { ...record(), metadata: { releaseStatus: 'public' }, lookupState }
        ];
        const wrapper = mount(FoundAvatars, { attachTo: document.body });
        expect(wrapper.find('[data-action="change-avatar"]').exists()).toBe(
            false
        );
        await wrapper.get('[data-action="details"]').trigger('click');
        await flushPromises();
        expect(
            document.body.querySelector('[data-action="change-avatar"]')
        ).toBeNull();
        wrapper.unmount();
    }
);
it('returns to Search when public verification is cleared or older than five minutes', async () => {
    store.entries = [
        {
            ...record(),
            metadata: { releaseStatus: 'public' },
            publicVerifiedAt: new Date().toISOString()
        }
    ];
    const wrapper = mount(FoundAvatars);
    expect(wrapper.find('[data-action="change-avatar"]').exists()).toBe(true);
    store.entries[0].publicVerifiedAt = null;
    await flushPromises();
    expect(wrapper.find('[data-action="change-avatar"]').exists()).toBe(false);
    store.entries[0].publicVerifiedAt = new Date(
        Date.now() - 6 * 60_000
    ).toISOString();
    await flushPromises();
    expect(wrapper.find('[data-action="change-avatar"]').exists()).toBe(false);
    wrapper.unmount();
});
it('expires verified availability while the view remains open without making requests', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    store.entries = [
        {
            ...record(),
            metadata: { releaseStatus: 'public' },
            publicVerifiedAt: new Date().toISOString()
        }
    ];
    const wrapper = mount(FoundAvatars);
    try {
        expect(wrapper.find('[data-action="change-avatar"]').exists()).toBe(
            true
        );
        await vi.advanceTimersByTimeAsync(5 * 60_000);
        expect(wrapper.find('[data-action="change-avatar"]').exists()).toBe(
            false
        );
        expect(wrapper.find('[data-action="lookup"]').exists()).toBe(true);
        expect(store.lookupAvatar).not.toHaveBeenCalled();
        expect(store.changeIntoAvatar).not.toHaveBeenCalled();
    } finally {
        wrapper.unmount();
        vi.useRealTimers();
    }
});
it.each([undefined, 'private'])(
    'does not offer selecting saved avatars without public metadata: %s',
    async (releaseStatus) => {
        store.entries = [{ ...record(), metadata: { releaseStatus } }];
        const wrapper = mount(FoundAvatars, { attachTo: document.body });
        await wrapper.get('[data-action="details"]').trigger('click');
        await flushPromises();
        expect(
            document.body.querySelector('[data-action="change-avatar"]')
        ).toBeNull();
        expect(store.changeIntoAvatar).not.toHaveBeenCalled();
        wrapper.unmount();
    }
);
it('opens only known wearer profiles and exposes the automatic lookup setting', async () => {
    store.entries = [
        {
            ...record(),
            metadata: { name: 'Avatar' },
            wearers: [
                {
                    userId: USER,
                    displayName: 'Friend',
                    firstSeenAt: null,
                    lastSeenAt: '2026-10-27T10:00:00Z'
                }
            ]
        }
    ];
    const wrapper = mount(FoundAvatars, { attachTo: document.body });
    await wrapper.get('[role="switch"]').trigger('click');
    expect(store.setAutoLookupFriends).toHaveBeenCalledWith(false);
    await wrapper.get('[data-action="details"]').trigger('click');
    await flushPromises();
    const wearer = document.body.querySelector('[data-action="wearer"]');
    expect(wearer).not.toBeNull();
    wearer.click();
    await flushPromises();
    expect(mocks.showUserDialog).toHaveBeenCalledWith(USER);
    wrapper.unmount();
});
it('loads the remaining cards without rendering the entire history initially', async () => {
    store.entries = Array.from({ length: 61 }, (_, index) => ({
        ...record(),
        id: `avtr_${index.toString(16).padStart(8, '0')}-aaaa-aaaa-aaaa-aaaaaaaaaaaa`
    }));
    const wrapper = mount(FoundAvatars);
    expect(wrapper.findAll('[data-action="details"]')).toHaveLength(60);
    await wrapper
        .findAll('button')
        .find((button) => button.text() === 'Load more')
        .trigger('click');
    expect(wrapper.findAll('[data-action="details"]')).toHaveLength(61);
    wrapper.unmount();
});

it('renders loading, storage error and import failure states', () => {
    store.loading = true;
    store.error = true;
    store.importState = { status: 'error' };
    const wrapper = mount(FoundAvatars);
    expect(wrapper.text()).toContain('Loading avatar history');
    expect(wrapper.text()).toContain('Could not load or save avatar history');
    expect(wrapper.text()).toContain('History import failed');
    wrapper.unmount();
});
