import { onScopeDispose, watchEffect } from 'vue';
import { useDocumentVisibility } from '@vueuse/core';
import { useAppFocus } from './useAppFocus';

export function useAppMotion() {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const previous = root.getAttribute('data-bv-motion');
    const { isAppFocused } = useAppFocus();
    const visibility = useDocumentVisibility();

    watchEffect(() => {
        root.dataset.bvMotion =
            isAppFocused.value && visibility.value === 'visible'
                ? 'active'
                : 'paused';
    });
    onScopeDispose(() => {
        if (previous === null) root.removeAttribute('data-bv-motion');
        else root.setAttribute('data-bv-motion', previous);
    });
}
