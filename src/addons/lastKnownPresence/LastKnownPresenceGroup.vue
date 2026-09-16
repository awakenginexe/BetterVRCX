<template>
    <section
        v-if="enabled && observations.length"
        class="last-known-presence relative overflow-hidden my-2 rounded-lg border border-dashed border-muted-foreground/30 p-2 group"
        :title="t('last_known_presence.uncertain')">
        <!-- Historical World Image Background (grayscale, transitions to color on hover) -->
        <div
            v-if="worldImageUrl"
            class="absolute inset-0 z-0 bg-cover bg-center grayscale saturate-0 opacity-65 group-hover:grayscale-0 group-hover:saturate-100 group-hover:opacity-85 transition-all duration-300 pointer-events-none scale-105"
            :style="{
                backgroundImage: `url(${worldImageUrl})`
            }" />
        <div
            v-if="worldImageUrl"
            class="absolute inset-0 z-0 bg-gradient-to-t from-black/85 via-black/60 to-black/40 pointer-events-none" />

        <div class="relative z-10">
            <div class="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <History class="size-3 shrink-0" aria-hidden="true" />
                {{
                    t(historicalOnly ? 'last_known_presence.last_known_instance' : 'last_known_presence.might_be_here')
                }}
            </div>
            <button
                v-if="showWorld"
                type="button"
                class="block text-sm text-left hover:underline drop-shadow-sm font-medium"
                @click="showWorldDialog(first.worldId)">
                {{ first.worldName || first.worldId }}
            </button>
            <span v-if="showWorld" class="block text-xs text-muted-foreground">
                {{ t('last_known_presence.instance', { instance: instanceName }) }}
            </span>
            <div class="flex flex-wrap">
                <FriendItem
                    v-for="observation in observations"
                    :key="observation.userId"
                    class="w-[200px] max-w-full"
                    :friend="friends.get(observation.userId)"
                    :observation="observation"
                    :is-group-by-instance="true" />
            </div>
        </div>
    </section>
</template>

<script setup>
    import { computed } from 'vue';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';
    import { History } from 'lucide-vue-next';
    import { useFriendStore, useWorldStore } from '../../stores';
    import { showWorldDialog } from '../../coordinators/worldCoordinator';
    import { parseLocation } from '../../shared/utils/locationParser';
    import { useLastKnownPresenceStore } from './store';
    import { resolveWorldArtwork } from './presentation';
    import { queryRequest } from '../../api';
    import FriendItem from '../../views/Sidebar/components/FriendItem.vue';

    const props = defineProps({
        observations: {
            type: /** @type {import('vue').PropType<import('./store').Observation[]>} */ (Array),
            required: true
        },
        historicalOnly: { type: Boolean, default: true },
        showWorld: { type: Boolean, default: true }
    });
    const { t } = useI18n();
    const { enabled } = storeToRefs(useLastKnownPresenceStore());
    const { friends } = storeToRefs(useFriendStore());
    const worldStore = useWorldStore();
    const first = computed(() => props.observations[0]);
    const instanceName = computed(() => parseLocation(first.value?.locationTag).instanceName);
    const worldImageUrl = computed(() =>
        resolveWorldArtwork(worldStore, first.value?.worldId, first.value?.locationTag, queryRequest)
    );
</script>
