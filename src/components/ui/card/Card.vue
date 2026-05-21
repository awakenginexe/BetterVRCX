<script setup>
    import { cn } from '@/lib/utils';

    const props = defineProps({
        class: { type: null, required: false }
    });
</script>

<template>
    <div
        data-slot="card"
        :class="
            cn(
                'vrcx-liquid-card bg-card text-card-foreground flex flex-col gap-6 rounded-[1.45rem] border py-6 shadow-sm',
                props.class
            )
        ">
        <slot />
    </div>
</template>
