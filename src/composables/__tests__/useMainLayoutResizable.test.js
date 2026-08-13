import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

const mocks = {
    setRightSidebarWidth: vi.fn(),
    setIsRightSidebarCollapsed: vi.fn(),
    rightSidebarWidth: ref(320),
    isRightSidebarCollapsed: ref(false)
};

vi.mock('pinia', () => ({ storeToRefs: (store) => store }));
vi.mock('../../stores', () => ({
    useAppearanceSettingsStore: () => ({
        isSideBarTabShow: ref(true),
        rightSidebarWidth: mocks.rightSidebarWidth,
        isRightSidebarCollapsed: mocks.isRightSidebarCollapsed,
        setRightSidebarWidth: mocks.setRightSidebarWidth,
        setIsRightSidebarCollapsed: mocks.setIsRightSidebarCollapsed
    })
}));

import { useMainLayoutResizable } from '../useMainLayoutResizable';

describe('useMainLayoutResizable', () => {
    it('defines native pixel targets and uses rightSidebarWidth for default size', () => {
        mocks.isRightSidebarCollapsed.value = false;
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
        expect(mocks.setIsRightSidebarCollapsed).toHaveBeenCalledWith(false);

        layout.handleLayout([940, 60]);
        expect(mocks.setIsRightSidebarCollapsed).toHaveBeenCalledWith(true);
    });

    it('sets asideDefaultSize to 60px when isRightSidebarCollapsed is true', () => {
        mocks.isRightSidebarCollapsed.value = true;
        const layout = useMainLayoutResizable();

        expect(layout.asideDefaultSize.value).toBe(60);
        expect(layout.isAsideCollapsedStatic.value).toBe(true);
    });
});
