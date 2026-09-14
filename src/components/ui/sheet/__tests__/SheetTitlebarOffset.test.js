import { describe, expect, test } from 'vitest';
import { mount } from '@vue/test-utils';
import SheetContent from '../SheetContent.vue';
import SheetOverlay from '../SheetOverlay.vue';

describe('Sheet title bar offset styling', () => {
    test('SheetContent with side=right includes --bv-titlebar-height top offset and height calculation', () => {
        const wrapper = mount(SheetContent, {
            props: {
                side: 'right'
            },
            global: {
                stubs: {
                    DialogPortal: { template: '<div><slot /></div>' },
                    DialogContent: {
                        template:
                            '<div data-testid="dialog-content"><slot /></div>'
                    },
                    DialogClose: { template: '<button><slot /></button>' },
                    SheetOverlay: { template: '<div />' },
                    X: { template: '<svg />' }
                }
            }
        });

        const content = wrapper.find('[data-testid="dialog-content"]');
        expect(content.exists()).toBe(true);
        const classes = content.attributes('class');
        expect(classes).toContain('top-[var(--bv-titlebar-height,0px)]');
        expect(classes).toContain(
            'h-[calc(100vh-var(--bv-titlebar-height,0px))]'
        );
        expect(classes).toContain('right-0');
        expect(classes).toContain('bottom-0');
    });

    test('SheetContent with side=left includes --bv-titlebar-height top offset and height calculation', () => {
        const wrapper = mount(SheetContent, {
            props: {
                side: 'left'
            },
            global: {
                stubs: {
                    DialogPortal: { template: '<div><slot /></div>' },
                    DialogContent: {
                        template:
                            '<div data-testid="dialog-content"><slot /></div>'
                    },
                    DialogClose: { template: '<button><slot /></button>' },
                    SheetOverlay: { template: '<div />' },
                    X: { template: '<svg />' }
                }
            }
        });

        const content = wrapper.find('[data-testid="dialog-content"]');
        expect(content.exists()).toBe(true);
        const classes = content.attributes('class');
        expect(classes).toContain('top-[var(--bv-titlebar-height,0px)]');
        expect(classes).toContain(
            'h-[calc(100vh-var(--bv-titlebar-height,0px))]'
        );
        expect(classes).toContain('left-0');
        expect(classes).toContain('bottom-0');
    });

    test('SheetOverlay starts below --bv-titlebar-height', () => {
        const wrapper = mount(SheetOverlay, {
            global: {
                stubs: {
                    DialogOverlay: {
                        template:
                            '<div data-testid="dialog-overlay"><slot /></div>'
                    }
                }
            }
        });

        const overlay = wrapper.find('[data-testid="dialog-overlay"]');
        expect(overlay.exists()).toBe(true);
        const classes = overlay.attributes('class');
        expect(classes).toContain('top-[var(--bv-titlebar-height,0px)]');
        expect(classes).toContain('bottom-0');
        expect(classes).toContain('inset-x-0');
    });
});
