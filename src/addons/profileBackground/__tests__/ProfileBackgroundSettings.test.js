import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import ProfileBackgroundSettings from '../ProfileBackgroundSettings.vue';

const displayVRCPlusIconsAsAvatar = ref(false);
const displayVRCProfileThemes = ref(false);
const displayVRCProfileBackgrounds = ref(true);
const profileBackgroundOpacity = ref(0.5);
const setDisplayVRCPlusIconsAsAvatar = vi.fn(() => {
    displayVRCPlusIconsAsAvatar.value = !displayVRCPlusIconsAsAvatar.value;
});
const setDisplayVRCProfileThemes = vi.fn(() => {
    displayVRCProfileThemes.value = !displayVRCProfileThemes.value;
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
        displayVRCPlusIconsAsAvatar,
        displayVRCProfileThemes,
        displayVRCProfileBackgrounds,
        profileBackgroundOpacity,
        setDisplayVRCPlusIconsAsAvatar,
        setDisplayVRCProfileThemes,
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
    it('renders profile customization and backdrop settings groups and switches', () => {
        displayVRCProfileBackgrounds.value = true;
        const wrapper = mount(ProfileBackgroundSettings);
        expect(wrapper.text()).toContain('VRChat+ Profile Customization');
        expect(wrapper.text()).toContain('VRChat Profile Backdrops');
        expect(wrapper.text()).toContain('VRChat Profile Backgrounds');
        expect(wrapper.findAll('[data-testid="switch"]').length).toBe(3);
        expect(wrapper.find('[data-testid="number-field"]').exists()).toBe(
            true
        );
    });

    it('toggles backdrop setting when switch is clicked', async () => {
        displayVRCProfileBackgrounds.value = true;
        const wrapper = mount(ProfileBackgroundSettings);
        const switches = wrapper.findAll('[data-testid="switch"]');
        await switches[2].trigger('click');
        expect(setDisplayVRCProfileBackgrounds).toHaveBeenCalled();
    });

    it('toggles VRChat+ profile icons and themes settings when switches are clicked', async () => {
        const wrapper = mount(ProfileBackgroundSettings);
        const switches = wrapper.findAll('[data-testid="switch"]');
        await switches[0].trigger('click');
        expect(setDisplayVRCPlusIconsAsAvatar).toHaveBeenCalled();
        expect(saveOpenVROption).toHaveBeenCalled();

        await switches[1].trigger('click');
        expect(setDisplayVRCProfileThemes).toHaveBeenCalled();
    });

    it('hides opacity slider when displayVRCProfileBackgrounds is false', () => {
        displayVRCProfileBackgrounds.value = false;
        const wrapper = mount(ProfileBackgroundSettings);
        expect(wrapper.find('[data-testid="number-field"]').exists()).toBe(
            false
        );
    });
});
