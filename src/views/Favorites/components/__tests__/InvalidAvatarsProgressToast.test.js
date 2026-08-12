import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('@/components/ui/button', () => ({
    Button: { template: '<button><slot /></button>' }
}));

vi.mock('@/components/ui/progress', () => ({
    Progress: { props: ['modelValue'], template: '<div :data-progress="modelValue" />' }
}));

import InvalidAvatarsProgressToast from '../InvalidAvatarsProgressToast.jsx';

describe('InvalidAvatarsProgressToast', () => {
    it('announces current invalid-avatar check progress without changing dismissal behavior', () => {
        const onDismiss = vi.fn();
        const wrapper = mount(InvalidAvatarsProgressToast, {
            props: {
                t: (key, values) => `${key}:${values?.current ?? ''}/${values?.total ?? ''}`,
                progress: { current: 3, total: 9, percentage: 33 },
                onDismiss
            }
        });

        expect(wrapper.get('[role="status"]').attributes('aria-live')).toBe('polite');
        expect(wrapper.text()).toContain('view.favorite.avatars.checking_progress:3/9');
        expect(wrapper.get('button').text()).toContain('view.favorite.avatars.dismiss');
    });
});
