import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { expect, it } from 'vitest';
import AvatarPerformanceDetails from '../AvatarPerformanceDetails.vue';
import en from '../../../../localization/en.json';
const render = (props) =>
    mount(AvatarPerformanceDetails, {
        props,
        global: {
            plugins: [
                createI18n({ legacy: false, locale: 'en', messages: { en } })
            ]
        }
    });
const packages = [{ platform: 'standalonewindows' }, { platform: 'android' }];
it('renders only supplied statistics, preserving zero/false and server rating', () => {
    const wrapper = render({
        packages,
        selectedPlatform: 'standalonewindows',
        result: {
            status: 'available',
            rating: 'VeryPoor',
            stats: {
                totalPolygons: 123456,
                particleCollisionEnabled: false,
                meshCount: 0,
                totalTextureUsage: 1048576
            },
            fetchedAt: 1
        }
    });
    expect(wrapper.text()).toContain('123,456');
    expect(wrapper.text()).toContain('VeryPoor');
    expect(wrapper.text()).toContain('No');
    expect(wrapper.text()).toContain('1,048,576 (unit unverified)');
    expect(wrapper.text()).not.toContain('Vertices');
});
it('uses existing keyboard-accessible PC/Android tabs and emits platform selection', async () => {
    const wrapper = render({ packages, selectedPlatform: 'standalonewindows' });
    const android = wrapper
        .findAll('[role="tab"]')
        .find((tab) => tab.text() === 'Android');
    await android.trigger('mousedown', { button: 0, ctrlKey: false });
    expect(wrapper.emitted('update:selectedPlatform')[0]).toEqual(['android']);
});
it.each([
    ['loading', 'Loading performance data'],
    ['pending', 'Performance analysis pending'],
    ['unavailable', 'Performance data unavailable'],
    ['access', 'Performance data unavailable for this session'],
    ['error', 'Unable to load performance data']
])('renders compact %s state', (status, text) => {
    expect(render({ result: { status } }).text()).toContain(text);
});
it('emits refresh and offers retry for temporary failure', async () => {
    const wrapper = render({
        packages: [packages[1]],
        selectedPlatform: 'android',
        result: { status: 'error' }
    });
    expect(wrapper.find('[role="tab"]').exists()).toBe(false);
    await wrapper
        .get('button[aria-label="Refresh Performance Data"]')
        .trigger('click');
    await wrapper
        .findAll('button')
        .find((button) => button.text() === 'Retry')
        .trigger('click');
    expect(wrapper.emitted('refresh')).toHaveLength(2);
});
