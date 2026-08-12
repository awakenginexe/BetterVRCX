import { describe, expect, test, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key) => key })
}));

vi.mock('../components/Tabs/SystemTab.vue', () => ({
    default: {
        name: 'SystemTab',
        template: '<div data-settings-body="system">system</div>'
    }
}));
vi.mock('../components/Tabs/InterfaceTab.vue', () => ({
    default: {
        name: 'InterfaceTab',
        template: '<div data-settings-body="interface">interface</div>'
    }
}));
vi.mock('../components/Tabs/SocialTab.vue', () => ({
    default: {
        name: 'SocialTab',
        template: '<div data-settings-body="social">social</div>'
    }
}));
vi.mock('../components/Tabs/NotificationsTab.vue', () => ({
    default: {
        name: 'NotificationsTab',
        template: '<div data-settings-body="notifications">notifications</div>'
    }
}));
vi.mock('../components/Tabs/VrTab.vue', () => ({
    default: {
        name: 'VrTab',
        template: '<div data-settings-body="vr">vr</div>'
    }
}));
vi.mock('../components/Tabs/MediaTab.vue', () => ({
    default: {
        name: 'MediaTab',
        template: '<div data-settings-body="media">media</div>'
    }
}));
vi.mock('../components/Tabs/IntegrationsTab.vue', () => ({
    default: {
        name: 'IntegrationsTab',
        template: '<div data-settings-body="integrations">integrations</div>'
    }
}));
vi.mock('../components/Tabs/AdvancedTab.vue', () => ({
    default: {
        name: 'AdvancedTab',
        template: '<div data-settings-body="advanced">advanced</div>'
    }
}));

import Settings from '../Settings.vue';

const tabKeys = [
    'system',
    'interface',
    'social',
    'notifications',
    'vr',
    'media',
    'integrations',
    'advanced'
];

describe('Settings.vue', () => {
    test('preserves all tab keys and keeps every tab body mounted while switching the responsive index', async () => {
        const wrapper = mount(Settings);

        expect(
            wrapper
                .findAll('[data-settings-tab]')
                .map((node) => node.attributes('data-settings-tab'))
        ).toEqual(tabKeys);
        expect(wrapper.findAll('[data-settings-body]')).toHaveLength(8);
        expect(wrapper.findAll('[data-settings-panel]')).toHaveLength(8);

        await wrapper.get('[data-settings-tab="media"]').trigger('click');

        expect(
            wrapper
                .get('[data-settings-tab="media"]')
                .attributes('aria-current')
        ).toBe('page');
        expect(wrapper.get('[data-settings-panel="media"]').isVisible()).toBe(
            true
        );
        expect(wrapper.get('[data-settings-panel="system"]').isVisible()).toBe(
            false
        );
        expect(wrapper.findAll('[data-settings-body]')).toHaveLength(8);
    });
});
