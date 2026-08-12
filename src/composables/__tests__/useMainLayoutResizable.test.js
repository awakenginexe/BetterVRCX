import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

vi.mock('pinia', () => ({ storeToRefs: (store) => store }));
vi.mock('../../stores', () => ({
    useAppearanceSettingsStore: () => ({ isSideBarTabShow: ref(true) })
}));

import { useMainLayoutResizable } from '../useMainLayoutResizable';

describe('useMainLayoutResizable', () => {
    it('defines native pixel targets for the expanded and compact right rail', () => {
        const layout = useMainLayoutResizable();

        expect(layout.asideDefaultSize).toBe(260);
        expect(layout.asideCollapsedSize).toBe(60);
        expect(layout.asideSizeUnit).toBe('px');
        expect(layout.asideMinSize).toBe(260);
        expect(layout.asideMaxSize).toBe(700);
        expect(layout.mainDefaultSize).toBeUndefined();
        expect(layout.isAsideCollapsed([740, 60])).toBe(true);
        expect(layout.isAsideCollapsed([540, 260])).toBe(false);
    });
});
