import { mount } from '@vue/test-utils';
import { beforeEach, expect, test, vi } from 'vitest';
import en from '../../../localization/en.json';

const mocks = vi.hoisted(() => ({
    dialog: require('vue').ref({
        visible: true,
        titleKey: 'onboarding.whatsnew.releases.2026_10_31.title',
        items: []
    }),
    close: vi.fn(),
    changelog: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('pinia', () => ({ storeToRefs: (value) => value }));
vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key) =>
            key.split('.').reduce((value, part) => value?.[part], en) ?? key
    })
}));
vi.mock('../../../stores', () => ({
    useVRCXUpdaterStore: () => ({
        whatsNewDialog: mocks.dialog,
        closeWhatsNewDialog: mocks.close,
        openChangeLogDialogOnly: mocks.changelog
    })
}));
vi.mock('../../../shared/utils', () => ({ openExternalLink: vi.fn() }));
vi.mock('@/components/ui/dialog', () => ({
    Dialog: { template: '<div><slot /></div>' },
    DialogContent: { template: '<div><slot /></div>' }
}));
vi.mock('@/components/ui/button', () => ({
    Button: { template: '<button><slot /></button>' }
}));

import WhatsNewDialog from '../WhatsNewDialog.vue';

beforeEach(() => vi.clearAllMocks());

test('shows BetterVRCX release information without upstream donation promotions', () => {
    const wrapper = mount(WhatsNewDialog);
    expect(wrapper.text()).toContain('BetterVRCX 4.4.0');
    expect(wrapper.text()).not.toMatch(/Ko-fi|Map1en|Natsumi|Support VRCX/);
    expect(wrapper.find('img').attributes('alt')).toBe('BetterVRCX');
});

test('retains the internal changelog and dismissal controls', async () => {
    const wrapper = mount(WhatsNewDialog);
    await wrapper
        .findAll('button')
        .find((button) => button.text().startsWith('View All Changes'))
        .trigger('click');
    expect(mocks.close).toHaveBeenCalledTimes(1);
    expect(mocks.changelog).toHaveBeenCalledTimes(1);
    await wrapper
        .findAll('button')
        .find((button) => button.text() === 'Got It')
        .trigger('click');
    expect(mocks.close).toHaveBeenCalledTimes(2);
});
