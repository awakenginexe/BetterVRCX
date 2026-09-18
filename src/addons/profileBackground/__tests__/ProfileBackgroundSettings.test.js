import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import ProfileBackgroundSettings from '../ProfileBackgroundSettings.vue';

const displayVRCProfileThemes = ref(false);
const displayVRCProfileEffects = ref(true);
const alwaysAnimateVRCProfileEffects = ref(false);
const displayVRCProfileBackgrounds = ref(true);
const profileBackgroundOpacity = ref(0.5);
const setDisplayVRCProfileThemes = vi.fn(() => {
    displayVRCProfileThemes.value = !displayVRCProfileThemes.value;
});
const setDisplayVRCProfileEffects = vi.fn(() => {
    displayVRCProfileEffects.value = !displayVRCProfileEffects.value;
});
const setAlwaysAnimateVRCProfileEffects = vi.fn(() => {
    alwaysAnimateVRCProfileEffects.value =
        !alwaysAnimateVRCProfileEffects.value;
});
const setDisplayVRCProfileBackgrounds = vi.fn(() => {
    displayVRCProfileBackgrounds.value = !displayVRCProfileBackgrounds.value;
});
const setProfileBackgroundOpacity = vi.fn((val) => {
    profileBackgroundOpacity.value = val;
});
const saveOpenVROption = vi.fn();

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key) => key })
}));

vi.mock('pinia', async (i) => ({ ...(await i()), storeToRefs: (s) => s }));
vi.mock('@/stores', () => ({
    useAppearanceSettingsStore: () => ({
        displayVRCProfileThemes,
        displayVRCProfileEffects,
        alwaysAnimateVRCProfileEffects,
        displayVRCProfileBackgrounds,
        profileBackgroundOpacity,
        setDisplayVRCProfileThemes,
        setDisplayVRCProfileEffects,
        setAlwaysAnimateVRCProfileEffects,
        setDisplayVRCProfileBackgrounds,
        setProfileBackgroundOpacity
    }),
    useVrStore: () => ({
        saveOpenVROption
    })
}));

vi.mock('@/components/ui/switch', () => ({
    Switch: {
        props: ['modelValue', 'ariaLabel'],
        emits: ['update:modelValue'],
        template:
            '<button data-testid="switch" :aria-checked="modelValue" @click="$emit(\'update:modelValue\', !modelValue)">switch</button>'
    }
}));

vi.mock('@/components/ui/number-field', () => ({
    NumberField: {
        props: ['modelValue'],
        emits: ['update:modelValue'],
        template: '<div data-testid="number-field"><slot /></div>'
    },
    NumberFieldContent: { template: '<div><slot /></div>' },
    NumberFieldDecrement: { template: '<button>-</button>' },
    NumberFieldIncrement: { template: '<button>+</button>' },
    NumberFieldInput: { template: '<input />' }
}));

vi.mock('../../views/Settings/components/SettingsGroup.vue', () => ({
    default: {
        props: ['title'],
        template:
            '<div data-testid="settings-group"><h3>{{ title }}</h3><slot name="description" /><slot /></div>'
    }
}));

vi.mock('../../views/Settings/components/SettingsItem.vue', () => ({
    default: {
        props: ['label', 'description'],
        template:
            '<div data-testid="settings-item"><label>{{ label }}</label><p>{{ description }}</p><slot /></div>'
    }
}));

describe('ProfileBackgroundSettings.vue', () => {
    beforeEach(() => {
        displayVRCProfileThemes.value = false;
        displayVRCProfileEffects.value = true;
        alwaysAnimateVRCProfileEffects.value = false;
        displayVRCProfileBackgrounds.value = true;
        vi.clearAllMocks();
    });

    it('renders profile customization and backdrop settings groups and switches', () => {
        displayVRCProfileBackgrounds.value = true;
        const wrapper = mount(ProfileBackgroundSettings);
        expect(wrapper.text()).toContain('VRChat+ Profile Customization');
        expect(wrapper.text()).toContain('VRChat Profile Backdrops');
        expect(wrapper.text()).toContain('VRChat Profile Backgrounds');
        expect(wrapper.text()).toContain('VRChat Profile Effects');
        expect(wrapper.text()).not.toContain('vrcplus_profile_icons');
        expect(wrapper.text()).toContain(
            'Always animate decorations when unfocused'
        );
        expect(wrapper.findAll('[data-testid="switch"]').length).toBe(4);
        expect(wrapper.find('[data-testid="number-field"]').exists()).toBe(
            true
        );
    });

    it('toggles backdrop setting when switch is clicked', async () => {
        displayVRCProfileBackgrounds.value = true;
        const wrapper = mount(ProfileBackgroundSettings);
        const switches = wrapper.findAll('[data-testid="switch"]');
        await switches[3].trigger('click');
        expect(setDisplayVRCProfileBackgrounds).toHaveBeenCalled();
    });

    it('toggles profile themes and effects without an obsolete remote icon setting', async () => {
        const wrapper = mount(ProfileBackgroundSettings);
        const switches = wrapper.findAll('[data-testid="switch"]');
        await switches[0].trigger('click');
        expect(setDisplayVRCProfileThemes).toHaveBeenCalled();
        expect(saveOpenVROption).toHaveBeenCalled();

        await switches[2].trigger('click');
        expect(setAlwaysAnimateVRCProfileEffects).toHaveBeenCalled();

        await switches[1].trigger('click');
        expect(setDisplayVRCProfileEffects).toHaveBeenCalled();
    });

    it('hides opacity slider when displayVRCProfileBackgrounds is false', () => {
        displayVRCProfileBackgrounds.value = false;
        const wrapper = mount(ProfileBackgroundSettings);
        expect(wrapper.find('[data-testid="number-field"]').exists()).toBe(
            false
        );
    });
});
