<template>
    <div class="vrcx-widget-header group/header flex shrink-0 items-center justify-between border-b px-2.5 py-0">
        <div
            class="vrcx-widget-header-link flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            @click="navigateToPage">
            <i :class="icon" class="text-sm"></i>
            <span>{{ title }}</span>
            <ExternalLink class="size-3 opacity-0 transition-opacity group-hover/header:opacity-100" />
        </div>
        <div class="vrcx-widget-header-actions opacity-0 transition-opacity group-hover/header:opacity-100">
            <slot />
        </div>
    </div>
</template>

<script setup>
    import { ExternalLink } from 'lucide-vue-next';
    import { useRouter } from 'vue-router';

    const props = defineProps({
        title: {
            type: String,
            required: true
        },
        icon: {
            type: String,
            default: ''
        },
        routeName: {
            type: String,
            default: ''
        }
    });

    const router = useRouter();

    function navigateToPage() {
        if (props.routeName) {
            router.push({ name: props.routeName });
        }
    }
</script>

<style scoped>
    .vrcx-widget-header {
        min-height: 2rem;
        border-color: color-mix(in oklch, var(--vrcx-border-glass) 72%, transparent);
        background:
            linear-gradient(180deg, color-mix(in oklch, var(--card) 28%, transparent), color-mix(in oklch, var(--background) 14%, transparent)),
            color-mix(in oklch, var(--background) 18%, transparent);
        box-shadow: inset 0 1px 0 color-mix(in oklch, white 9%, transparent);
    }

    .vrcx-widget-header-link {
        color: color-mix(in oklch, var(--foreground) 62%, transparent);
        letter-spacing: 0;
        transition:
            color var(--vrcx-motion-base) var(--vrcx-ease-fluid),
            transform var(--vrcx-motion-base) var(--vrcx-ease-fluid);
    }

    .vrcx-widget-header-link:hover {
        color: color-mix(in oklch, var(--foreground) 92%, var(--primary));
        transform: translateY(-1px);
    }

    .vrcx-widget-header-actions {
        transition: opacity var(--vrcx-motion-base) var(--vrcx-ease-fluid);
    }
</style>
