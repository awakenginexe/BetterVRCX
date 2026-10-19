import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';

let focus;
let visible;

vi.mock('../useAppFocus', () => ({
    useAppFocus: () => ({ isAppFocused: focus })
}));
vi.mock('@vueuse/core', () => ({
    useDocumentVisibility: () => visible
}));

import { useAppMotion } from '../useAppMotion';

describe('useAppMotion', () => {
    let scope;

    afterEach(() => {
        scope?.stop();
        document.documentElement.removeAttribute('data-bv-motion');
    });

    it('limits decorative motion when unfocused or hidden, including portalled content', async () => {
        focus = ref(true);
        visible = ref('visible');
        scope = effectScope();
        scope.run(useAppMotion);
        expect(document.documentElement.dataset.bvMotion).toBe('active');
        focus.value = false;
        await nextTick();
        expect(document.documentElement.dataset.bvMotion).toBe('paused');
        focus.value = true;
        visible.value = 'hidden';
        await nextTick();
        expect(document.documentElement.dataset.bvMotion).toBe('paused');
        visible.value = 'visible';
        await nextTick();
        expect(document.documentElement.dataset.bvMotion).toBe('active');
    });

    it('restores the prior document attribute when the app scope stops', () => {
        focus = ref(true);
        visible = ref('visible');
        document.documentElement.dataset.bvMotion = 'previous';
        scope = effectScope();
        scope.run(useAppMotion);
        scope.stop();
        expect(document.documentElement.dataset.bvMotion).toBe('previous');
        scope = effectScope();
        document.documentElement.removeAttribute('data-bv-motion');
        scope.run(useAppMotion);
        scope.stop();
        expect(document.documentElement.hasAttribute('data-bv-motion')).toBe(
            false
        );
    });
});
