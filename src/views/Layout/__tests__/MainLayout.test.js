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
        navWidth: ref(240),
        isNavCollapsed: ref(false),
        setNavCollapsed: (...a) => mocks.setNavCollapsed(...a),
        setNavWidth: (...a) => mocks.setNavWidth(...a)
    })
}));
vi.mock('../../../composables/useMainLayoutResizable', () => ({
    useMainLayoutResizable: () => ({
        asideDefaultSize: 30,
        asideMinSize: 0,
        asideMaxPx: 480,
        mainDefaultSize: 70,
        handleLayout: vi.fn(),
        isAsideCollapsed: () => false,
        isAsideCollapsedStatic: false,
        isSideBarTabShow: ref(true)
    })
}));
vi.mock('../../../components/ui/resizable', () => ({
    ResizablePanelGroup: { template: '<div><slot :layout="[]" /></div>' },
    ResizablePanel: { template: '<div><slot /></div>' },
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
    default: { template: '<div />' }
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
    default: { template: '<div />' }
}));
vi.mock('../../../components/onboarding/WhatsNewDialog.vue', () => ({
    default: { template: '<div />' }
}));
vi.mock('../../../components/onboarding/SpotlightDialog.vue', () => ({
    default: { template: '<div />' }
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

    it('keeps the global dialog mounts outside the resizable shell', () => {
        mocks.watchState.isLoggedIn = true;
        const wrapper = mount(MainLayout, {
            global: {
                stubs: {
                    RouterView: { template: '<div />' },
                    KeepAlive: { template: '<div><slot /></div>' }
                }
            }
        });

        expect(wrapper.findAll('[data-testid^="global-dialog-"]')).toHaveLength(
            13
        );
    });
});
