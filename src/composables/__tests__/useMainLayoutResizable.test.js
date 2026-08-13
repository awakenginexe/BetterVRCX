import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

const mocks = {
    setRightSidebarWidth: vi.fn(),
    rightSidebarWidth: ref(320)
};

vi.mock('pinia', () => ({ storeToRefs: (store) => store }));
vi.mock('../../stores', () => ({
    useAppearanceSettingsStore: () => ({
        isSideBarTabShow: ref(true),
        rightSidebarWidth: mocks.rightSidebarWidth,
        setRightSidebarWidth: mocks.setRightSidebarWidth
    })
}));

import { useMainLayoutResizable } from '../useMainLayoutResizable';

describe('useMainLayoutResizable', () => {
    it('defines native pixel targets and uses rightSidebarWidth for default size', () => {
        const layout = useMainLayoutResizable();

        expect(layout.asideDefaultSize.value).toBe(320);
        expect(layout.asideCollapsedSize).toBe(60);
        expect(layout.asideSizeUnit).toBe('px');
        expect(layout.asideMinSize).toBe(260);
        expect(layout.asideMaxSize).toBe(700);
        expect(layout.isAsideCollapsed([740, 60])).toBe(true);
        expect(layout.isAsideCollapsed([540, 260])).toBe(false);

        layout.handleLayout([600, 380]);
        expect(mocks.setRightSidebarWidth).toHaveBeenCalledWith(380);
    });
});
