<template>
    <section class="w-full min-w-0 border-t mt-3 pt-3 pb-2 text-xs" :aria-label="t('dialog.avatar.performance.header')">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h3 class="font-medium text-[13px]">{{ t('dialog.avatar.performance.header') }}</h3>
            <Button
                variant="ghost"
                size="icon-sm"
                :disabled="refreshing || result.status === 'loading'"
                :aria-label="t('dialog.avatar.performance.refresh')"
                :title="t('dialog.avatar.performance.refresh')"
                @click="emit('refresh')">
                <RefreshCw class="size-3.5" />
            </Button>
        </div>
        <Tabs
            v-if="packages.length > 1"
            :model-value="selectedPlatform"
            @update:model-value="emit('update:selectedPlatform', $event)"
            class="mb-2">
            <TabsList :aria-label="t('dialog.avatar.performance.platform')" class="h-8">
                <TabsTrigger
                    v-for="pkg in packages"
                    :key="pkg.platform"
                    :value="pkg.platform"
                    class="text-xs px-3 py-1">
                    {{ platformLabel(pkg.platform) }}
                </TabsTrigger>
            </TabsList>
        </Tabs>
        <div v-if="packages.length" class="flex justify-between gap-3 mb-2">
            <span class="font-medium">{{ platformLabel(selectedPlatform) }}</span>
            <span
                v-if="result.rating"
                class="inline-flex items-center gap-1.5 rounded-sm border border-current/30 bg-current/10 px-1.5 py-0.5 font-medium"
                :class="ratingColor"
                data-testid="performance-rating">
                <span aria-hidden="true" class="size-1.5 shrink-0 rounded-full bg-current" />
                {{ result.rating }}
            </span>
        </div>
        <p v-if="result.status !== 'available'" role="status" class="py-1">
            {{ t(`dialog.avatar.performance.${result.status}`) }}
            <Button
                v-if="result.status === 'error'"
                variant="link"
                size="sm"
                :disabled="refreshing"
                @click="emit('refresh')">
                {{ t('dialog.avatar.performance.retry') }}
            </Button>
        </p>
        <template v-else>
            <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-x-8 gap-y-3">
                <div v-for="group in groups" :key="group.name" class="min-w-0">
                    <h4 class="font-medium mb-1">{{ t(`dialog.avatar.performance.groups.${group.name}`) }}</h4>
                    <dl>
                        <div v-for="field in group.fields" :key="field" class="flex justify-between gap-3 py-0.5">
                            <dt>{{ t(`dialog.avatar.performance.fields.${field}`) }}</dt>
                            <dd class="text-right tabular-nums min-w-0 break-words">
                                {{ formatPerformanceStat(field, result.stats[field], locale, t) }}
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>
            <p v-if="!groups.length" class="py-1">{{ t('dialog.avatar.performance.no_stats') }}</p>
            <div v-if="result.fetchedAt" class="mt-3 text-muted-foreground">
                {{
                    t('dialog.avatar.performance.updated', { date: new Date(result.fetchedAt).toLocaleString(locale) })
                }}
            </div>
        </template>
    </section>
</template>

<script setup>
    import { computed } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { RefreshCw } from 'lucide-vue-next';
    import { Button } from '@/components/ui/button';
    import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
    import { formatPerformanceStat, performanceGroups } from '../../../services/avatarPerformance/model';

    const props = defineProps({
        packages: {
            type: /** @type {import('vue').PropType<Array<{platform: string}>>} */ (Array),
            default: () => []
        },
        selectedPlatform: { type: String, default: '' },
        result: { type: Object, default: () => ({ status: 'unavailable' }) },
        refreshing: Boolean
    });
    const emit = defineEmits(['update:selectedPlatform', 'refresh']);
    const { t, locale } = useI18n();
    const platformLabel = (platform) => ({ standalonewindows: 'PC', android: 'Android', ios: 'iOS' })[platform];
    const ratingColor = computed(
        () =>
            ({
                excellent: 'text-emerald-400',
                good: 'text-green-400',
                medium: 'text-yellow-400',
                poor: 'text-orange-400',
                verypoor: 'text-red-400'
            })[props.result.rating?.replace(/\s/g, '').toLowerCase()] || 'text-muted-foreground'
    );
    const groups = computed(() =>
        performanceGroups
            .map(([name, fields]) => ({
                name,
                fields: fields.filter((field) => Object.hasOwn(props.result.stats || {}, field))
            }))
            .filter((group) => group.fields.length)
    );
</script>
