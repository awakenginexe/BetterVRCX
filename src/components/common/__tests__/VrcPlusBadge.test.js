import { describe, expect, test, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import VrcPlusBadge from '../VrcPlusBadge.vue';

vi.mock('@/components/ui/tooltip', () => ({
    TooltipWrapper: {
        props: ['content', 'side'],
        template:
            '<div data-testid="tooltip-wrapper" :title="content"><slot /></div>'
    }
}));

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key) => {
            const messages = {
                'dialog.user.info.vrcplus_supporter': 'VRChat+ Supporter'
            };
            return messages[key] || key;
        },
        te: (key) => key === 'dialog.user.info.vrcplus_supporter'
    })
}));

describe('VrcPlusBadge.vue', () => {
    test('renders visible VRC+ text', () => {
        const wrapper = mount(VrcPlusBadge);
        const badge = wrapper.find('.bv-vrcplus-badge');
        expect(badge.exists()).toBe(true);
        expect(badge.text()).toBe('VRC+');
    });

    test('defaults to sm size variant', () => {
        const wrapper = mount(VrcPlusBadge);
        const badge = wrapper.find('.bv-vrcplus-badge');
        expect(badge.classes()).toContain('bv-vrcplus-badge--sm');
    });

    test('supports md size variant', () => {
        const wrapper = mount(VrcPlusBadge, {
            props: {
                size: 'md'
            }
        });
        const badge = wrapper.find('.bv-vrcplus-badge');
        expect(badge.classes()).toContain('bv-vrcplus-badge--md');
        expect(badge.classes()).not.toContain('bv-vrcplus-badge--sm');
    });

    test('provides accessible tooltip and aria label', () => {
        const wrapper = mount(VrcPlusBadge);
        const badge = wrapper.find('.bv-vrcplus-badge');
        expect(badge.attributes('aria-label')).toBe('VRChat+ Supporter');
        const tooltip = wrapper.find('[data-testid="tooltip-wrapper"]');
        expect(tooltip.attributes('title')).toBe('VRChat+ Supporter');
    });
});
