<template>
    <section
        v-if="metadata?.sources?.length"
        class="w-full my-3 rounded-lg border border-border p-3 text-xs"
        aria-label="Avatar database information">
        <div class="flex flex-wrap items-center gap-1.5">
            <span class="text-muted-foreground">{{ t('avatar_search_v2.found_in') }}</span>
            <TooltipWrapper
                v-for="source in metadata.sources"
                :key="source"
                :content="t('avatar_search_v2.supplemental_hint')">
                <Badge variant="outline" class="text-xs">{{ sourceLabel(source) }}</Badge>
            </TooltipWrapper>
        </div>
        <details v-if="facts.length" class="mt-2">
            <summary class="cursor-pointer font-medium bv-focus-ring">
                {{ t('avatar_search_v2.database_details') }}
            </summary>
            <p class="mt-2 mb-3 text-muted-foreground">{{ t('avatar_search_v2.supplemental_hint') }}</p>
            <dl class="grid grid-cols-[minmax(100px,1fr)_minmax(0,2fr)] gap-x-3 gap-y-2">
                <template v-for="(fact, index) in facts" :key="`${fact.source}-${fact.key}-${index}`">
                    <dt class="text-muted-foreground">{{ t(`avatar_search_v2.${fact.key}`) }}</dt>
                    <dd class="min-w-0 break-words">
                        {{ fact.date ? formatDateFilter(fact.value, 'long') : fact.value }}
                        <span class="ml-1 text-muted-foreground">· {{ sourceLabel(fact.source) }}</span>
                    </dd>
                </template>
            </dl>
        </details>
    </section>
</template>

<script setup>
    import { computed } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { Badge } from '@/components/ui/badge';
    import { TooltipWrapper } from '@/components/ui/tooltip';
    import { formatDateFilter } from '../../../shared/utils';
    import { getAvatarDatabaseFacts } from '../../../services/avatarSearch/detailFacts';
    import { sourceLabel } from '../../../services/avatarSearch/providers';

    const props = defineProps({
        avatar: { type: Object, required: true },
        metadata: { type: Object, default: null }
    });
    const { t } = useI18n();
    const facts = computed(() => getAvatarDatabaseFacts(props.avatar, props.metadata));
</script>
