import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';

const mocks = vi.hoisted(() => ({
    closeMainDialog: vi.fn(),
    handleBreadcrumbClick: vi.fn(),
    dialogCrumbs: {
        value: [
            { type: 'user', id: 'u1', label: 'User' },
            { type: 'world', id: 'w1', label: 'World' }
        ]
    },
    userVisible: { value: true },
    worldVisible: { value: false },
    displayVRCProfileBackgrounds: { value: false },
    isDarkMode: { value: true },
    profileBackgroundOpacity: { value: 0.5 },
    userPublicProfileRef: {
        value: null
    }
}));

vi.mock('pinia', async (i) => ({ ...(await i()), storeToRefs: (s) => s }));
vi.mock('@/stores', () => ({
    useUiStore: () => ({
        dialogCrumbs: mocks.dialogCrumbs.value,
        closeMainDialog: (...a) => mocks.closeMainDialog(...a),
        handleBreadcrumbClick: (...a) => mocks.handleBreadcrumbClick(...a)
    }),
    useUserStore: () => ({
        userDialog: {
            visible: mocks.userVisible.value,
            publicProfileRef: mocks.userPublicProfileRef.value
        }
    }),
    useWorldStore: () => ({
        worldDialog: { visible: mocks.worldVisible.value }
    }),

    useAvatarStore: () => ({ avatarDialog: { visible: false } }),
    useGroupStore: () => ({ groupDialog: { visible: false } }),
    useAppearanceSettingsStore: () => ({
        displayVRCProfileBackgrounds: mocks.displayVRCProfileBackgrounds.value,
        isDarkMode: mocks.isDarkMode.value,
        profileBackgroundOpacity: mocks.profileBackgroundOpacity.value
    }),
    useInstanceStore: () => ({
        previousInstancesInfoDialog: ref({ visible: false }),
        previousInstancesListDialog: ref({ visible: false, variant: 'user' })
    })
}));
vi.mock('@/components/ui/dialog', () => ({
    Dialog: { template: '<div><slot /></div>' },
    DialogContent: {
        props: ['showCloseButton'],
        template: '<div v-bind="$attrs"><slot /></div>'
    }
}));
vi.mock('@/components/ui/breadcrumb', () => ({
    Breadcrumb: { template: '<div><slot /></div>' },
    BreadcrumbList: { template: '<div><slot /></div>' },
    BreadcrumbItem: { template: '<div><slot /></div>' },
    BreadcrumbLink: { template: '<div><slot /></div>' },
    BreadcrumbSeparator: { template: '<span>/</span>' },
    BreadcrumbPage: { template: '<span><slot /></span>' },
    BreadcrumbEllipsis: { template: '<span>...</span>' }
}));
vi.mock('@/components/ui/dropdown-menu', () => ({
    DropdownMenu: { template: '<div><slot /></div>' },
    DropdownMenuTrigger: { template: '<div><slot /></div>' },
    DropdownMenuContent: { template: '<div><slot /></div>' },
    DropdownMenuItem: {
        emits: ['click'],
        template:
            '<button data-testid="crumb-dd" @click="$emit(\'click\')"><slot /></button>'
    }
}));
vi.mock('@/components/ui/button', () => ({
    Button: {
        emits: ['click'],
        template:
            '<button data-testid="btn" @click="$emit(\'click\')"><slot /></button>'
    }
}));
vi.mock('@/components/ui/tooltip', () => ({
    TooltipWrapper: { template: '<div><slot /></div>' }
}));
vi.mock('lucide-vue-next', () => ({ ArrowLeft: { template: '<i />' } }));
vi.mock('../AvatarDialog/AvatarDialog.vue', () => ({
    default: { template: '<div />' }
}));
vi.mock('../GroupDialog/GroupDialog.vue', () => ({
    default: { template: '<div />' }
}));
vi.mock('../PreviousInstancesDialog/PreviousInstancesInfoDialog.vue', () => ({
    default: { template: '<div />' }
}));
vi.mock('../PreviousInstancesDialog/PreviousInstancesListDialog.vue', () => ({
    default: { template: '<div />' }
}));
vi.mock('../UserDialog/UserDialog.vue', () => ({
    default: { template: '<div data-testid="user-dialog" v-bind="$attrs" />' }
}));
vi.mock('../WorldDialog/WorldDialog.vue', () => ({
    default: { template: '<div />' }
}));

import MainDialogContainer from '../MainDialogContainer.vue';

