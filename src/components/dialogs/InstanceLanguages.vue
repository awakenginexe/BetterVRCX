<template>
    <div v-if="languages.length" class="flex flex-col gap-1">
        <span>{{ t('instance_improvements.languages') }}</span>
        <span v-for="language in languages" :key="language.key" class="flex items-center gap-1.5">
            <span :class="['flags', 'inline-block', languageClass(language.flagKey)]" aria-hidden="true" />
            {{ language.name }}
            <span v-if="language.percent !== null" class="text-muted-foreground">
                {{ language.percent }}%<template v-if="language.count !== null">
                    · {{ t('instance_improvements.estimated_users', { count: language.count }) }}</template
                >
            </span>
        </span>
    </div>
</template>

<script setup>
    import { computed } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { useUserStore } from '../../stores';
    import { languageClass } from '../../shared/utils';
    import { getInstanceLanguages } from '../../shared/utils/instanceImprovements';

    const props = defineProps({ instance: { type: Object, default: null } });
    const { t } = useI18n();
    const userStore = useUserStore();
    const languages = computed(() => getInstanceLanguages(props.instance, userStore.subsetOfLanguages));
</script>
