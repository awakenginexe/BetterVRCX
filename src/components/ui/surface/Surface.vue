<script setup>
    import { Primitive } from 'reka-ui';
    import { cn } from '@/lib/utils';
    import { computed } from 'vue';

    const props = defineProps({
        as: { type: String, default: 'div' },
        asChild: { type: Boolean, default: false },
        tier: {
            type: String,
            default: 'base',
            validator: (v) => ['base', 'raised', 'floating', 'overlay'].includes(v)
        },
        interactive: { type: Boolean, default: false },
        class: { type: null, required: false }
    });

    const tierClass = computed(() => {
        switch (props.tier) {
            case 'raised':
                return 'bv-surface-raised';
            case 'floating':
                return 'bv-surface-floating';
            case 'overlay':
                return 'bv-surface-overlay';
            case 'base':
            default:
                return 'bv-surface-base';
        }
    });
</script>

<template>
    <Primitive
        data-slot="surface"
        :as="as"
        :as-child="asChild"
        :data-tier="tier"
        :class="cn(tierClass, interactive && 'bv-interactive', props.class)">
        <slot />
    </Primitive>
</template>
