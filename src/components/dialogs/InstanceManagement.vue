<template>
    <div v-if="canRename || canLink || instance?.calendarEntryId" class="inline-flex items-center gap-1">
        <Button
            v-if="canRename"
            size="icon-sm"
            variant="outline"
            class="rounded-full size-6"
            :disabled="busy"
            :aria-label="t('instance_improvements.rename')"
            :title="t('instance_improvements.rename')"
            @click="rename">
            <Pencil class="size-4" />
        </Button>
        <Button
            v-if="canLink"
            size="icon-sm"
            variant="outline"
            class="rounded-full size-6"
            :disabled="busy"
            :aria-label="t('instance_improvements.link_event')"
            :title="t('instance_improvements.link_event')"
            @click="linkOpen = true">
            <Link class="size-4" />
        </Button>
        <Popover v-if="instance?.calendarEntryId" v-model:open="eventOpen">
            <PopoverTrigger as-child>
                <Button
                    size="icon-sm"
                    variant="outline"
                    class="rounded-full size-6"
                    :aria-label="t('instance_improvements.event_details')"
                    :title="t('instance_improvements.event_details')">
                    <CalendarDays class="size-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent class="w-96 max-w-[90vw] max-h-96 overflow-auto">
                <InstanceEventDetails v-if="calendarEvent" :event="calendarEvent" />
                <Loader2 v-else-if="eventLoading" class="size-4 animate-spin" :aria-label="t('common.loading')" />
                <span v-else class="text-sm text-muted-foreground">{{
                    t('instance_improvements.event_unavailable')
                }}</span>
            </PopoverContent>
        </Popover>
        <InstanceCalendarLinkDialog
            :open="linkOpen"
            :location="location"
            :instance="instance"
            @update:open="linkOpen = $event" />
    </div>
</template>

<script setup>
    import { computed, ref, watch } from 'vue';
    import { CalendarDays, Link, Loader2, Pencil } from 'lucide-vue-next';
    import { useI18n } from 'vue-i18n';
    import { toast } from 'vue-sonner';
    import { Button } from '@/components/ui/button';
    import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
    import { useGroupStore, useModalStore, useUserStore } from '../../stores';
    import { instanceRequest, queryRequest } from '../../api';
    import { canManageInstance } from '../../shared/utils/instanceImprovements';
    import InstanceCalendarLinkDialog from './InstanceCalendarLinkDialog.vue';
    import InstanceEventDetails from './InstanceEventDetails.vue';

    const props = defineProps({ instance: { type: Object, default: null }, location: { type: String, default: '' } });
    const { t } = useI18n();
    const groupStore = useGroupStore();
    const userStore = useUserStore();
    const modalStore = useModalStore();
    const busy = ref(false);
    const linkOpen = ref(false);
    const eventOpen = ref(false);
    const calendarEvent = ref(null);
    const eventLoading = ref(false);
    const group = computed(() => groupStore.cachedGroups.get(props.instance?.ownerId));
    const canRename = computed(
        () =>
            Boolean(props.location) &&
            canManageInstance(
                props.instance,
                userStore.currentUser.id,
                userStore.isLocalUserVrcPlusSupporter,
                group.value
            )
    );
    const canLink = computed(
        () =>
            canRename.value &&
            props.instance?.ownerId?.startsWith('grp_') &&
            (group.value?.myMember?.permissions?.includes('*') ||
                group.value?.myMember?.permissions?.includes('group-instance-calendar-link'))
    );
    let eventGeneration = 0;

    async function rename() {
        if (!canRename.value || busy.value) return;
        const location = props.location;
        busy.value = true;
        try {
            const { ok, value } = await modalStore.prompt({
                title: t('instance_improvements.rename'),
                description: t('instance_improvements.rename_description'),
                inputValue: props.instance?.displayName ?? ''
            });
            if (!ok || location !== props.location || !canRename.value) return;
            const displayName = value.trim() || null;
            if (displayName === (props.instance?.displayName ?? null)) return;
            await instanceRequest.updateInstance({ location, displayName });
            toast.success(t('instance_improvements.renamed'));
        } catch (error) {
            toast.error(error?.error?.message || t('instance_improvements.update_failed'));
        } finally {
            busy.value = false;
        }
    }

    watch([() => props.location, () => props.instance?.calendarEntryId], () => {
        eventGeneration++;
        calendarEvent.value = null;
        eventLoading.value = false;
        eventOpen.value = false;
        linkOpen.value = false;
    });
    watch(eventOpen, async (open) => {
        if (!open || calendarEvent.value || eventLoading.value) return;
        const groupId = props.instance?.ownerId;
        const eventId = props.instance?.calendarEntryId;
        if (!groupId || !eventId || !groupStore.currentUserGroups.has(groupId)) return;
        const generation = ++eventGeneration;
        eventLoading.value = true;
        try {
            const args = await queryRequest.fetch('groupCalendarEvent', { groupId, eventId });
            if (generation === eventGeneration) calendarEvent.value = args.json;
        } catch (error) {
            console.error('Failed to load instance event', error);
        } finally {
            if (generation === eventGeneration) eventLoading.value = false;
        }
    });
</script>
