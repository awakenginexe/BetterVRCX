import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';

const mocks = vi.hoisted(() => ({
    replace: vi.fn(),
    setNavCollapsed: vi.fn(),
    setNavWidth: vi.fn(),
    watchState: { isLoggedIn: false }
}));

vi.mock('pinia', async (i) => ({ ...(await i()), storeToRefs: (s) => s }));
vi.mock('vue-router', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useRouter: () => ({ replace: (...a) => mocks.replace(...a) })
    };
});
vi.mock('../../../services/watchState', () => ({
    watchState: mocks.watchState
}));
vi.mock('../../../stores', () => ({
    useAppearanceSettingsStore: () => ({
        navWidth: ref(220),
        isNavCollapsed: ref(false),
        isRightSidebarCollapsed: ref(false),
        setNavCollapsed: (...a) => mocks.setNavCollapsed(...a),
        setNavWidth: (...a) => mocks.setNavWidth(...a)
    })
}));
vi.mock('../../../composables/useMainLayoutResizable', () => ({
    useMainLayoutResizable: () => ({
        asideDefaultSize: 260,
        asideMinSize: 260,
        asideMaxSize: 700,
        asideCollapsedSize: 60,
        asideSizeUnit: 'px',
        handleLayout: vi.fn(),
        isAsideCollapsedStatic: ref(true),
        isSideBarTabShow: ref(true)
    })
}));
vi.mock('../../../components/ui/resizable', () => ({
    ResizablePanelGroup: {
        template: '<div><slot :layout="[]" /></div>'
    },
    ResizablePanel: {
        props: [
            'id',
            'defaultSize',
            'minSize',
            'maxSize',
            'collapsedSize',
            'sizeUnit',
            'order'
        ],
        template: `
            <div
                data-testid="resizable-panel"
                :id="id"
                :data-default-size="defaultSize"
                :data-min-size="minSize"
                :data-max-size="maxSize"
                :data-collapsed-size="collapsedSize"
                :data-size-unit="sizeUnit"
                :data-order="order">
                <slot />
            </div>
        `
    },
    ResizableHandle: { template: '<div />' }
}));
vi.mock('../../../components/ui/sidebar', () => ({
    SidebarProvider: { template: '<div><slot /></div>' },
    SidebarInset: { template: '<div><slot /></div>' }
}));
vi.mock('../../../components/nav-menu/NavMenu.vue', () => ({
    default: { template: '<div />' }
}));
vi.mock('../../Sidebar/Sidebar.vue', () => ({
    default: {
        props: ['compact'],
        template: '<div data-testid="right-sidebar" :data-compact="compact" />'
    }
}));
vi.mock('../../../components/StatusBar.vue', () => ({
    default: { template: '<div />' }
}));
vi.mock('../../../components/dialogs/MainDialogContainer.vue', () => ({
    default: { template: '<div data-testid="global-dialog-main" />' }
}));
vi.mock('../../../components/FullscreenImagePreview.vue', () => ({
    default: { template: '<div data-testid="global-dialog-image-preview" />' }
}));
vi.mock('../../../components/dialogs/ChooseFavoriteGroupDialog.vue', () => ({
    default: { template: '<div data-testid="global-dialog-choose-favorite" />' }
}));
vi.mock('../../../components/dialogs/LaunchDialog.vue', () => ({
    default: { template: '<div data-testid="global-dialog-launch" />' }
}));
vi.mock('../../Settings/dialogs/LaunchOptionsDialog.vue', () => ({
    default: { template: '<div data-testid="global-dialog-launch-options" />' }
}));
vi.mock('../../Favorites/dialogs/FriendImportDialog.vue', () => ({
    default: { template: '<div data-testid="global-dialog-friend-import" />' }
}));
vi.mock('../../Favorites/dialogs/WorldImportDialog.vue', () => ({
    default: { template: '<div data-testid="global-dialog-world-import" />' }
}));
vi.mock('../../Favorites/dialogs/AvatarImportDialog.vue', () => ({
    default: { template: '<div data-testid="global-dialog-avatar-import" />' }
}));
vi.mock(
    '../../../components/dialogs/GroupDialog/GroupMemberModerationDialog.vue',
    () => ({
        default: {
            template: '<div data-testid="global-dialog-group-moderation" />'
        }
    })
);
vi.mock('../../../components/dialogs/InviteGroupDialog.vue', () => ({
    default: { template: '<div data-testid="global-dialog-invite-group" />' }
}));
vi.mock('../../Settings/dialogs/VRChatConfigDialog.vue', () => ({
    default: { template: '<div data-testid="global-dialog-vrchat-config" />' }
}));
vi.mock('../../Settings/dialogs/PrimaryPasswordDialog.vue', () => ({
    default: {
        template: '<div data-testid="global-dialog-primary-password" />'
    }
}));
vi.mock('../../../components/dialogs/SendBoopDialog.vue', () => ({
    default: { template: '<div data-testid="global-dialog-send-boop" />' }
}));
vi.mock('../../Settings/dialogs/ChangelogDialog.vue', () => ({
    default: { template: '<div data-testid="global-dialog-changelog" />' }
}));
vi.mock('../../Tools/components/GlobalToolsDialogs.vue', () => ({
    default: { template: '<div data-testid="global-dialog-tools" />' }
}));
vi.mock('../../../components/onboarding/WhatsNewDialog.vue', () => ({
    default: { template: '<div data-testid="global-dialog-whats-new" />' }
}));
vi.mock('../../../components/onboarding/SpotlightDialog.vue', () => ({
    default: { template: '<div data-testid="global-dialog-spotlight" />' }
}));

