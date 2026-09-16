<template>
    <button
        type="button"
        :data-world-id="world.id"
        class="bv-entity-card group overflow-hidden text-left transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-primary"
        @click="$emit('open', world.id)">
        <div class="aspect-video overflow-hidden bg-muted relative">
            <img
                v-if="artwork && !imageFailed"
                :src="artwork"
                alt=""
                loading="lazy"
                class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                @error="imageFailed = true" />

            <Globe v-else class="absolute inset-0 m-auto size-10 text-muted-foreground/40" aria-hidden="true" />
        </div>

        <div class="p-3 space-y-1">
            <h3 class="font-semibold truncate" :title="world.name">{{ world.name }}</h3>

            <p v-if="world.visitCount" class="text-xs text-muted-foreground">
                {{ t('world_hub.visits', { count: world.visitCount }) }} ·
                {{ t('world_hub.hours', { count: Math.round(((world.totalTime || 0) / 3600000) * 10) / 10 }) }}
            </p>

            <p v-if="world.lastVisit" class="text-xs text-muted-foreground">
                {{ t('world_hub.last_visit') }} <Timer :epoch="Date.parse(world.lastVisit)" />
            </p>
        </div>
    </button>
</template>

<script setup>
    import { computed, ref, watch } from 'vue';

    import { Globe } from 'lucide-vue-next';

    import { useI18n } from 'vue-i18n';

    import Timer from '../../components/Timer.vue';

    const props = defineProps({ world: { type: Object, required: true } });

    defineEmits(['open']);

    const { t } = useI18n();

    const imageFailed = ref(false);

    const artwork = computed(() => props.world.thumbnailImageUrl || props.world.imageUrl);

    watch(artwork, () => {
        imageFailed.value = false;
    });
</script>
