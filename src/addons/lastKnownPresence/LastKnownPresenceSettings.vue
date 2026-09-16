<template>
    <SettingsGroup :title="t('last_known_presence.title')">
        <SettingsItem :label="t('last_known_presence.title')" :description="t('last_known_presence.description')">
            <Switch
                :model-value="enabled"
                :aria-label="t('last_known_presence.title')"
                @update:model-value="setEnabled" />
        </SettingsItem>
        <template v-if="enabled">
            <p class="text-xs text-muted-foreground">
                {{ t('last_known_presence.last_seen_count', { count: hints.length }) }}
            </p>
            <p v-if="!observationGroups.length" class="text-xs text-muted-foreground">
                {{ t('last_known_presence.empty') }}
            </p>
            <LastKnownPresenceGroup
                v-for="group in observationGroups"
                :key="group.locationTag"
                :observations="group.observations" />
        </template>
    </SettingsGroup>
</template>

<script setup>
    import { computed } from 'vue';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';

    import { Switch } from '@/components/ui/switch';
    import SettingsGroup from '../../views/Settings/components/SettingsGroup.vue';
    import SettingsItem from '../../views/Settings/components/SettingsItem.vue';
    import { useLastKnownPresenceStore } from './store';
    import { useFriendStore, useLocationStore } from '../../stores';
    import { getPresenceHints, groupPresenceHints } from './presentation';
    import LastKnownPresenceGroup from './LastKnownPresenceGroup.vue';

    const { t } = useI18n();
    const lastKnownPresenceStore = useLastKnownPresenceStore();
    const { enabled, observations } = storeToRefs(lastKnownPresenceStore);
    const { setEnabled } = lastKnownPresenceStore;
    const friendStore = useFriendStore();
    const { lastLocation } = storeToRefs(useLocationStore());
    const hints = computed(() =>
        getPresenceHints(enabled.value, observations.value, friendStore.friends, lastLocation.value.friendList)
    );
    const observationGroups = computed(() => groupPresenceHints(hints.value));
</script>
