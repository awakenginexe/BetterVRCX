<script setup>
    import { cn } from '@/lib/utils';

    const props = defineProps({
        class: { type: null, required: false }
    });
</script>

<template>
    <div data-slot="skeleton" :class="cn('bv-skeleton min-h-4 rounded-md', props.class)" />
</template>
