<template>
    <div class="flex flex-col gap-2 text-sm">
        <strong>{{ event.title }}</strong>
        <span class="text-muted-foreground"
            >{{ formatDateFilter(event.startsAt, 'short') }} – {{ formatDateFilter(event.endsAt, 'short') }}</span
        >
        <span v-if="event.category">{{ event.category }} · {{ event.accessType }}</span>
        <p v-if="event.description" class="whitespace-pre-wrap break-words">{{ event.description }}</p>
    </div>
</template>

<script setup>
    import { formatDateFilter } from '../../shared/utils';
    defineProps({ event: { type: Object, required: true } });
</script>
