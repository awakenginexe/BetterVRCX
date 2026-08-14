import { describe, expect, test, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('@/plugins/router', () => ({
    router: { push: vi.fn(), replace: vi.fn() }
}));
vi.mock('vue-router', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    useRoute: () => ({ path: '/', query: {}, params: {} })
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
vi.mock('../../../addons/homeBackground/HomeBackgroundSettings.vue', () => ({
    default: {
        name: 'HomeBackgroundSettings',
        template:
            '<div data-settings-body="home-background">home-background</div>'
    }
}));
vi.mock(
    '../../../addons/profileBackground/ProfileBackgroundSettings.vue',
    () => ({
        default: {
            name: 'ProfileBackgroundSettings',
            template:
                '<div data-settings-body="profile-background">profile-background</div>'
        }
    })
);

import Settings from '../Settings.vue';
import { i18n } from '@/plugins/i18n';

const tabKeys = [
    'system',
    'interface',
    'social',
    'notifications',
    'vr',
    'media',
    'integrations',
    'advanced',
    'home-background',
    'profile-background'
];

describe('Settings.vue', () => {
    test('preserves all tab keys and keeps every tab body mounted while switching the responsive index', async () => {
        const wrapper = mount(Settings, {
            global: { plugins: [i18n] }
        });

        expect(
            wrapper
                .findAll('[data-settings-tab]')
                .map((node) => node.attributes('data-settings-tab'))
        ).toEqual(tabKeys);
        expect(wrapper.findAll('[data-settings-body]')).toHaveLength(10);
        expect(wrapper.findAll('[data-settings-panel]')).toHaveLength(10);

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
        expect(wrapper.findAll('[data-settings-body]')).toHaveLength(10);
    });

    test('can switch to profile backdrop addon tab', async () => {
        const wrapper = mount(Settings, {
            global: { plugins: [i18n] }
        });
        await wrapper
            .get('[data-settings-tab="profile-background"]')
            .trigger('click');

        expect(
            wrapper
                .get('[data-settings-tab="profile-background"]')
                .attributes('aria-current')
        ).toBe('page');
        expect(
            wrapper
                .get('[data-settings-panel="profile-background"]')
                .isVisible()
        ).toBe(true);
    });
});
