import { mount } from '@vue/test-utils';
import { expect, it, vi } from 'vitest';
import AvatarDatabaseInfo from '../AvatarDatabaseInfo.vue';
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock('../../../../shared/utils', () => ({
    formatDateFilter: (date) => `date:${date}`
}));
vi.mock('@/components/ui/tooltip', () => ({
    TooltipWrapper: { template: '<span><slot /></span>' }
}));
const metadata = {
    sources: ['avtrdb', 'vrcndb'],
    sourceData: {
        avtrdb: {},
        vrcndb: {
            platforms: ['pc', 'android'],
            performance: { pc: 'VeryPoor', android: 'Good' },
            likes: 5,
            pop: 0,
            trend_rank: 0,
            wear: 0,
            featured: true,
            first_seen: 1790490146,
            styles: { primary: 'Anime' },
            impostor: ['ios']
        }
    }
};
it('shows source badges and meaningful discovery fields without zero clutter', () => {
    const wrapper = mount(AvatarDatabaseInfo, {
        props: { metadata, avatar: {} }
    });
    const content = wrapper.text();
    expect(content).toContain('AvtrDB');
    expect(content).toContain('VRCNDb');
    expect(content).toContain('avatar_search_v2.likes');
    expect(content).toContain('Very Poor');
    expect(content).toContain('Anime');
    expect(content).toContain('date:2026');
    expect(content).not.toContain('avatar_search_v2.pop');
    expect(content).not.toContain('avatar_search_v2.trend_rank');
    expect(wrapper.find('details').exists()).toBe(true);
});
it('suppresses database compatibility, styles and performance when official fields exist', () => {
    const wrapper = mount(AvatarDatabaseInfo, {
        props: {
            metadata,
            avatar: {
                styles: { primary: 'Official' },
                unityPackages: [
                    {
                        platform: 'standalonewindows',
                        variant: 'security',
                        performanceRating: 'Excellent'
                    },
                    { platform: 'android', performanceRating: 'Poor' },
                    { platform: 'ios', variant: 'impostor' }
                ]
            }
        }
    });
    expect(wrapper.text()).not.toContain('Very Poor');
    expect(wrapper.text()).not.toContain('Anime');
    expect(wrapper.text()).not.toContain('avatar_search_v2.platforms');
    expect(wrapper.text()).not.toContain('avatar_search_v2.impostor');
    expect(wrapper.text()).toContain('avatar_search_v2.likes');
});
it('has no empty database section without metadata', () => {
    expect(mount(AvatarDatabaseInfo, { props: { avatar: {} } }).text()).toBe(
        ''
    );
});
