<template>
    <Dialog :open="open" @update:open="close">
        <DialogContent class="sm:max-w-xl">
            <DialogHeader
                ><DialogTitle>{{ t('instance_improvements.link_event') }}</DialogTitle></DialogHeader
            >
            <Loader2 v-if="fetching" class="size-4 animate-spin" :aria-label="t('common.loading')" />
            <p v-else-if="fetchFailed" class="text-sm text-destructive">
                {{ t('instance_improvements.events_failed') }}
            </p>
            <p v-else-if="!events.length" class="text-sm text-muted-foreground">
                {{ t('instance_improvements.no_events') }}
            </p>
            <template v-else>
                <Select v-model="selectedId" :disabled="saving">
                    <SelectTrigger class="w-full" :aria-label="t('instance_improvements.select_event')"
                        ><SelectValue :placeholder="t('instance_improvements.select_event')"
                    /></SelectTrigger>
                    <SelectContent
                        ><SelectItem v-for="event in events" :key="event.id" :value="event.id">{{
                            event.title
                        }}</SelectItem></SelectContent
                    >
                </Select>
                <InstanceEventDetails v-if="selectedEvent" :event="selectedEvent" />
            </template>
            <DialogFooter>
                <Button variant="secondary" :disabled="saving" @click="close(false)">{{
                    t('common.actions.cancel')
                }}</Button>
                <Button
                    v-if="instance?.calendarEntryId"
                    variant="destructive"
                    :disabled="saving || !authorized"
                    @click="save(null)"
                    >{{ t('instance_improvements.unlink_event') }}</Button
                >
                <Button
                    :disabled="
                        saving || fetching || !authorized || !selectedEvent || selectedId === instance?.calendarEntryId
                    "
                    @click="save(selectedId)"
                    >{{ t('instance_improvements.link_event') }}</Button
                >
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup>
    import { computed, ref, watch } from 'vue';
    import { Loader2 } from 'lucide-vue-next';
    import { toast } from 'vue-sonner';
    import { useI18n } from 'vue-i18n';
    import { Button } from '@/components/ui/button';
    import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { groupRequest, instanceRequest } from '../../api';
    import { useGroupStore, useUserStore } from '../../stores';
    import { canManageInstance, getLinkableInstanceEvents } from '../../shared/utils/instanceImprovements';
    import InstanceEventDetails from './InstanceEventDetails.vue';

    const props = defineProps({
        open: Boolean,
        location: { type: String, required: true },
        instance: { type: Object, default: null }
    });
    const emit = defineEmits(['update:open']);
    const { t } = useI18n();
    const groupStore = useGroupStore();
    const userStore = useUserStore();
    const events = ref([]);
    const selectedId = ref('');
    const fetching = ref(false);
    const saving = ref(false);
    const fetchFailed = ref(false);
    let generation = 0;
    const authorized = computed(() => {
        const group = groupStore.cachedGroups.get(props.instance?.ownerId);
        return (
            props.instance?.ownerId?.startsWith('grp_') &&
            canManageInstance(props.instance, userStore.currentUser.id, false, group) &&
            (group?.myMember?.permissions?.includes('*') ||
                group?.myMember?.permissions?.includes('group-instance-calendar-link'))
        );
    });
    const selectedEvent = computed(() => events.value.find((event) => event.id === selectedId.value));

    watch(
        [() => props.open, () => props.location],
        async ([open]) => {
            const current = ++generation;
            events.value = [];
            selectedId.value = props.instance?.calendarEntryId || '';
            fetching.value = false;
            fetchFailed.value = false;
            if (!open || !authorized.value) return;
            fetching.value = true;
            try {
                const args = await groupRequest.getGroupCalendar(props.instance.ownerId, {
                    n: 100,
                    after: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
                });
                if (current !== generation) return;
                events.value = getLinkableInstanceEvents(args.json?.results ?? []);
                if (!selectedId.value && events.value.length) selectedId.value = events.value[0].id;
            } catch (error) {
                if (current === generation) fetchFailed.value = true;
                console.error('Failed to load linkable instance events', error);
            } finally {
                if (current === generation) fetching.value = false;
            }
        },
        { immediate: true }
    );

    function close(open) {
        if (!open && !saving.value) emit('update:open', false);
    }

    async function save(calendarEntryId) {
        if (saving.value || !authorized.value || (calendarEntryId !== null && !selectedEvent.value)) return;
        const current = generation;
        const location = props.location;
        saving.value = true;
        try {
            await instanceRequest.updateInstance({ location, calendarEntryId });
            toast.success(
                t(calendarEntryId ? 'instance_improvements.event_linked' : 'instance_improvements.event_unlinked')
            );
            if (current === generation) emit('update:open', false);
        } catch (error) {
            toast.error(error?.error?.message || t('instance_improvements.update_failed'));
        } finally {
            saving.value = false;
        }
    }
</script>
