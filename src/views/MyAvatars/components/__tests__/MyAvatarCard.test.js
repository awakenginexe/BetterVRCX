import { describe, expect, test, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key) => key
    })
}));

const showFullscreenImageDialogMock = vi.fn();
const openFolderGenericMock = vi.fn();

vi.mock('../../../../shared/utils', () => ({
    formatDateFilter: () => 'formatted-date',
    getAvailablePlatforms: () => ({ isPC: true, isQuest: true, isIos: false }),
    getPlatformInfo: () => ({
        pc: { performanceRating: 'Good' },
        android: { performanceRating: 'Medium' },
        ios: { performanceRating: '' }
    }),
    timeToText: () => '1h',
    checkVRChatCache: vi.fn().mockResolvedValue({
        Item1: 26214400, // 25.0 MB
        Item2: false,
        Item3: 'C:\\VRChat\\Cache\\item'
    }),
    openFolderGeneric: (...args) => openFolderGenericMock(...args)
}));

vi.mock('@/stores', () => ({
    useGalleryStore: () => ({
        showFullscreenImageDialog: showFullscreenImageDialogMock
    })
}));

vi.mock('@/coordinators/gameCoordinator', () => ({
    runDeleteVRChatCacheFlow: vi.fn()
}));

vi.mock('../../../../shared/constants', () => ({
    getTagColor: () => ({
        name: 'blue',
        bg: 'hsl(210 100% 50% / 0.2)',
        text: 'hsl(210 100% 40%)'
    })
}));

vi.mock('@/components/ui/context-menu', () => ({
    ContextMenu: { template: '<div><slot /></div>' },
    ContextMenuTrigger: { template: '<div><slot /></div>' },
    ContextMenuContent: { template: '<div><slot /></div>' },
    ContextMenuSeparator: { template: '<hr />' },
    ContextMenuItem: {
        props: ['disabled'],
        emits: ['click'],
        template:
            '<button data-testid="ctx-item" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
    }
}));

vi.mock('@/components/ui/hover-card', () => ({
    HoverCard: {
        props: ['open'],
        emits: ['update:open'],
        template: '<div><slot /></div>'
    },
    HoverCardTrigger: { template: '<div><slot /></div>' },
    HoverCardContent: { template: '<div><slot /></div>' }
}));

vi.mock('@/components/ui/badge', () => ({
    Badge: { template: '<span data-testid="badge"><slot /></span>' }
}));

vi.mock('@/components/ui/button', () => ({
    Button: {
        emits: ['click'],
        template:
            '<button data-testid="button" @click="$emit(\'click\')"><slot /></button>'
    }
}));

vi.mock('@/components/ui/card', () => ({
    Card: { template: '<div data-testid="card"><slot /></div>' }
}));

vi.mock('@/components/ui/tooltip', () => ({
    TooltipWrapper: { template: '<div><slot /></div>' }
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
    DropdownMenu: { template: '<div><slot /></div>' },
    DropdownMenuTrigger: { template: '<div><slot /></div>' },
    DropdownMenuContent: { template: '<div><slot /></div>' },
    DropdownMenuItem: { template: '<div><slot /></div>' },
    DropdownMenuSeparator: { template: '<hr />' }
}));

vi.mock('@/components/ui/separator', () => ({
    Separator: { template: '<hr />' }
}));

vi.mock('lucide-vue-next', () => ({
    Apple: { template: '<i />' },
    Check: { template: '<i />' },
    Clock: { template: '<i />' },
    Copy: { template: '<i />' },
    ExternalLink: { template: '<i />' },
    Eye: { template: '<i />' },
    HardDrive: { template: '<i />' },
    Image: { template: '<i />' },
    Lock: { template: '<i />' },
    Monitor: { template: '<i />' },
    MoreVertical: { template: '<i />' },
    Pencil: { template: '<i />' },
    RefreshCw: { template: '<i />' },
    Smartphone: { template: '<i />' },
    Tag: { template: '<i />' },
    Trash2: { template: '<i />' },
    User: { template: '<i />' },
    ZoomIn: { template: '<i />' }
}));

import MyAvatarCard from '../MyAvatarCard.vue';

function mountCard(props = {}) {
    return mount(MyAvatarCard, {
        props: {
            avatar: {
                id: 'avtr_1',
                name: 'Avatar One',
                thumbnailImageUrl: 'https://example.com/a.jpg',
                releaseStatus: 'public',
                unityPackages: [],
                $tags: [{ tag: 'fun' }],
                updated_at: '2025-01-01T00:00:00.000Z',
                created_at: '2024-01-01T00:00:00.000Z',
                version: 1,
                ...props.avatar
            },
            currentAvatarId: '',
            cardScale: 0.6,
            ...props
        }
    });
}

describe('MyAvatarCard.vue', () => {
    test('renders avatar name and tags', () => {
        const wrapper = mountCard();

        expect(wrapper.text()).toContain('Avatar One');
        expect(wrapper.text()).toContain('fun');
    });

    test('emits click when card wrapper is clicked', async () => {
        const wrapper = mountCard();

        await wrapper.find('.avatar-card-wrapper').trigger('click');

        expect(wrapper.emitted('click')).toBeTruthy();
        expect(wrapper.emitted('click')).toHaveLength(1);
    });

    test('emits context action from menu item', async () => {
        const wrapper = mountCard();
        const detailsItem = wrapper
            .findAll('[data-testid="ctx-item"]')
            .find((node) =>
                node.text().includes('dialog.avatar.actions.view_details')
            );

        expect(detailsItem).toBeTruthy();
        await detailsItem.trigger('click');

        expect(wrapper.emitted('context-action')).toBeTruthy();
        expect(wrapper.emitted('context-action')[0]).toEqual([
            'details',
            expect.objectContaining({ id: 'avtr_1' })
        ]);
    });

    test('disables wear action when avatar is active', () => {
        const wrapper = mountCard({ currentAvatarId: 'avtr_1' });
        const wearItem = wrapper
            .findAll('[data-testid="ctx-item"]')
            .find((node) =>
                node.text().includes('view.favorite.select_avatar_tooltip')
            );

        expect(wearItem.attributes('disabled')).toBeDefined();
    });

    test('renders cache badge and opens cache folder when clicked', async () => {
        const wrapper = mountCard();
        await flushPromises();

        const cacheBadge = wrapper.find('[data-testid="cache-badge"]');
        expect(cacheBadge.exists()).toBe(true);
        expect(cacheBadge.text()).toContain('25.0 MB');

        await cacheBadge.trigger('click');
        expect(openFolderGenericMock).toHaveBeenCalledWith(
            'C:\\VRChat\\Cache\\item'
        );
    });

    test('opens fullscreen image dialog when thumbnail is clicked', async () => {
        const wrapper = mountCard({
            avatar: {
                imageUrl: 'https://example.com/full.png'
            }
        });

        await wrapper.find('.aspect-4\\/3').trigger('click');
        expect(showFullscreenImageDialogMock).toHaveBeenCalledWith(
            'https://example.com/full.png'
        );
    });
});
