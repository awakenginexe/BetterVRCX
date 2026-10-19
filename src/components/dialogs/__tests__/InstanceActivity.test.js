import { flushPromises, mount } from '@vue/test-utils';
import { expect, it, vi } from 'vitest';
const { getInstanceCount } = vi.hoisted(() => ({ getInstanceCount: vi.fn() }));
vi.mock('../../../api', () => ({ instanceRequest: { getInstanceCount } }));
vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key, values) => `${key}:${JSON.stringify(values || {})}`
    })
}));
import InstanceActivity from '../InstanceActivity.vue';

it('loads counts only when visible and reuses recent results across openings', async () => {
    getInstanceCount.mockResolvedValue({ json: { instances: 42, events: 7 } });
    const wrapper = mount(InstanceActivity, { props: { active: false } });
    expect(getInstanceCount).not.toHaveBeenCalled();
    await wrapper.setProps({ active: true });
    await flushPromises();
    expect(wrapper.text()).toContain('42');
    expect(wrapper.text()).toContain('7');
    await wrapper.setProps({ active: false });
    await wrapper.setProps({ active: true });
    expect(getInstanceCount).toHaveBeenCalledTimes(1);
});
