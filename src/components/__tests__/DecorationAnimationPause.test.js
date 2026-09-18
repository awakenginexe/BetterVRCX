import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';

const displayVRCProfileEffects = ref(true);
const alwaysAnimateVRCProfileEffects = ref(false);
const isAppFocused = ref(true);
const cachedProfileEffects = ref(new Map());
const cachedNameplateEffects = ref(new Map());
const cachedIconFrames = ref(new Map());

vi.mock('pinia', async (importOriginal) => ({
    ...(await importOriginal()),
    storeToRefs: (store) => store
}));

vi.mock('../../stores', () => ({
    useAppearanceSettingsStore: () => ({
        displayVRCProfileEffects,
        alwaysAnimateVRCProfileEffects
    }),
    useUserStore: () => ({
        cachedProfileEffects,
        cachedNameplateEffects,
        cachedIconFrames
    })
}));

vi.mock('../../composables/useAppFocus', () => ({
    useAppFocus: () => ({ isAppFocused })
}));

import IconFrame from '../IconFrame.vue';
import NameplateEffect from '../NameplateEffect.vue';
import ProfileEffect from '../ProfileEffect.vue';

const pausableImageStub = {
    name: 'PausableAnimatedImage',
    inheritAttrs: false,
    props: ['src', 'paused', 'visible'],
    template:
        '<div data-pausable-image :data-src="src" :data-paused="String(paused)" :data-visible="String(visible)" v-bind="$attrs" />'
};

describe('decoration animation focus policy', () => {
    beforeEach(() => {
        displayVRCProfileEffects.value = true;
        alwaysAnimateVRCProfileEffects.value = false;
        isAppFocused.value = true;
        cachedProfileEffects.value = new Map([
            [
                'profile',
                {
                    metadata: {
                        assets: [
                            {
                                type: 'mainAnimation',
                                url: 'https://example.com/profile.webp'
                            }
                        ]
                    }
                }
            ]
        ]);
        cachedNameplateEffects.value = new Map([
            [
                'nameplate',
                {
                    metadata: {
                        assets: [
                            {
                                type: 'mainAnimation',
                                url: 'https://example.com/nameplate.webp'
                            }
                        ]
                    }
                }
            ]
        ]);
        cachedIconFrames.value = new Map([
            [
                'frame',
                {
                    metadata: {
                        assets: [
                            {
                                type: 'mainAnimation',
                                url: 'https://example.com/frame.webp'
                            }
                        ]
                    }
                }
            ]
        ]);
    });

    it.each([
        ['profile effects', ProfileEffect, { profileEffect: 'profile' }],
        [
            'nameplate effects',
            NameplateEffect,
            { nameplateEffect: 'nameplate', variant: 'sidebar' }
        ],
        ['icon frames', IconFrame, { iconFrame: 'frame' }]
    ])(
        'applies the same pause and override policy to %s',
        async (_name, component, props) => {
            const wrapper = mount(component, {
                props,
                global: { stubs: { PausableAnimatedImage: pausableImageStub } }
            });

            expect(
                wrapper.get('[data-pausable-image]').attributes('data-paused')
            ).toBe('false');

            isAppFocused.value = false;
            await nextTick();
            expect(
                wrapper.get('[data-pausable-image]').attributes('data-paused')
            ).toBe('true');

            alwaysAnimateVRCProfileEffects.value = true;
            await nextTick();
            expect(
                wrapper.get('[data-pausable-image]').attributes('data-paused')
            ).toBe('false');
        }
    );
});
