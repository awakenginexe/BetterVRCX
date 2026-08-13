import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

import { useAppearanceSettingsStore } from '../stores';

export function useMainLayoutResizable() {
    const appearanceStore = useAppearanceSettingsStore();
    const { isSideBarTabShow, rightSidebarWidth, isRightSidebarCollapsed } =
        storeToRefs(appearanceStore);

    const asideCollapsedSize = 60;
    const asideSizeUnit = 'px';
    const asideMinSize = 260;
    const asideMaxSize = 700;

    const asideDefaultSize = computed(() => {
        if (isRightSidebarCollapsed?.value) {
            return asideCollapsedSize;
        }
        return rightSidebarWidth?.value || 260;
    });

    const isAsideCollapsed = (layout) =>
        Array.isArray(layout) &&
        layout.length >= 2 &&
        layout[layout.length - 1] <= asideCollapsedSize;

    const isAsideCollapsedState = ref(Boolean(isRightSidebarCollapsed?.value));

    watch(
        () => isRightSidebarCollapsed?.value,
        (collapsed) => {
            isAsideCollapsedState.value = Boolean(collapsed);
        }
    );

    const handleLayout = (sizes) => {
        if (!Array.isArray(sizes) || sizes.length < 2) {
            return;
        }
        const asideSize = sizes[sizes.length - 1];
        if (
            typeof asideSize !== 'number' ||
            Number.isNaN(asideSize) ||
            asideSize <= 0
        ) {
            return;
        }

        const collapsed = isAsideCollapsed(sizes);
        isAsideCollapsedState.value = collapsed;

        if (collapsed) {
            appearanceStore.setIsRightSidebarCollapsed?.(true);
        } else if (asideSize >= asideMinSize) {
            appearanceStore.setIsRightSidebarCollapsed?.(false);
            appearanceStore.setRightSidebarWidth?.(asideSize);
        }
    };

    const isAsideCollapsedStatic = computed(
        () =>
            !isSideBarTabShow.value ||
            isRightSidebarCollapsed?.value ||
            isAsideCollapsedState.value
    );

    return {
        asideDefaultSize,
        asideCollapsedSize,
        asideSizeUnit,
        asideMinSize,
        asideMaxSize,
        handleLayout,
        isAsideCollapsed,
        isAsideCollapsedStatic,
        isSideBarTabShow,
        isRightSidebarCollapsed
    };
}
