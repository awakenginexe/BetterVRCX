import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';

import { useAppearanceSettingsStore } from '../stores';

export function useMainLayoutResizable() {
    const appearanceStore = useAppearanceSettingsStore();
    const { isSideBarTabShow } = storeToRefs(appearanceStore);

    const asideDefaultSize = 260;
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
        isAsideCollapsedState.value = isAsideCollapsed(sizes);
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
