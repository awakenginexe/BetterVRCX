import { describe, expect, test } from 'vitest';
import { mount } from '@vue/test-utils';

import SettingsItem from '../SettingsItem.vue';

describe('SettingsItem.vue', () => {
    test.each([
        ['restart', 'Restart required'],
        ['destructive', 'Cannot be undone']
    ])(
        'renders an accessible %s warning marker without replacing the setting control',
        (intent, intentLabel) => {
            const wrapper = mount(SettingsItem, {
                props: {
                    label: 'Protected setting',
                    intent,
                    intentLabel
                },
                slots: {
                    default: '<button type="button">Keep action</button>'
                }
            });

            const marker = wrapper.get(`[data-setting-intent="${intent}"]`);
            expect(marker.attributes('title')).toBe(intentLabel);
            expect(marker.attributes('aria-label')).toBe(intentLabel);
            expect(wrapper.get('button').text()).toBe('Keep action');
        }
    );
});
