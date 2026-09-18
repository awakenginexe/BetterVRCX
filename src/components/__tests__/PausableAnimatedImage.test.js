import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

import PausableAnimatedImage from '../PausableAnimatedImage.vue';

describe('PausableAnimatedImage', () => {
    const drawImage = vi.fn();
    const setTransform = vi.fn();

    beforeEach(() => {
        drawImage.mockReset();
        setTransform.mockReset();
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
            clearRect: vi.fn(),
            drawImage,
            setTransform
        });
    });

    it('keeps the current frame visible on a canvas while the live image is stopped', async () => {
        const wrapper = mount(PausableAnimatedImage, {
            props: {
                src: 'https://example.com/effect.webp',
                paused: false,
                visible: true,
                fit: 'cover'
            },
            attrs: { class: 'absolute inset-0 opacity-60' }
        });
        const image = wrapper.get('img').element;
        expect(wrapper.find('canvas').exists()).toBe(false);
        Object.defineProperties(image, {
            naturalWidth: { value: 200 },
            naturalHeight: { value: 100 },
            clientWidth: { value: 100 },
            clientHeight: { value: 100 }
        });
        await wrapper.get('img').trigger('load');

        await wrapper.setProps({ paused: true });
        await flushPromises();

        expect(drawImage).toHaveBeenCalledOnce();
        expect(wrapper.find('img').exists()).toBe(false);
        expect(wrapper.get('canvas').classes()).toEqual(
            expect.arrayContaining(['absolute', 'inset-0', 'opacity-60'])
        );

        await wrapper.setProps({ paused: false });
        expect(wrapper.find('canvas').exists()).toBe(false);
        expect(wrapper.get('img').attributes('src')).toBe(
            'https://example.com/effect.webp'
        );
    });

    it('captures the latest asset received while paused', async () => {
        const wrapper = mount(PausableAnimatedImage, {
            props: {
                src: 'https://example.com/old.webp',
                paused: true,
                visible: true
            }
        });

        const oldImage = wrapper.get('img').element;
        Object.defineProperties(oldImage, {
            naturalWidth: { value: 64 },
            naturalHeight: { value: 64 },
            clientWidth: { value: 64 },
            clientHeight: { value: 64 }
        });
        await wrapper.get('img').trigger('load');
        expect(wrapper.find('img').exists()).toBe(false);

        await wrapper.setProps({ src: 'https://example.com/new.webp' });
        expect(wrapper.get('img').attributes('src')).toBe(
            'https://example.com/new.webp'
        );

        const newImage = wrapper.get('img').element;
        Object.defineProperties(newImage, {
            naturalWidth: { value: 64 },
            naturalHeight: { value: 64 },
            clientWidth: { value: 64 },
            clientHeight: { value: 64 }
        });
        await wrapper.get('img').trigger('load');

        expect(wrapper.find('img').exists()).toBe(false);
        expect(wrapper.find('canvas').exists()).toBe(true);
        expect(drawImage).toHaveBeenCalledTimes(2);
    });
});
