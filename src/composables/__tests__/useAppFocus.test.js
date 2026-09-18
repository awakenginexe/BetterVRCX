import { afterEach, describe, expect, it, vi } from 'vitest';

describe('useAppFocus', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.resetModules();
    });

    it('tracks renderer focus without changing any application data state', async () => {
        vi.spyOn(document, 'hasFocus').mockReturnValue(true);
        const { useAppFocus } = await import('../useAppFocus');
        const { isAppFocused } = useAppFocus();

        expect(isAppFocused.value).toBe(true);

        window.dispatchEvent(new Event('blur'));
        expect(isAppFocused.value).toBe(false);

        window.dispatchEvent(new Event('focus'));
        expect(isAppFocused.value).toBe(true);
    });
});
