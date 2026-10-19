import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';

let focused;
let reduced;
let visibility;
vi.mock('../useAppFocus', () => ({
    useAppFocus: () => ({ isAppFocused: focused })
}));
vi.mock('@vueuse/core', () => ({
    usePreferredReducedMotion: () => reduced,
    useDocumentVisibility: () => visibility
}));

import { useContentReveal } from '../useContentReveal';

describe('useContentReveal', () => {
    let scope;
    let target;
    let identity;
    let ready;
    let animate;
    let animations;

    beforeEach(() => {
        focused = ref(true);
        reduced = ref('no-preference');
        visibility = ref('visible');
        target = ref(null);
        identity = ref('user:one');
        ready = ref(false);
        animations = [];
        animate = vi.fn(() => {
            const animation = { cancel: vi.fn(), onfinish: null };
            animations.push(animation);
            return animation;
        });
        scope = effectScope();
        scope.run(() => useContentReveal(target, identity, ready));
    });

    afterEach(() => scope.stop());

    async function mountTarget() {
        const element = document.createElement('div');
        element.animate = animate;
        target.value = { $el: element };
        ready.value = true;
        await nextTick();
        return element;
    }

    it('waits for ready content and reveals each identity once without remounting it', async () => {
        const element = await mountTarget();
        expect(animate).toHaveBeenCalledOnce();
        ready.value = false;
        await nextTick();
        ready.value = true;
        await nextTick();
        expect(animate).toHaveBeenCalledOnce();
        identity.value = 'user:two';
        ready.value = false;
        await nextTick();
        expect(animate).toHaveBeenCalledOnce();
        ready.value = true;
        await nextTick();
        expect(animate).toHaveBeenCalledTimes(2);
        expect(target.value.$el).toBe(element);
        expect(animations[0].cancel).toHaveBeenCalled();
    });

    it('limits staged reveals to three marked sections', async () => {
        const element = document.createElement('div');
        element.innerHTML = '<section data-bv-motion-part></section>'.repeat(5);
        element.querySelectorAll('section').forEach((part) => {
            part.animate = animate;
        });
        target.value = element;
        ready.value = true;
        await nextTick();
        expect(animate).toHaveBeenCalledTimes(3);
        expect(animate.mock.calls.map(([, options]) => options.delay)).toEqual([
            0, 30, 60
        ]);
        scope.stop();
        animations.forEach((animation) =>
            expect(animation.cancel).toHaveBeenCalledOnce()
        );
    });

    it('cancels rapid navigation, backgrounding, and scope disposal', async () => {
        await mountTarget();
        identity.value = 'user:two';
        await nextTick();
        expect(animations[0].cancel).toHaveBeenCalledOnce();
        focused.value = false;
        await nextTick();
        expect(animations[1].cancel).toHaveBeenCalledOnce();
        focused.value = true;
        await nextTick();
        expect(animate).toHaveBeenCalledTimes(2);
        identity.value = 'user:three';
        await nextTick();
        scope.stop();
        expect(animations[2].cancel).toHaveBeenCalledOnce();
    });

    it('honors reduced motion without replaying old content when the preference changes', async () => {
        reduced.value = 'reduce';
        await mountTarget();
        expect(animate).not.toHaveBeenCalled();
        reduced.value = 'no-preference';
        await nextTick();
        expect(animate).not.toHaveBeenCalled();
        identity.value = 'world:one';
        await nextTick();
        expect(animate).toHaveBeenCalledOnce();
    });

    it('cancels when hidden even if the browser still reports focus', async () => {
        await mountTarget();
        visibility.value = 'hidden';
        await nextTick();
        expect(animations[0].cancel).toHaveBeenCalledOnce();
    });

    it('remains usable when an animation API or element is unavailable', async () => {
        target.value = document.createElement('div');
        ready.value = true;
        await nextTick();
        target.value = { $el: document.createComment('fragment') };
        identity.value = 'avatar:one';
        await nextTick();
        expect(animate).not.toHaveBeenCalled();
    });
});
