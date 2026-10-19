<template>
    <div class="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
        <span v-if="counts">{{ t('instance_improvements.active_counts', counts) }}</span>
        <span v-else-if="loading">{{ t('common.loading') }}</span>
        <span v-else-if="failed">{{ t('instance_improvements.counts_failed') }}</span>
    </div>
</template>

<script setup>
    import { onBeforeUnmount, ref, watch } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { instanceRequest } from '../../api';

    const props = defineProps({ active: { type: Boolean, default: true } });
    const { t } = useI18n();
    const counts = ref(null);
    const failed = ref(false);
    const loading = ref(false);
    let fetchedAt = 0;
    let generation = 0;
    watch(
        () => props.active,
        async (active) => {
            if (!active || loading.value || Date.now() - fetchedAt < 60000) return;
            const token = ++generation;
            loading.value = true;
            failed.value = false;
            try {
                const { json } = await instanceRequest.getInstanceCount();
                if (token !== generation) return;
                if (!Number.isFinite(json?.instances) || !Number.isFinite(json?.events))
                    throw new Error('Invalid instance counts');
                counts.value = { instances: json.instances, events: json.events };
                fetchedAt = Date.now();
            } catch (error) {
                if (token === generation) failed.value = true;
                console.error('Failed to fetch active instance counts:', error);
            } finally {
                if (token === generation) loading.value = false;
            }
        },
        { immediate: true }
    );
    onBeforeUnmount(() => {
        generation++;
    });
</script>
