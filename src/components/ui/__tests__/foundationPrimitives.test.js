import { mount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';

import { Badge } from '../badge';
import { Button } from '../button';
import { Skeleton } from '../skeleton';
import { Surface } from '../surface';

describe('BetterVRCX foundation primitives', () => {
    describe('Surface', () => {
        test('renders base tier by default', () => {
            const wrapper = mount(Surface, {
                slots: { default: 'Base Surface' }
            });
            expect(wrapper.classes()).toContain('bv-surface-base');
            expect(wrapper.attributes('data-tier')).toBe('base');
            expect(wrapper.text()).toBe('Base Surface');
        });

        test('renders raised, floating, and overlay tiers', () => {
            const raised = mount(Surface, { props: { tier: 'raised' } });
            expect(raised.classes()).toContain('bv-surface-raised');

            const floating = mount(Surface, { props: { tier: 'floating' } });
            expect(floating.classes()).toContain('bv-surface-floating');

            const overlay = mount(Surface, { props: { tier: 'overlay' } });
            expect(overlay.classes()).toContain('bv-surface-overlay');
        });

        test('applies interactive state class when interactive is true', () => {
            const interactive = mount(Surface, {
                props: { tier: 'raised', interactive: true }
            });
            expect(interactive.classes()).toContain('bv-surface-raised');
            expect(interactive.classes()).toContain('bv-interactive');
        });
    });

    describe('Button', () => {
        test('renders with explicit GPU transitions rather than transition-all', () => {
            const wrapper = mount(Button, {
                slots: { default: 'Click Me' }
            });
            const classes = wrapper.classes().join(' ');
            expect(classes).not.toContain('transition-all');
            expect(classes).toContain('transition-');
            expect(wrapper.text()).toBe('Click Me');
        });

        test('handles disabled semantics cleanly', () => {
            const wrapper = mount(Button, {
                props: { disabled: true },
                slots: { default: 'Disabled Button' }
            });
            expect(wrapper.attributes('disabled')).toBeDefined();
            expect(wrapper.attributes('aria-disabled')).toBe('true');
            expect(wrapper.attributes('data-disabled')).toBe('');
        });
    });

    describe('Badge', () => {
        test('renders default and semantic tone variants', () => {
            const def = mount(Badge, { slots: { default: 'Default' } });
            expect(def.classes()).toContain('bg-primary');

            const accent = mount(Badge, {
                props: { variant: 'accent' },
                slots: { default: 'Accent' }
            });
            expect(accent.classes()).toContain('text-primary');

            const success = mount(Badge, {
                props: { variant: 'success' },
                slots: { default: 'Online' }
            });
            expect(success.classes()).toContain(
                'text-[var(--bv-status-online)]'
            );
        });
    });

    describe('Skeleton', () => {
        test('renders with bv-skeleton class', () => {
            const wrapper = mount(Skeleton);
            expect(wrapper.classes()).toContain('bv-skeleton');
        });
    });
});
