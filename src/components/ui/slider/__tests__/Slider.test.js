import { mount } from '@vue/test-utils';
import { ArrowRight } from 'lucide-vue-next';
import { describe, expect, test } from 'vitest';

import { Slider } from '..';

describe('Slider', () => {
    test('centers a supplied icon inside its draggable thumb', () => {
        const wrapper = mount(Slider, {
            props: {
                defaultValue: [50],
                thumbIcon: ArrowRight
            }
        });

        const thumb = wrapper.get('[data-slot="slider-thumb"]');

        expect(thumb.find('svg.lucide-arrow-right').exists()).toBe(true);
        expect(thumb.classes()).toEqual(
            expect.arrayContaining(['flex', 'items-center', 'justify-center'])
        );
    });
});
