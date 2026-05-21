<script setup>
    import { cn } from '@/lib/utils';
    import { useVModel } from '@vueuse/core';

    const props = defineProps({
        defaultValue: { type: [String, Number], required: false },
        modelValue: { type: [String, Number], required: false },
        class: { type: null, required: false }
    });

    const emits = defineEmits(['update:modelValue']);

    const modelValue = useVModel(props, 'modelValue', emits, {
        defaultValue: props.defaultValue
    });
</script>

<template>
    <input
        v-model="modelValue"
        data-slot="input"
        :class="
            cn(
                'vrcx-liquid-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-10 w-full min-w-0 rounded-[1rem] border bg-transparent px-3.5 py-1 text-base shadow-xs transition-[color,box-shadow,background-color,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
                props.class
            )
        " />
</template>
