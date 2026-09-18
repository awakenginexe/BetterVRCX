import { beforeEach, describe, expect, test, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';

const displayVRCProfileEffects = ref(true);
const alwaysAnimateVRCProfileEffects = ref(false);
const cachedNameplateEffects = ref(new Map());
const isAppFocused = ref(true);

vi.mock('pinia', async (importOriginal) => ({
    ...(await importOriginal()),
    storeToRefs: (store) => store
}));

vi.mock('../../stores', () => ({
    useAppearanceSettingsStore: () => ({
        displayVRCProfileEffects,
        alwaysAnimateVRCProfileEffects
    }),
    useUserStore: () => ({ cachedNameplateEffects })
}));

vi.mock('../../composables/useAppFocus', () => ({
    useAppFocus: () => ({ isAppFocused })
}));

import NameplateEffect from '../NameplateEffect.vue';

describe('NameplateEffect.vue', () => {
    beforeEach(() => {
        displayVRCProfileEffects.value = true;
        alwaysAnimateVRCProfileEffects.value = false;
        isAppFocused.value = true;
        cachedNameplateEffects.value = new Map();
    });

    test('sidebar variant fills the compact row and keeps decoration non-interactive', async () => {
        cachedNameplateEffects.value.set('cos_sidebar', {
            id: 'cos_sidebar',
            metadata: {
                assets: [
                    {
                        type: 'mainAnimation',
                        url: 'https://example.com/sidebar.webp'
                    }
                ],
                gradientStart: '102030',
                gradientEnd: '405060'
            }
        });

        const wrapper = mount(NameplateEffect, {
            props: { nameplateEffect: 'cos_sidebar', variant: 'sidebar' }
        });
        await wrapper.vm.$nextTick();

        const effect = wrapper.get('[data-nameplate-effect]');
        expect(effect.attributes('data-variant')).toBe('sidebar');
        expect(effect.classes()).toEqual(
            expect.arrayContaining([
                'inset-0',
                'overflow-hidden',
                'pointer-events-none'
            ])
        );
        expect(wrapper.get('[data-nameplate-effect-main]').classes()).toContain(
            'object-cover'
        );
    });

    test('transitions from the intro asset to the main asset', async () => {
        vi.useFakeTimers();
        cachedNameplateEffects.value.set('cos_animated', {
            id: 'cos_animated',
            metadata: {
                assets: [
                    {
                        type: 'introAnimation',
                        url: 'https://example.com/intro.webp',
                        totalDurationMs: 200
                    },
                    {
                        type: 'mainAnimation',
                        url: 'https://example.com/main.webp'
                    }
                ]
            }
        });

        const wrapper = mount(NameplateEffect, {
            props: { nameplateEffect: 'cos_animated', variant: 'sidebar' }
        });
        await wrapper.get('[data-nameplate-effect-intro]').trigger('load');
        expect(wrapper.get('[data-nameplate-effect-intro]').isVisible()).toBe(
            true
        );
        expect(wrapper.get('[data-nameplate-effect-main]').isVisible()).toBe(
            false
        );

        await vi.runAllTimersAsync();
        await wrapper.vm.$nextTick();
        expect(
            wrapper.get('[data-nameplate-effect-intro]').attributes('style')
        ).toContain('display: none');
        expect(
            wrapper.get('[data-nameplate-effect-main]').attributes('style') ??
                ''
        ).not.toContain('display: none');
        vi.useRealTimers();
    });

    test('pauses the intro countdown while the app is unfocused', async () => {
        vi.useFakeTimers();
        cachedNameplateEffects.value.set('cos_paused_intro', {
            metadata: {
                assets: [
                    {
                        type: 'introAnimation',
                        url: 'https://example.com/intro.webp',
                        totalDurationMs: 200
                    },
                    {
                        type: 'mainAnimation',
                        url: 'https://example.com/main.webp'
                    }
                ]
            }
        });
        const wrapper = mount(NameplateEffect, {
            props: {
                nameplateEffect: 'cos_paused_intro',
                variant: 'sidebar'
            }
        });
        await wrapper.get('[data-nameplate-effect-intro]').trigger('load');
        await vi.advanceTimersByTimeAsync(75);

        isAppFocused.value = false;
        await nextTick();
        await vi.advanceTimersByTimeAsync(500);
        expect(wrapper.get('[data-nameplate-effect-intro]').isVisible()).toBe(
            true
        );

        isAppFocused.value = true;
        await nextTick();
        await vi.advanceTimersByTimeAsync(124);
        expect(wrapper.get('[data-nameplate-effect-intro]').isVisible()).toBe(
            true
        );
        await vi.advanceTimersByTimeAsync(1);
        expect(wrapper.get('[data-nameplate-effect-main]').isVisible()).toBe(
            true
        );
        vi.useRealTimers();
    });

    test('missing cosmetic definitions and assets render nothing without throwing', async () => {
        const wrapper = mount(NameplateEffect, {
            props: { nameplateEffect: 'cos_missing', variant: 'sidebar' }
        });
        expect(wrapper.find('[data-nameplate-effect]').exists()).toBe(false);

        cachedNameplateEffects.value.set('cos_empty', {
            id: 'cos_empty',
            metadata: { assets: [] }
        });
        await wrapper.setProps({ nameplateEffect: 'cos_empty' });
        expect(wrapper.find('[data-nameplate-effect]').exists()).toBe(false);
    });
});
