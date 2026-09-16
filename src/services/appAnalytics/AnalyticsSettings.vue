<template>
    <SettingsGroup :title="t('app_analytics.title')">
        <SettingsItem :label="t('app_analytics.title')" :description="t('app_analytics.description')">
            <Switch :model-value="enabled" :aria-label="t('app_analytics.title')" @update:model-value="setEnabled" />
        </SettingsItem>
    </SettingsGroup>
</template>
<script setup>
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';
    import { Switch } from '../../components/ui/switch';
    import SettingsGroup from '../../views/Settings/components/SettingsGroup.vue';
    import SettingsItem from '../../views/Settings/components/SettingsItem.vue';
    import { useAppAnalyticsStore } from './store';
    const { t } = useI18n();
    const store = useAppAnalyticsStore();
    const { enabled } = storeToRefs(store);
    const { setEnabled } = store;
</script>
