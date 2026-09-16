import { expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
vi.mock('../../config', () => ({
    default: {
        getBool: vi.fn().mockResolvedValue(true),
        setBool: vi.fn().mockResolvedValue()
    }
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k) => k }) }));
import AnalyticsSettings from '../AnalyticsSettings.vue';
import { useAppAnalyticsStore } from '../store';
it('shows a clearly labeled disclosure and immediately honors the off switch', async () => {
    setActivePinia(createPinia());
    const store = useAppAnalyticsStore();
    await store.init();
    const wrapper = mount(AnalyticsSettings, {
        global: {
            stubs: {
                SettingsGroup: { template: '<section><slot/></section>' },
                SettingsItem: {
                    props: ['label', 'description'],
                    template: '<div>{{label}}{{description}}<slot/></div>'
                },
                Switch: {
                    props: ['modelValue'],
                    emits: ['update:modelValue'],
                    template:
                        '<button role="switch" :aria-checked="modelValue" @click="$emit(\'update:modelValue\',false)" />'
                }
            }
        }
    });
    expect(wrapper.text()).toContain('app_analytics.description');
    await wrapper.get('[role="switch"]').trigger('click');
    await flushPromises();
    expect(store.enabled).toBe(false);
});
