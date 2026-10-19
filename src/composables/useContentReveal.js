import { onScopeDispose, watch } from 'vue';
import { useDocumentVisibility, usePreferredReducedMotion } from '@vueuse/core';
import { useAppFocus } from './useAppFocus';

export function useContentReveal(target, identity, ready) {
    const { isAppFocused } = useAppFocus();
    const reducedMotion = usePreferredReducedMotion();
    const visibility = useDocumentVisibility();
    let animations = [];
    let lastElement;
    let lastIdentity;

    function cancel() {
        const previous = animations;
        animations = [];
        previous.forEach((animation) => animation.cancel());
    }

    watch(
        [target, identity, ready, isAppFocused, reducedMotion, visibility],
        ([view, key, loaded, focused, preference, visible]) => {
            cancel();
            const element = view?.$el ?? view;
            if (!(element instanceof HTMLElement)) {
                lastElement = undefined;
                lastIdentity = undefined;
                return;
            }
            if (element !== lastElement) {
                lastElement = element;
                lastIdentity = undefined;
            }
            if (!loaded || key == null || key === lastIdentity) return;
            lastIdentity = key;
            if (!focused || preference === 'reduce' || visible !== 'visible')
                return;

            // Bound the reveal to static sections, never every row in a live list.
            const parts = [
                ...element.querySelectorAll('[data-bv-motion-part]')
            ].slice(0, 3);
            (parts.length ? parts : [element]).forEach((part, index) => {
                if (typeof part.animate !== 'function') return;
                const animation = part.animate(
                    [
                        { opacity: 0.5, translate: '0 10px' },
                        { opacity: 1, translate: '0 0' }
                    ],
                    {
                        duration: 240,
                        delay: index * 30,
                        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
                        fill: 'backwards'
                    }
                );
                animations.push(animation);
                animation.onfinish = () => {
                    animations = animations.filter(
                        (item) => item !== animation
                    );
                };
            });
        },
        { immediate: true, flush: 'post' }
    );
    onScopeDispose(cancel);
}
