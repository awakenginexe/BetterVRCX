<template>
    <div class="settings-item" :class="`settings-item--${intent}`">
        <div class="settings-item__copy">
            <span class="settings-item__label">{{ label }}</span>
            <span v-if="description" class="settings-item__description">{{ description }}</span>
        </div>
        <div class="settings-item__control">
            <span
                v-if="intent !== 'immediate'"
                class="settings-item__intent"
                :data-setting-intent="intent"
                :title="intentLabel || label"
                :aria-label="intentLabel || label"
                role="img">
                <i :class="intentIcon" aria-hidden="true" />
            </span>
            <slot />
        </div>
    </div>
</template>

<script setup>
    import { computed } from 'vue';

    const props = defineProps({
        label: { type: String, required: true },
        description: { type: String, default: '' },
        intent: {
            type: String,
            default: 'immediate',
            validator: (value) => ['immediate', 'restart', 'platform', 'credential', 'destructive'].includes(value)
        },
        intentLabel: { type: String, default: '' }
    });

    const intentIcon = computed(
        () =>
            ({
                restart: 'ri-restart-line',
                platform: 'ri-computer-line',
                credential: 'ri-key-2-line',
                destructive: 'ri-alert-line'
            })[props.intent] ?? 'ri-flashlight-line'
    );
</script>

<style scoped>
    .settings-item {
        display: flex;
        min-height: 48px;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 8px 2px;
    }

    .settings-item__copy {
        min-width: 0;
        flex: 1;
    }

    .settings-item__label,
    .settings-item__description {
        display: block;
    }

    .settings-item__label {
        color: var(--bv-text-strong);
        font-size: 12px;
        line-height: 1.4;
    }

    .settings-item__description {
        max-width: 68ch;
        margin-top: 2px;
        color: var(--bv-text-muted);
        font-size: 11px;
        line-height: 1.45;
    }

    .settings-item__control {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 8px;
    }

    .settings-item__intent {
        display: inline-grid;
        width: 24px;
        height: 24px;
        place-items: center;
        border: 1px solid var(--bv-border);
        border-radius: 7px;
        background: var(--bv-bg-control);
        color: var(--bv-text-muted);
        font-size: 13px;
    }

    .settings-item__intent[data-setting-intent='restart'] {
        border-color: color-mix(in srgb, var(--bv-warning) 55%, var(--bv-border));
        color: var(--bv-warning);
    }

    .settings-item__intent[data-setting-intent='platform'],
    .settings-item__intent[data-setting-intent='credential'] {
        border-color: color-mix(in srgb, var(--bv-info) 50%, var(--bv-border));
        color: var(--bv-info);
    }

    .settings-item__intent[data-setting-intent='destructive'] {
        border-color: color-mix(in srgb, var(--bv-danger) 55%, var(--bv-border));
        background: color-mix(in srgb, var(--bv-danger) 8%, var(--bv-bg-control));
        color: var(--bv-danger);
    }

    @media (max-width: 640px) {
        .settings-item {
            align-items: flex-start;
            flex-direction: column;
            gap: 8px;
        }

        .settings-item__control {
            width: 100%;
            flex-wrap: wrap;
            justify-content: flex-end;
        }
    }
</style>
