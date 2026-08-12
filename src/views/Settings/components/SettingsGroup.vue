<template>
    <section class="settings-group" :data-tone="tone">
        <header v-if="title || $slots.description" class="settings-group__header">
            <h2 v-if="title">{{ title }}</h2>
            <div v-if="$slots.description" class="settings-group__description">
                <slot name="description" />
            </div>
        </header>
        <Card class="settings-group__surface bv-surface">
            <CardContent class="settings-group__content">
                <slot />
            </CardContent>
        </Card>
    </section>
</template>

<script setup>
    import { Card, CardContent } from '@/components/ui/card';

    defineProps({
        title: { type: String, default: '' },
        tone: {
            type: String,
            default: 'default',
            validator: (value) => ['default', 'warning', 'danger', 'credential', 'platform'].includes(value)
        }
    });
</script>

<style scoped>
    .settings-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .settings-group__header {
        padding: 0 2px;
    }

    .settings-group__header h2 {
        margin: 0;
        color: var(--bv-text-strong);
        font-size: 14px;
        font-weight: 680;
    }

    .settings-group__description {
        max-width: 72ch;
        margin-top: 3px;
        color: var(--bv-text-muted);
        font-size: 12px;
        line-height: 1.5;
    }

    .settings-group__surface {
        padding: 0;
        overflow: hidden;
        box-shadow: none;
    }

    .settings-group[data-tone='warning'] .settings-group__surface {
        border-color: color-mix(in srgb, var(--bv-warning) 45%, var(--bv-border));
    }

    .settings-group[data-tone='danger'] .settings-group__surface {
        border-color: color-mix(in srgb, var(--bv-danger) 50%, var(--bv-border));
        background: color-mix(in srgb, var(--bv-danger) 5%, var(--bv-bg-surface));
    }

    .settings-group[data-tone='credential'] .settings-group__surface,
    .settings-group[data-tone='platform'] .settings-group__surface {
        border-color: color-mix(in srgb, var(--bv-info) 38%, var(--bv-border));
    }

    .settings-group__content {
        display: flex;
        flex-direction: column;
        gap: 0;
        padding: 8px 14px;
    }

    .settings-group__content > :deep(* + *) {
        border-top: 1px solid color-mix(in srgb, var(--bv-border) 72%, transparent);
    }
</style>
