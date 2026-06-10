<script setup>
    import { TransitionGroup } from 'vue';
    import { cn } from '@/lib/utils';

    const props = defineProps({
        class: { type: null, required: false },
        isTransitionGroup: { type: Boolean, default: false },
        transitionName: { type: String, default: 'list' }
    });
</script>

<template>
    <TransitionGroup
        v-if="isTransitionGroup"
        tag="tbody"
        data-slot="table-body"
        :name="transitionName"
        :class="cn('[&_tr:last-child]:border-0', props.class)">
        <slot />
    </TransitionGroup>
    <tbody v-else data-slot="table-body" :class="cn('[&_tr:last-child]:border-0', props.class)">
        <slot />
    </tbody>
</template>
