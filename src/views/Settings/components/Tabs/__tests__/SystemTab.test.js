import { afterEach, describe, expect, test, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';

const generalStore = {
    isStartAtWindowsStartup: ref(false),
    isStartAsMinimizedState: ref(false),
    isCloseToTray: ref(false),
    disableGpuAcceleration: ref(false),
    disableVrOverlayGpuAcceleration: ref(false),
    setIsStartAtWindowsStartup: vi.fn(),
    setIsStartAsMinimizedState: vi.fn(),
    setIsCloseToTray: vi.fn(),
    setDisableGpuAcceleration: vi.fn(),
    setDisableVrOverlayGpuAcceleration: vi.fn(),
    promptProxySettings: vi.fn()
};

const updaterStore = {
    appVersion: ref('3.7.0'),
    autoUpdateVRCX: ref('Notify'),
    latestAppVersion: ref('3.7.0'),
    noUpdater: ref(false),
    setAutoUpdateVRCX: vi.fn(),
    checkForVRCXUpdate: vi.fn(),
    showVRCXUpdateDialog: vi.fn(),
    showChangeLogDialog: vi.fn()
};

vi.mock('pinia', async (importOriginal) => ({
    ...(await importOriginal()),
    storeToRefs: (store) => store
}));

vi.mock('@/stores', () => ({
    useGeneralSettingsStore: () => generalStore,
    useVRCXUpdaterStore: () => updaterStore
}));

vi.mock('../../../../../services/appAnalytics/AnalyticsSettings.vue', () => ({
    default: {
        template: '<section data-analytics-settings>analytics</section>'
    }
}));

vi.mock('../../SettingsGroup.vue', () => ({
    default: {
        props: ['title'],
        template:
            '<section data-settings-group :data-title="title"><slot /></section>'
    }
}));

import SystemTab from '../SystemTab.vue';
import { i18n } from '@/plugins/i18n';

describe('SystemTab.vue', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('places app usage analytics after every other visible settings section', () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
        const wrapper = mount(SystemTab, {
            global: { plugins: [i18n] }
        });
        const sections = wrapper.findAll(
            '[data-settings-group], [data-analytics-settings]'
        );

        expect(
            sections.at(-1).attributes('data-analytics-settings')
        ).toBeDefined();
    });
});
