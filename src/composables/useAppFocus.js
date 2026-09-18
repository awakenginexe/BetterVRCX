import { ref } from 'vue';

const isAppFocused = ref(true);
let initialized = false;

function updateFocusState(focused) {
    isAppFocused.value = focused;
}

export function useAppFocus() {
    if (!initialized && typeof window !== 'undefined') {
        initialized = true;
        isAppFocused.value =
            typeof document === 'undefined' || document.hasFocus();
        window.addEventListener('focus', () => updateFocusState(true));
        window.addEventListener('blur', () => updateFocusState(false));
    }

    return { isAppFocused };
}
