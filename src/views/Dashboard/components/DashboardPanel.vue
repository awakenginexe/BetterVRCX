<template>
    <div class="dashboard-panel-shell relative flex min-h-0 flex-1 overflow-hidden rounded-lg border bg-card">
        <template v-if="isEditing">
            <Button
                v-if="showRemove"
                variant="ghost"
                size="icon-sm"
                class="absolute right-1 top-1 z-20"
                :ariaLabel="t('common.actions.remove')"
                @click="emit('remove')">
                <X class="size-4" />
            </Button>
            <div class="flex w-full min-h-0 flex-col items-center justify-center gap-2 p-3">
                <template v-if="panelKey">
                    <div class="flex items-center gap-2 text-base text-muted-foreground">
                        <i v-if="panelIcon" :class="panelIcon" class="text-base" />
                        <span>{{ panelLabel }}</span>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            :ariaLabel="t('common.actions.delete')"
                            @click="clearPanel">
                            <Trash2 class="size-3.5" />
                        </Button>
                    </div>
                </template>
                <template v-else>
                    <span class="text-base text-muted-foreground">{{ t('dashboard.panel.not_selected') }}</span>
                    <Button variant="outline" @click="openSelector">
                        {{ t('dashboard.panel.select') }}
                    </Button>
                </template>
            </div>
        </template>

        <template v-else-if="panelKey && panelComponent">
            <div class="dashboard-panel flex h-full w-full min-h-0 flex-col">
                <header class="dashboard-panel__header">
                    <span class="flex min-w-0 items-center gap-1.5">
                        <i v-if="panelIcon" :class="panelIcon" aria-hidden="true" />
                        <span class="truncate">{{ panelLabel }}</span>
                    </span>
                    <span class="bv-badge">{{ panelKindLabel }}</span>
                </header>
                <component :is="panelComponent" v-bind="widgetProps" />
            </div>
        </template>

        <div v-else class="flex w-full items-center justify-center text-sm text-muted-foreground">
            {{ t('dashboard.panel.not_configured') }}
        </div>

        <PanelSelector
            :open="selectorOpen"
            :current-key="panelData"
            @select="handleSelect"
            @close="selectorOpen = false" />
    </div>
</template>

<script setup>
    import { computed, ref } from 'vue';
    import { Trash2, X } from 'lucide-vue-next';
    import { useI18n } from 'vue-i18n';

    import { Button } from '@/components/ui/button';
    import { navDefinitions } from '@/shared/constants/ui';

    import PanelSelector from './PanelSelector.vue';
    import { panelComponentMap } from './panelRegistry';

    const props = defineProps({
        panelData: {
            type: [String, Object],
            default: null
        },
        isEditing: {
            type: Boolean,
            default: false
        },
        showRemove: {
            type: Boolean,
            default: false
        }
    });

    const emit = defineEmits(['select', 'remove']);
    const { t } = useI18n();
    const selectorOpen = ref(false);

    // Extract key from string or object format
    const panelKey = computed(() => {
        if (!props.panelData) return null;
        if (typeof props.panelData === 'string') return props.panelData;
        return props.panelData.key || null;
    });

    const panelConfig = computed(() => {
        if (!props.panelData || typeof props.panelData === 'string') return {};
        return props.panelData.config || {};
    });

    const isWidget = computed(() => {
        return panelKey.value && panelKey.value.startsWith('widget:');
    });

    const panelComponent = computed(() => {
        if (!panelKey.value) return null;
        return panelComponentMap[panelKey.value] || null;
    });

    const widgetProps = computed(() => {
        if (!isWidget.value) return {};
        return {
            config: panelConfig.value,
            configUpdater: (newConfig) => emitConfigUpdate(newConfig)
        };
    });

    const widgetDefs = {
        'widget:feed': { icon: 'ri-rss-line', labelKey: 'dashboard.widget.feed' },
        'widget:game-log': { icon: 'ri-history-line', labelKey: 'dashboard.widget.game_log' },
        'widget:instance': { icon: 'ri-group-3-line', labelKey: 'dashboard.widget.instance' }
    };

    const panelOption = computed(() => {
        if (!panelKey.value) return null;
        if (widgetDefs[panelKey.value]) return widgetDefs[panelKey.value];
        return navDefinitions.find((def) => def.key === panelKey.value) || null;
    });

    const panelLabel = computed(() => {
        if (!panelOption.value?.labelKey) return panelKey.value || '';
        return t(panelOption.value.labelKey);
    });

    const panelIcon = computed(() => panelOption.value?.icon || '');
    const panelKindLabel = computed(() =>
        t(isWidget.value ? 'dashboard.selector.widgets' : 'dashboard.selector.pages')
    );

    function emitConfigUpdate(newConfig) {
        emit('select', { key: panelKey.value, config: newConfig });
    }

    const openSelector = () => {
        selectorOpen.value = true;
    };

    const clearPanel = () => {
        emit('select', null);
    };

    const handleSelect = (value) => {
        emit('select', value);
        selectorOpen.value = false;
    };
</script>

<style scoped>
    .dashboard-panel-shell {
        container-type: inline-size;
    }

    .dashboard-panel__header {
        display: flex;
        min-height: 2rem;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        padding: 0.375rem 0.625rem;
        border-bottom: 1px solid var(--bv-border);
        background: color-mix(in srgb, var(--bv-bg-control) 86%, transparent);
        color: var(--bv-text-muted);
        font-size: 0.75rem;
        font-weight: 650;
    }

    .dashboard-panel :deep(.x-container) {
        flex: 1;
        min-height: 0;
        height: 100%;
        margin: 0;
        border: none;
        border-radius: 0;
        background: transparent;
    }

    /* Compact pagination for dashboard panels */
    .dashboard-panel :deep(.dt-pagination) {
        margin-top: 0.25rem;
        margin-bottom: 0;
        gap: 0.25rem;
        justify-content: center;
    }

    /* Hide page-size selector + spacer in dashboard */
    .dashboard-panel :deep(.dt-pagination-sizes),
    .dashboard-panel :deep(.dt-pagination-spacer) {
        display: none;
    }

    /* Hide prev/next text, keep icon only */
    .dashboard-panel :deep([data-slot='pagination-previous'] span),
    .dashboard-panel :deep([data-slot='pagination-next'] span) {
        display: none;
    }

    /* Shrink prev/next buttons */
    .dashboard-panel :deep([data-slot='pagination-previous']),
    .dashboard-panel :deep([data-slot='pagination-next']) {
        padding-inline: 0.25rem;
        min-width: 1.75rem;
        height: 1.75rem;
    }

    /* Shrink page number buttons */
    .dashboard-panel :deep([data-slot='pagination-item']) {
        min-width: 1.75rem;
        height: 1.75rem;
        font-size: 0.75rem;
    }

    /* Shrink ellipsis */
    .dashboard-panel :deep([data-slot='pagination-ellipsis']) {
        width: 1.75rem;
        height: 1.75rem;
    }
</style>