describe('MainDialogContainer.vue', () => {
    beforeEach(() => {
        mocks.handleBreadcrumbClick.mockClear();
        mocks.dialogCrumbs.value = [
            { type: 'user', id: 'u1', label: 'User' },
            { type: 'world', id: 'w1', label: 'World' }
        ];
        mocks.userVisible.value = true;
        mocks.displayVRCProfileBackgrounds.value = false;
        mocks.userPublicProfileRef.value = null;
    });

    it('applies the entity dialog shell to the active user dialog', () => {
        const wrapper = mount(MainDialogContainer);
        expect(wrapper.get('.bv-dialog-shell').exists()).toBe(true);
        expect(wrapper.get('.bv-dialog-breadcrumbs').exists()).toBe(true);
        expect(wrapper.get('[data-testid="user-dialog"]').classes()).toContain(
            'bv-entity-dialog'
        );
    });

    it('renders active dialog and handles breadcrumb back click', async () => {
        const wrapper = mount(MainDialogContainer);
        expect(wrapper.find('[data-testid="user-dialog"]').exists()).toBe(true);

        await wrapper.get('[data-testid="btn"]').trigger('click');
        expect(mocks.handleBreadcrumbClick).toHaveBeenCalledWith(0);
    });

    it('does not apply profile backdrop when displayVRCProfileBackgrounds is false', () => {
        mocks.displayVRCProfileBackgrounds.value = false;
        mocks.userPublicProfileRef.value = {
            backgroundType: 'texture',
            backgroundTextureId: 'filigree'
        };

        const wrapper = mount(MainDialogContainer);
        const dialogContent = wrapper.find('.bv-dialog-shell');
        expect(dialogContent.attributes('style') || '').not.toContain('url(');
        expect(dialogContent.attributes('data-has-backdrop')).toBeUndefined();
        expect(dialogContent.classes()).not.toContain(
            'bv-dialog-shell--has-backdrop'
        );
    });

    it('resolves known texture backdrop from profileBackgrounds when displayVRCProfileBackgrounds is true', () => {
        mocks.displayVRCProfileBackgrounds.value = true;
        mocks.userPublicProfileRef.value = {
            backgroundType: 'texture',
            backgroundTextureId: 'filigree'
        };

        const wrapper = mount(MainDialogContainer);
        const dialogContent = wrapper.find('.bv-dialog-shell');
        const style = dialogContent.attributes('style') || '';
        expect(style).toContain('url(');
        expect(style).toContain('BG_Cascade.png');
        expect(dialogContent.attributes('data-has-backdrop')).toBe('true');
        expect(dialogContent.classes()).toContain(
            'bv-dialog-shell--has-backdrop'
        );
    });

    it('generates gradient backdrop when displayVRCProfileBackgrounds is true and backgroundType is gradient', () => {
        mocks.displayVRCProfileBackgrounds.value = true;
        mocks.userPublicProfileRef.value = {
            backgroundType: 'gradient',
            backgroundGradientTop: 'ff0000',
            backgroundGradientBottom: '0000ff'
        };

        const wrapper = mount(MainDialogContainer);
        const dialogContent = wrapper.find('.bv-dialog-shell');
        const style = dialogContent.attributes('style') || '';
        expect(style).toContain('linear-gradient(');
        expect(dialogContent.attributes('data-has-backdrop')).toBe('true');
        expect(dialogContent.classes()).toContain(
            'bv-dialog-shell--has-backdrop'
        );
    });

    it('falls back safely without background image when texture is unknown', () => {
        mocks.displayVRCProfileBackgrounds.value = true;
        mocks.userPublicProfileRef.value = {
            backgroundType: 'texture',
            backgroundTextureId: 'unknown_texture_id_123'
        };

        const wrapper = mount(MainDialogContainer);
        const dialogContent = wrapper.find('.bv-dialog-shell');
        const style = dialogContent.attributes('style') || '';
        expect(style).not.toContain('url(');
        expect(style).toContain('overflow: hidden');
        expect(dialogContent.attributes('data-has-backdrop')).toBeUndefined();
        expect(dialogContent.classes()).not.toContain(
            'bv-dialog-shell--has-backdrop'
        );
    });

    it('returns empty backdrop style when active dialog is not user', () => {
        mocks.userVisible.value = false;
        mocks.worldVisible.value = true;
        mocks.displayVRCProfileBackgrounds.value = true;
        mocks.dialogCrumbs.value = [
            { type: 'world', id: 'w1', label: 'World' }
        ];
        mocks.userPublicProfileRef.value = {
            backgroundType: 'texture',
            backgroundTextureId: 'filigree'
        };

        const wrapper = mount(MainDialogContainer);
        const dialogContent = wrapper.find('.bv-dialog-shell');
        const style = dialogContent.attributes('style') || '';
        expect(style).not.toContain('url(');
    });
});
