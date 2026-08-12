<template>
    <div
        data-testid="dashboard-row"
        :data-direction="row.direction"
        class="dashboard-row relative h-full min-h-[180px]">
        <div v-if="isEditing" class="dashboard-row__layout" data-testid="dashboard-row-layout">
            <span class="dashboard-row__layout-preview" :data-direction="row.direction" aria-hidden="true">
                <i />
                <i v-if="row.panels.length === 2" />
            </span>
            <span>{{ layoutLabel }}</span>
        </div>
        <div
            v-if="isEditing"
            class="dashboard-row__builder flex h-full gap-2"
            :class="isVertical ? 'flex-col' : 'flex-row'">
            <DashboardPanel
                v-for="(panelItem, panelIndex) in row.panels"
                :key="panelIndex"
                :panel-data="panelItem"
                :is-editing="true"
                :show-remove="true"
                :class="panelEditClass"
                @select="(value) => emit('update-panel', rowIndex, panelIndex, value)"
                @remove="emit('remove-panel', rowIndex, panelIndex)" />
        </div>

        <ResizablePanelGroup
            v-else-if="row.panels.length === 2"
            :direction="isVertical ? 'vertical' : 'horizontal'"
            :auto-save-id="`dashboard-${dashboardId}-row-${rowIndex}`"
            class="dashboard-row__split h-full min-h-[180px]">
            <ResizablePanel :default-size="50" :min-size="20">
                <DashboardPanel
                    :panel-data="row.panels[0]"
                    class="h-full"
                    @select="(value) => emit('update-panel', rowIndex, 0, value)" />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel :default-size="50" :min-size="20">
                <DashboardPanel
                    :panel-data="row.panels[1]"
                    class="h-full"
                    @select="(value) => emit('update-panel', rowIndex, 1, value)" />
            </ResizablePanel>
        </ResizablePanelGroup>

        <div v-else class="h-full">
            <DashboardPanel
                :panel-data="row.panels[0]"
                class="h-full"
                @select="(value) => emit('update-panel', rowIndex, 0, value)" />
        </div>
    </div>
</template>

<script setup>
    import { computed } from 'vue';
    import { useI18n } from 'vue-i18n';

    import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

    import DashboardPanel from './DashboardPanel.vue';

    const props = defineProps({
        row: {
            type: Object,
            required: true
        },
        rowIndex: {
            type: Number,
            required: true
        },
        dashboardId: {
            type: String,
            required: true
        },
        isEditing: {
            type: Boolean,
            default: false
        }
    });

    const emit = defineEmits(['update-panel', 'remove-panel']);
    const { t } = useI18n();

    const isVertical = computed(() => props.row.direction === 'vertical');

    const panelEditClass = computed(() => {
        if (props.row.panels.length === 1) {
            return 'w-full';
        }
        return isVertical.value ? 'h-1/2' : 'w-1/2';
    });

    const layoutLabel = computed(() => {
        if (props.row.panels.length === 1) {
            return t('dashboard.actions.add_full_row');
        }
        return t(isVertical.value ? 'dashboard.actions.add_vertical_row' : 'dashboard.actions.add_split_row');
    });
</script>

<style scoped>
    .dashboard-row {
        overflow: hidden;
        border: 1px solid color-mix(in srgb, var(--bv-border) 80%, transparent);
        border-radius: 12px;
        background: var(--bv-bg-surface);
    }

    .dashboard-row__layout {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        min-height: 2rem;
        padding: 0.375rem 0.625rem;
        border-bottom: 1px solid var(--bv-border);
        color: var(--bv-text-muted);
        font-size: 0.6875rem;
        font-weight: 650;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }

    .dashboard-row__layout-preview {
        display: flex;
        width: 1.75rem;
        height: 0.875rem;
        gap: 2px;
    }

    .dashboard-row__layout-preview i {
        display: block;
        flex: 1;
        border: 1px solid var(--bv-accent-soft);
        border-radius: 2px;
    }

    .dashboard-row__layout-preview[data-direction='vertical'] {
        flex-direction: column;
    }

    .dashboard-row__builder {
        min-height: calc(180px - 2rem);
        padding: 0.5rem;
    }
</style>
