<template>
    <main class="h-full overflow-y-auto p-5 md:p-8">
        <div class="max-w-[1500px] mx-auto space-y-8">
            <header class="flex items-start justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-bold tracking-tight">{{ t('nav_tooltip.world') }}</h1>
                    <p class="text-sm text-muted-foreground mt-1">{{ t('world_hub.description') }}</p>
                </div>
                <Button variant="outline" size="sm" :disabled="loading" @click="refresh">{{
                    t('world_hub.refresh')
                }}</Button>
            </header>
            <p v-if="failed" role="status" class="text-sm text-muted-foreground">{{ t('world_hub.unavailable') }}</p>
            <section v-for="section in sections" :key="section.key" :data-section="section.key" class="space-y-3">
                <div class="flex items-center justify-between gap-3">
                    <h2 class="text-lg font-semibold">{{ t(`world_hub.${section.key}`) }}</h2>
                    <RouterLink
                        v-if="section.key === 'library'"
                        :to="{ name: 'favorite-worlds' }"
                        class="text-sm text-primary hover:underline"
                        >{{ t('nav_tooltip.favorite_worlds') }}</RouterLink
                    >
                </div>
                <p
                    v-if="!section.worlds.length"
                    class="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                    {{ t(loading ? 'world_hub.loading' : `world_hub.empty_${section.key}`) }}
                </p>
                <div
                    v-else
                    class="grid grid-cols-1 @[480px]:grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                    <WorldCard v-for="world in section.worlds" :key="world.id" :world="world" @open="openWorld" />
                </div>
            </section>
        </div>
    </main>
</template>
<script setup>
    import { computed } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { RouterLink } from 'vue-router';
    import { Button } from '../../components/ui/button';
    import WorldCard from './WorldCard.vue';
    import { useWorldHub } from './useWorldHub';
    const props = defineProps({ section: { type: String, default: 'recent' } });
    const { t } = useI18n();
    const { recent, updated, library, loading, failed, refresh, openWorld } = useWorldHub();
    const sections = computed(() =>
        [
            { key: 'recent', worlds: recent.value },
            { key: 'updated', worlds: updated.value },
            { key: 'library', worlds: library.value }
        ].filter((section) => section.key === props.section)
    );
</script>
