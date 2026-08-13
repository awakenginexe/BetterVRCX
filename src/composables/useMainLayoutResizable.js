import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';

import { useAppearanceSettingsStore } from '../stores';

export function useMainLayoutResizable() {
    const appearanceStore = useAppearanceSettingsStore();
    const { isSideBarTabShow, rightSidebarWidth } =
        storeToRefs(appearanceStore);

    const asideDefaultSize = computed(() => rightSidebarWidth?.value || 260);
    const asideCollapsedSize = 60;
    const asideSizeUnit = 'px';
    const asideMinSize = 260;
    const asideMaxSize = 700;

    const isAsideCollapsed = (layout) =>
        Array.isArray(layout) &&
        layout.length >= 2 &&
        layout[layout.length - 1] <= asideCollapsedSize;

    const isAsideCollapsedState = ref(false);
    const handleLayout = (sizes) => {
        if (!Array.isArray(sizes) || sizes.length < 2) {
            isAsideCollapsedState.value = false;
            return;
        }
        const asideSize = sizes[sizes.length - 1];
        isAsideCollapsedState.value = isAsideCollapsed(sizes);
        if (typeof asideSize === 'number' && asideSize >= asideMinSize) {
            appearanceStore.setRightSidebarWidth?.(asideSize);
        }
    };

    const isAsideCollapsedStatic = computed(
        () => !isSideBarTabShow.value || isAsideCollapsedState.value
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
        isSideBarTabShow
    };
}
