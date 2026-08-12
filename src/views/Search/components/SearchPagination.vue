<template>
    <nav v-if="show" class="search-pagination bv-surface-raised" :aria-label="t('nav_tooltip.search')">
        <ButtonGroup class="shadow-lg rounded-lg">
            <Button
                class="bv-focus-ring"
                variant="outline"
                size="sm"
                :aria-label="t('table.pagination.previous')"
                :disabled="prevDisabled"
                @click="$emit('prev')">
                <ArrowLeft />
                <Kbd class="ml-1">{{ isMac ? '⌥' : 'Alt' }}</Kbd>
                <Kbd>←</Kbd>
            </Button>
            <Button
                class="bv-focus-ring"
                variant="outline"
                size="sm"
                :aria-label="t('table.pagination.next')"
                :disabled="nextDisabled"
                @click="$emit('next')">
                <Kbd class="ml-1">{{ isMac ? '⌥' : 'Alt' }}</Kbd>
                <Kbd>→</Kbd>
                <ArrowRight />
            </Button>
        </ButtonGroup>
    </nav>
</template>

<script setup>
    import { ArrowLeft, ArrowRight } from 'lucide-vue-next';
    import { Button } from '@/components/ui/button';
    import { ButtonGroup } from '@/components/ui/button-group';
    import { Kbd } from '@/components/ui/kbd';
    import { useI18n } from 'vue-i18n';

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const { t } = useI18n();

    defineProps({
        show: { type: Boolean, default: false },
        prevDisabled: { type: Boolean, default: true },
        nextDisabled: { type: Boolean, default: true }
    });

    defineEmits(['prev', 'next']);
</script>

<style scoped>
    .search-pagination {
        display: flex;
        flex: none;
        align-items: center;
        justify-content: center;
        min-height: 54px;
        margin-top: 8px;
        border-radius: 10px;
    }
</style>
