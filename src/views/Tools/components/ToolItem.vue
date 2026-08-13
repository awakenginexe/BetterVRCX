<script setup>
    import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';

    defineProps({
        icon: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
        pinned: { type: Boolean, default: false }
    });

    const emit = defineEmits(['activate']);
</script>

<template>
    <Item
        variant="outline"
        class="tool-item group bv-focus-ring"
        role="button"
        tabindex="0"
        :data-pinned="pinned || undefined"
        @keydown.enter.prevent="emit('activate')"
        @keydown.space.prevent="emit('activate')">
        <ItemMedia variant="icon" class="tool-item__icon">
            <i :class="[icon, 'inline-flex items-center justify-center text-xl']" />
        </ItemMedia>
        <ItemContent class="min-w-0">
            <div class="tool-item__heading">
                <ItemTitle class="min-w-0 flex-1 truncate">{{ title }}</ItemTitle>
                <slot name="actions" />
            </div>
            <ItemDescription class="tool-item__description">{{ description }}</ItemDescription>
        </ItemContent>
    </Item>
</template>

<style scoped>
    .tool-item {
        min-height: 88px;
        cursor: pointer;
        align-items: flex-start;
        gap: 13px;
        padding: 13px;
        border-color: var(--bv-border-default);
        border-radius: var(--bv-radius-lg);
        background: var(--bv-bg-surface);
        transition:
            border-color var(--bv-motion-duration-fast) var(--bv-motion-ease-standard),
            background-color var(--bv-motion-duration-fast) var(--bv-motion-ease-standard);
    }

    .tool-item:hover,
    .tool-item:focus-visible {
        border-color: var(--bv-border-strong);
        background: var(--bv-bg-hover);
    }

    .tool-item[data-pinned='true'] {
        border-color: color-mix(in srgb, var(--bv-accent) 65%, var(--bv-border-strong));
    }

    .tool-item__icon {
        width: 36px;
        height: 36px;
        border: 0;
        border-radius: var(--bv-radius-md);
        background: color-mix(in srgb, var(--bv-accent) 12%, var(--bv-bg-control));
        color: var(--bv-accent-primary);
    }

    .tool-item__heading {
        display: flex;
        align-items: flex-start;
        gap: 8px;
    }

    .tool-item__description {
        display: -webkit-box;
        overflow: hidden;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        color: var(--bv-text-muted);
        font-size: var(--bv-text-xs);
        line-height: 1.45;
    }

    :deep(.tool-item__pin) {
        opacity: 0.42;
        transition: opacity var(--bv-motion-duration-fast) var(--bv-motion-ease-standard);
    }

    .tool-item:hover :deep(.tool-item__pin),
    .tool-item:focus-within :deep(.tool-item__pin),
    :deep(.tool-item__pin:focus-visible) {
        opacity: 1;
    }

    @media (prefers-reduced-motion: reduce) {
        .tool-item,
        :deep(.tool-item__pin) {
            transition: none;
        }
    }
</style>
