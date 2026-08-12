import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ locale: ref('en') }) }));
vi.mock('vue-router', async (importOriginal) => ({
    ...(await importOriginal()),
    useRouter: () => ({})
}));
vi.mock('../../feed', () => ({ useFeedStore: () => ({}) }));
vi.mock('../../gameLog', () => ({ useGameLogStore: () => ({}) }));
vi.mock('../../ui', () => ({ useUiStore: () => ({}) }));
vi.mock('../../user', () => ({ useUserStore: () => ({}) }));
vi.mock('../../vr', () => ({
    useVrStore: () => ({ updateVRConfigVars: vi.fn() })
}));
vi.mock('../../vrcx', () => ({ useVrcxStore: () => ({}) }));
vi.mock('../../../services/database', () => ({ database: {} }));
vi.mock('../../../services/watchState', () => ({ watchState: {} }));
vi.mock('../../../services/config', () => ({
    default: {
        getBool: vi.fn((_key, fallback) => fallback),
        getFloat: vi.fn((_key, fallback) => fallback),
        getInt: vi.fn((_key, fallback) => fallback),
        getString: vi.fn((_key, fallback) => fallback),
        remove: vi.fn(),
        setBool: vi.fn(),
        setFloat: vi.fn(),
        setInt: vi.fn(),
        setString: vi.fn()
    }
}));
vi.mock('../../../plugins', () => ({
    i18n: { global: { t: vi.fn(), locale: ref('en') } },
    loadLocalizedStrings: vi.fn()
}));
vi.mock('../../../shared/utils', () => ({
    computeTrustLevel: vi.fn(),
    getNameColour: vi.fn()
}));
vi.mock('../../../shared/utils/base/ui', () => ({
    applyAppCjkFontPack: vi.fn(),
    HueToHex: vi.fn(),
    applyAppFontFamily: vi.fn(),
    changeAppThemeStyle: vi.fn(),
    changeHtmlLangAttribute: vi.fn(),
    getThemeMode: vi.fn().mockResolvedValue({
        initThemeMode: 'dark',
        isDarkMode: true
    }),
    updateTrustColorClasses: vi.fn()
}));

import { useAppearanceSettingsStore } from '../appearance';
import configRepository from '../../../services/config';

describe('appearance settings', () => {
    beforeEach(() => {
        configRepository.getInt.mockImplementation(
            (_key, fallback) => fallback
        );
        setActivePinia(createPinia());
    });

    it('starts new navigation layouts at the 220px desktop rail target', () => {
        const store = useAppearanceSettingsStore();

        expect(store.navWidth).toBe(220);
    });

    it('preserves an existing persisted navigation width', async () => {
        configRepository.getInt.mockImplementation((key, fallback) =>
            key === 'VRCX_navPanelWidth' ? 312 : fallback
        );

        const store = useAppearanceSettingsStore();
        await vi.waitFor(() => expect(store.navWidth).toBe(312));

        expect(configRepository.getInt).toHaveBeenCalledWith(
            'VRCX_navPanelWidth',
            220
        );
    });
});
