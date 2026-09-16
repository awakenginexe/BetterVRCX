import { beforeEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { reactive } from 'vue';
const mocks = vi.hoisted(() => ({
    db: vi.fn(),
    fetch: vi.fn(),
    open: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    stores: {}
}));
vi.mock('../../../stores', () => ({
    useWorldStore: () => mocks.stores.world,
    useFavoriteStore: () => mocks.stores.favorite,
    useUserStore: () => mocks.stores.user
}));
vi.mock('../../../services/database', () => ({
    database: { getRecentWorlds: mocks.db }
}));
vi.mock('../../../services/config', () => ({
    default: { getString: mocks.get, setString: mocks.set }
}));
vi.mock('../../../api', () => ({ queryRequest: { fetch: mocks.fetch } }));
vi.mock('../../../coordinators/worldCoordinator', () => ({
    showWorldDialog: mocks.open
}));
vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key, p) => (p ? key + JSON.stringify(p) : key) })
}));
import WorldHub from '../WorldHub.vue';
beforeEach(() => {
    vi.clearAllMocks();
    mocks.stores.world = reactive({ cachedWorlds: new Map() });
    mocks.stores.favorite = reactive({
        favoriteWorlds: [],
        localWorldFavorites: {}
    });
    mocks.stores.user = reactive({ currentUser: { id: 'usr_me' } });
    mocks.db.mockResolvedValue([]);
    mocks.get.mockResolvedValue(null);
    mocks.set.mockResolvedValue();
    mocks.fetch.mockResolvedValue({ json: [] });
});
it('defaults to Recently Visited with its empty state', async () => {
    const w = mount(WorldHub, { global: { stubs: { RouterLink: true } } });
    await flushPromises();
    expect(w.findAll('h2').map((x) => x.text())).toEqual(['world_hub.recent']);
    expect(w.text()).toContain('world_hub.empty_recent');
    w.unmount();
});
it('renders database visits immediately and opens the normal World Dialog', async () => {
    mocks.db.mockResolvedValue([
        {
            worldId: 'wrld_a',
            worldName: 'Private visit',
            visitCount: 3,
            totalTime: 9000,
            lastVisit: '2026-09-15'
        }
    ]);
    const w = mount(WorldHub, { global: { stubs: { RouterLink: true } } });
    await flushPromises();
    await w.get('[data-world-id="wrld_a"]').trigger('click');
    expect(mocks.open).toHaveBeenCalledWith('wrld_a');
    expect(w.text()).toContain('Private visit');
    w.unmount();
});
it('deduplicates favorite/history enrichment and detects later cached favorite updates', async () => {
    mocks.stores.favorite.favoriteWorlds = [
        { ref: { id: 'wrld_a', name: 'A', version: 1 } }
    ];
    mocks.stores.world.cachedWorlds.set('wrld_a', {
        id: 'wrld_a',
        name: 'A',
        version: 1
    });
    mocks.db.mockResolvedValue([{ worldId: 'wrld_a', worldName: 'A' }]);
    const w = mount(WorldHub, {
        props: { section: 'updated' },
        global: { stubs: { RouterLink: true } }
    });
    await flushPromises();
    expect(w.get('[data-section="updated"]').text()).toContain(
        'world_hub.empty_updated'
    );
    expect(
        mocks.fetch.mock.calls.filter(([key]) => key === 'world.dialog')
    ).toHaveLength(1);
    mocks.stores.world.cachedWorlds.set('wrld_a', {
        id: 'wrld_a',
        name: 'A',
        version: 2
    });
    await flushPromises();
    expect(
        w
            .get('[data-section="updated"]')
            .find('[data-world-id="wrld_a"]')
            .exists()
    ).toBe(true);
    expect(
        mocks.set.mock.calls.every(([, value]) => !value.includes('"name"'))
    ).toBe(true);
    w.unmount();
});
it('API and artwork failures do not erase database cards', async () => {
    mocks.fetch.mockRejectedValue(new Error('unavailable'));
    mocks.db.mockResolvedValue([
        { worldId: 'wrld_a', worldName: 'Offline metadata' }
    ]);
    const w = mount(WorldHub, { global: { stubs: { RouterLink: true } } });
    await flushPromises();
    expect(w.text()).toContain('Offline metadata');
    w.unmount();
});

it('converts existing visit milliseconds to hours', async () => {
    mocks.db.mockResolvedValue([
        { worldId: 'wrld_a', worldName: 'A', visitCount: 1, totalTime: 3600000 }
    ]);
    const w = mount(WorldHub, { global: { stubs: { RouterLink: true } } });
    await flushPromises();
    expect(w.text()).toContain('world_hub.hours{"count":1}');
    w.unmount();
});

it('loads saved markers per account and acknowledges a detected update on opening', async () => {
    mocks.get.mockResolvedValue(
        JSON.stringify({ wrld_a: { version: 1, updated: false } })
    );
    mocks.stores.favorite.favoriteWorlds = [
        { ref: { id: 'wrld_a', name: 'A', version: 2 } }
    ];
    const w = mount(WorldHub, {
        props: { section: 'updated' },
        global: { stubs: { RouterLink: true } }
    });
    await flushPromises();
    expect(mocks.get).toHaveBeenCalledWith(
        'BetterVRCX_worldHubMarkers_usr_me',
        '{}'
    );
    await w
        .get('[data-section="updated"] [data-world-id="wrld_a"]')
        .trigger('click');
    await flushPromises();
    expect(w.get('[data-section="updated"]').text()).toContain(
        'world_hub.empty_updated'
    );
    expect(JSON.parse(mocks.set.mock.calls.at(-1)[1]).wrld_a.updated).toBe(
        false
    );
    w.unmount();
});
it('late account initialization cannot overwrite the next account', async () => {
    let resolveOld;
    mocks.get
        .mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolveOld = resolve;
                })
        )
        .mockResolvedValue('{}');
    const w = mount(WorldHub, { global: { stubs: { RouterLink: true } } });
    mocks.stores.user.currentUser = { id: 'usr_next' };
    await flushPromises();
    resolveOld('{"wrld_old":{"version":1}}');
    await flushPromises();
    expect(mocks.set.mock.calls.some(([key]) => key.endsWith('usr_me'))).toBe(
        false
    );
    w.unmount();
});

it.each(['recent', 'updated', 'library'])(
    'renders only the selected %s subpage',
    async (section) => {
        const w = mount(WorldHub, {
            props: { section },
            global: { stubs: { RouterLink: true } }
        });
        await flushPromises();
        expect(
            w.findAll('[data-section]').map((e) => e.attributes('data-section'))
        ).toEqual([section]);
        w.unmount();
    }
);

it('never requests the removed discovery feed', async () => {
    const w = mount(WorldHub, { global: { stubs: { RouterLink: true } } });
    await flushPromises();
    expect(mocks.fetch.mock.calls.some(([key]) => key === 'worldsByUser')).toBe(
        false
    );
    w.unmount();
});
