import { beforeEach, describe, expect, test, vi } from 'vitest';
import { mount } from '@vue/test-utils';

import AppTitleBar from '../AppTitleBar.vue';

const appApi = {
    BeginWindowDrag: vi.fn(),
    CloseWindow: vi.fn(),
    IsWindowMaximized: vi.fn().mockResolvedValue(false),
    MinimizeWindow: vi.fn(),
    ToggleMaximizeWindow: vi.fn()
};

function mountTitleBar(props = {}, slots = {}) {
    return mount(AppTitleBar, {
        props: {
            appVersion: 'BetterVRCX v3.2.3 B 2026.08.22',
            latestAppVersion: 'BetterVRCX v3.2.3',
            ...props
        },
        slots
    });
}

describe('AppTitleBar.vue', () => {
    beforeEach(() => {
        globalThis.WINDOWS = true;
        delete window.electron;
        globalThis.AppApi = appApi;
        vi.clearAllMocks();
        appApi.IsWindowMaximized.mockResolvedValue(false);
    });

    test('renders the logo, version tag, and build tag', () => {
        const wrapper = mountTitleBar();

        expect(
            wrapper.get('[data-testid="app-title-bar-logo"]').attributes('alt')
        ).toBe('BetterVRCX');
        expect(wrapper.get('[data-testid="app-version-tag"]').text()).toBe(
            '3.2.3'
        );
        expect(wrapper.get('[data-testid="app-build-tag"]').text()).toBe(
            '2026.08.22'
        );
        expect(
            wrapper.get('[data-testid="app-version-tag"]').classes()
        ).toContain('app-version-tag--latest');
    });

    test('uses the gray version state when the latest release is unavailable', () => {
        const wrapper = mountTitleBar({ latestAppVersion: '' });

        expect(
            wrapper.get('[data-testid="app-version-tag"]').classes()
        ).toContain('app-version-tag--offline');
    });

    test('renders the status slot between the brand and window controls', () => {
        const wrapper = mountTitleBar(
            {},
            { status: '<span data-testid="embedded-status">Proxy</span>' }
        );
        const titleBar = wrapper.get('[data-testid="app-title-bar"]');
        const children = [...titleBar.element.children];

        expect(
            wrapper
                .get('.app-title-bar-status')
                .get('[data-testid="embedded-status"]')
        ).toBeTruthy();
        expect(
            children.indexOf(wrapper.get('.app-title-bar-brand').element)
        ).toBeLessThan(
            children.indexOf(wrapper.get('.app-title-bar-status').element)
        );
        expect(
            children.indexOf(wrapper.get('.app-title-bar-status').element)
        ).toBeLessThan(
            children.indexOf(wrapper.get('.app-title-bar-controls').element)
        );
    });

    test('does not treat embedded status interactions as window dragging', async () => {
        const wrapper = mountTitleBar(
            {},
            {
                status: '<span class="no-drag" data-testid="embedded-status">Proxy</span>'
            }
        );

        await wrapper
            .get('[data-testid="embedded-status"]')
            .trigger('pointerdown');
        await wrapper
            .get('[data-testid="embedded-status"]')
            .trigger('dblclick');

        expect(appApi.BeginWindowDrag).not.toHaveBeenCalled();
        expect(appApi.ToggleMaximizeWindow).not.toHaveBeenCalled();
    });

    test('keeps unused status-bar space available for dragging and maximizing', async () => {
        const wrapper = mountTitleBar(
            {},
            { status: '<span data-testid="empty-status-space"> </span>' }
        );

        await wrapper
            .get('[data-testid="empty-status-space"]')
            .trigger('pointerdown');
        await wrapper
            .get('[data-testid="empty-status-space"]')
            .trigger('dblclick');

        expect(appApi.BeginWindowDrag).toHaveBeenCalledOnce();
        expect(appApi.ToggleMaximizeWindow).toHaveBeenCalledOnce();
    });

    test('delegates window actions and title-bar dragging to the native host', async () => {
        const wrapper = mountTitleBar();

        await wrapper
            .get('[data-testid="app-title-bar"]')
            .trigger('pointerdown');
        await wrapper.get('[data-testid="window-minimize"]').trigger('click');
        await wrapper.get('[data-testid="window-maximize"]').trigger('click');
        await wrapper.get('[data-testid="window-close"]').trigger('click');

        expect(appApi.BeginWindowDrag).toHaveBeenCalledOnce();
        expect(appApi.MinimizeWindow).toHaveBeenCalledOnce();
        expect(appApi.ToggleMaximizeWindow).toHaveBeenCalledOnce();
        expect(appApi.CloseWindow).toHaveBeenCalledOnce();
    });
});