import MainLayout from '../MainLayout.vue';

describe('MainLayout.vue', () => {
    it('redirects to login when not logged in', () => {
        mocks.watchState.isLoggedIn = false;
        mount(MainLayout, {
            global: {
                stubs: {
                    RouterView: { template: '<div />' },
                    KeepAlive: { template: '<div><slot /></div>' }
                }
            }
        });
        expect(mocks.replace).toHaveBeenCalledWith({ name: 'login' });
    });

    it('leaves the center flexible around the 260px/60px right-rail contract', () => {
        mocks.watchState.isLoggedIn = true;
        const wrapper = mount(MainLayout, {
            global: {
                stubs: {
                    RouterView: { template: '<div />' },
                    KeepAlive: { template: '<div><slot /></div>' }
                }
            }
        });

        const panels = wrapper.findAll('[data-testid="resizable-panel"]');
        const center = panels.find(
            (panel) => panel.attributes('data-order') === '1'
        );
        const rightRail = panels.find(
            (panel) => panel.attributes('data-order') === '2'
        );

        expect(center.attributes('id')).toBe('main-content-panel');
        expect(center.attributes('data-default-size')).toBeUndefined();
        expect(rightRail.attributes('id')).toBe('right-sidebar-panel');
        expect(rightRail.attributes()).toMatchObject({
            'data-default-size': '260',
            'data-min-size': '260',
            'data-max-size': '700',
            'data-collapsed-size': '60',
            'data-size-unit': 'px'
        });
        expect(
            wrapper.get('[data-testid="right-sidebar"]').attributes()
        ).toMatchObject({
            'data-compact': 'true'
        });
    });

    it('keeps every global dialog mount outside routed content', () => {
        mocks.watchState.isLoggedIn = true;
        const wrapper = mount(MainLayout, {
            global: {
                stubs: {
                    RouterView: { template: '<div />' },
                    KeepAlive: { template: '<div><slot /></div>' }
                }
            }
        });

        const routedContent = wrapper.get('[data-shell-region="content"]');
        const expectedDialogIds = [
            'global-dialog-main',
            'global-dialog-invite-group',
            'global-dialog-image-preview',
            'global-dialog-launch',
            'global-dialog-launch-options',
            'global-dialog-friend-import',
            'global-dialog-world-import',
            'global-dialog-avatar-import',
            'global-dialog-choose-favorite',
            'global-dialog-vrchat-config',
            'global-dialog-primary-password',
            'global-dialog-send-boop',
            'global-dialog-tools',
            'global-dialog-changelog',
            'global-dialog-whats-new',
            'global-dialog-spotlight'
        ];

        expect(wrapper.findAll('[data-testid^="global-dialog-"]')).toHaveLength(
            expectedDialogIds.length
        );
        for (const testId of expectedDialogIds) {
            const dialog = wrapper.get(`[data-testid="${testId}"]`);
            expect(routedContent.element.contains(dialog.element)).toBe(false);
        }
    });
});
