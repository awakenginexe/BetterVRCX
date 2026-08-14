<template>
    <div class="space-y-6">
        <SettingsGroup title="VRChat Profile Backdrops">
            <template #description>
                <p class="text-xs text-muted-foreground">
                    Display official VRChat+ profile background textures or custom color gradients when inspecting user
                    profiles. Features a frosted Apple Glass design system for profile content cards.
                </p>
            </template>

            <SettingsItem
                label="VRChat Profile Backgrounds"
                description="Show profile backgrounds in user dialogs, e.g. color gradient or VRC+ backdrop texture.">
                <Switch
                    :model-value="displayVRCProfileBackgrounds"
                    aria-label="VRChat Profile Backgrounds"
                    @update:model-value="setDisplayVRCProfileBackgrounds" />
            </SettingsItem>

            <template v-if="displayVRCProfileBackgrounds">
                <SettingsItem
                    label="Backdrop Overlay Opacity"
                    description="Adjust the darkness of the backdrop overlay to balance background artwork with profile card contrast.">
                    <NumberField
                        v-model="profileBackgroundOpacity"
                        :step="0.1"
                        :min="0"
                        :max="1"
                        :format-options="{ maximumFractionDigits: 2 }"
                        class="w-32"
                        @update:model-value="setProfileBackgroundOpacity">
                        <NumberFieldContent>
                            <NumberFieldDecrement />
                            <NumberFieldInput />
                            <NumberFieldIncrement />
                        </NumberFieldContent>
                    </NumberField>
                </SettingsItem>
            </template>
        </SettingsGroup>
    </div>
</template>

<script setup>
    import { storeToRefs } from 'pinia';
    import { useAppearanceSettingsStore } from '@/stores';
    import { Switch } from '@/components/ui/switch';
    import {
        NumberField,
        NumberFieldContent,
        NumberFieldDecrement,
        NumberFieldIncrement,
        NumberFieldInput
    } from '@/components/ui/number-field';
    import SettingsGroup from '../../views/Settings/components/SettingsGroup.vue';
    import SettingsItem from '../../views/Settings/components/SettingsItem.vue';

    const appearanceSettingsStore = useAppearanceSettingsStore();
    const { displayVRCProfileBackgrounds, profileBackgroundOpacity } = storeToRefs(appearanceSettingsStore);
    const { setDisplayVRCProfileBackgrounds, setProfileBackgroundOpacity } = appearanceSettingsStore;
</script>
