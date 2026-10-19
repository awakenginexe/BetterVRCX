import { expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { reactive } from 'vue';
const mocks = vi.hoisted(() => ({ showGalleryPage: vi.fn() }));
vi.mock('../../../stores/inventoryBundle', () => ({
    useInventoryBundleStore: () => store
}));
vi.mock('../../../stores/gallery', () => ({ useGalleryStore: () => mocks }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock('@/components/ui/dialog', () =>
    Object.fromEntries(
        [
            'Dialog',
            'DialogContent',
            'DialogHeader',
            'DialogTitle',
            'DialogDescription',
            'DialogFooter'
        ].map((name) => [name, { template: '<div><slot /></div>' }])
    )
);
vi.mock('@/components/ui/button', () => ({
    Button: { template: '<button><slot /></button>' }
}));
import InventoryBundleDialog from '../InventoryBundleDialog.vue';
const store = reactive({
    inventoryBundleDialog: {
        visible: true,
        bundles: [
            {
                id: 'a',
                name: 'Gift',
                description: 'A bundle',
                imageUrl: 'file:///C:/secret'
            }
        ]
    }
});

it('lists read-only bundles and closes the notification when opening the gallery', async () => {
    const wrapper = mount(InventoryBundleDialog);
    expect(wrapper.text()).toContain('Gift');
    expect(wrapper.find('img').exists()).toBe(false);
    await wrapper
        .findAll('button')
        .find((button) => button.text() === 'inventory_bundles.open_inventory')
        .trigger('click');
    expect(mocks.showGalleryPage).toHaveBeenCalledTimes(1);
    expect(store.inventoryBundleDialog.visible).toBe(false);
    wrapper.unmount();
});
