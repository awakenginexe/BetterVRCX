<template>
    <Dialog :open="dialog.open" @update:open="handleOpenUpdate">
        <DialogContent class="sm:max-w-[430px]">
            <DialogHeader>
                <DialogTitle class="flex items-center gap-2">
                    <Bell class="size-4" />
                    {{ t('dialog.friend_availability_notify.title') }}
                </DialogTitle>
                <DialogDescription>
                    {{ t('dialog.friend_availability_notify.description', { name: displayName }) }}
                </DialogDescription>
            </DialogHeader>

            <div class="grid gap-5 py-2">
                <div class="space-y-3">
                    <div class="text-sm font-medium">
                        {{ t('dialog.friend_availability_notify.duration') }}
                    </div>
                    <RadioGroup
                        class="grid grid-cols-2 gap-2"
                        :model-value="duration"
                        @update:modelValue="duration = String($event)">
                        <label
                            v-for="option in durationOptions"
                            :key="option.value"
                            class="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors"
                            :class="
                                duration === option.value
                                    ? 'border-primary bg-primary/10 text-foreground'
                                    : 'border-border hover:bg-muted/50'
                            ">
                            <RadioGroupItem :value="option.value" class="size-4" />
                            <span>{{ option.label }}</span>
                        </label>
                    </RadioGroup>
                </div>

                <div class="space-y-3">
                    <div class="text-sm font-medium">
                        {{ t('dialog.friend_availability_notify.triggers') }}
                    </div>
                    <div class="space-y-3 rounded-md border p-3">
                        <div class="flex items-start gap-3">
                            <Checkbox
                                id="friend-availability-active"
                                data-testid="friend-availability-active"
                                :model-value="notifyActive"
                                @update:modelValue="notifyActive = Boolean($event)" />
                            <div class="grid gap-1">
                                <Label for="friend-availability-active" class="text-sm font-medium">
                                    {{ t('dialog.friend_availability_notify.active') }}
                                </Label>
                                <p class="text-xs text-muted-foreground">
                                    {{ t('dialog.friend_availability_notify.active_hint') }}
                                </p>
                            </div>
                        </div>
                        <div class="flex items-start gap-3">
                            <Checkbox
                                id="friend-availability-online"
                                data-testid="friend-availability-online"
                                :model-value="notifyOnline"
                                @update:modelValue="notifyOnline = Boolean($event)" />
                            <div class="grid gap-1">
                                <Label for="friend-availability-online" class="text-sm font-medium">
                                    {{ t('dialog.friend_availability_notify.online') }}
                                </Label>
                                <p class="text-xs text-muted-foreground">
                                    {{ t('dialog.friend_availability_notify.online_hint') }}
                                </p>
                            </div>
                        </div>
                    </div>
                    <p v-if="!hasAnyTrigger" class="text-xs text-destructive">
                        {{ t('dialog.friend_availability_notify.trigger_required') }}
                    </p>
                </div>
            </div>

            <DialogFooter class="gap-2 sm:justify-between">
                <Button
                    v-if="hasExistingWatch"
                    data-testid="friend-availability-remove"
                    type="button"
                    variant="destructive"
                    @click="remove">
                    <Trash2 class="size-4" />
                    {{ t('dialog.friend_availability_notify.remove') }}
                </Button>
                <div v-else></div>
                <div class="flex justify-end gap-2">
                    <Button type="button" variant="secondary" @click="availabilityNotifyStore.closeDialog">
                        {{ t('dialog.alertdialog.cancel') }}
                    </Button>
                    <Button data-testid="friend-availability-save" type="button" :disabled="!canSave" @click="save">
                        {{ t('dialog.friend_availability_notify.save') }}
                    </Button>
                </div>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup>
    import {
        Dialog,
        DialogContent,
        DialogDescription,
        DialogFooter,
        DialogHeader,
        DialogTitle
    } from '@/components/ui/dialog';
    import {
        AVAILABILITY_NOTIFY_DURATIONS,
        AVAILABILITY_NOTIFY_TRIGGERS
    } from '@/shared/utils/friendAvailabilityNotify';
    import { Bell, Trash2 } from 'lucide-vue-next';
    import { Button } from '@/components/ui/button';
    import { Checkbox } from '@/components/ui/checkbox';
    import { Label } from '@/components/ui/label';
    import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
    import { computed, ref, watch } from 'vue';
    import { toast } from 'vue-sonner';
    import { useFriendAvailabilityNotifyStore } from '@/stores';
    import { useI18n } from 'vue-i18n';

    const availabilityNotifyStore = useFriendAvailabilityNotifyStore();
    const { t } = useI18n();

    const dialog = availabilityNotifyStore.dialog;
    const duration = ref(AVAILABILITY_NOTIFY_DURATIONS.ONCE);
    const notifyActive = ref(true);
    const notifyOnline = ref(true);

    const durationOptions = computed(() => [
        {
            value: AVAILABILITY_NOTIFY_DURATIONS.ONCE,
            label: t('dialog.friend_availability_notify.duration_once')
        },
        {
            value: AVAILABILITY_NOTIFY_DURATIONS.SEVEN_DAYS,
            label: t('dialog.friend_availability_notify.duration_7_days')
        },
        {
            value: AVAILABILITY_NOTIFY_DURATIONS.THIRTY_DAYS,
            label: t('dialog.friend_availability_notify.duration_30_days')
        },
        {
            value: AVAILABILITY_NOTIFY_DURATIONS.FOREVER,
            label: t('dialog.friend_availability_notify.duration_forever')
        }
    ]);

    const displayName = computed(() => dialog.displayName || dialog.userId);
    const hasExistingWatch = computed(() => Boolean(dialog.watch));
    const hasAnyTrigger = computed(() => notifyActive.value || notifyOnline.value);
    const canSave = computed(() => Boolean(dialog.userId) && hasAnyTrigger.value);

    watch(
        () => [dialog.open, dialog.userId, dialog.watch],
        () => {
            const watchRef = dialog.watch;
            duration.value = watchRef?.duration || AVAILABILITY_NOTIFY_DURATIONS.ONCE;
            notifyActive.value = watchRef?.triggers?.[AVAILABILITY_NOTIFY_TRIGGERS.ACTIVE] ?? true;
            notifyOnline.value = watchRef?.triggers?.[AVAILABILITY_NOTIFY_TRIGGERS.ONLINE] ?? true;
        },
        { immediate: true }
    );

    function handleOpenUpdate(value) {
        if (!value) {
            availabilityNotifyStore.closeDialog();
        }
    }

    async function save() {
        if (!canSave.value) {
            return;
        }
        await availabilityNotifyStore.saveWatch(
            {
                id: dialog.userId,
                displayName: dialog.displayName
            },
            {
                duration: duration.value,
                triggers: {
                    [AVAILABILITY_NOTIFY_TRIGGERS.ACTIVE]: notifyActive.value,
                    [AVAILABILITY_NOTIFY_TRIGGERS.ONLINE]: notifyOnline.value
                }
            }
        );
        toast.success(t('dialog.friend_availability_notify.saved', { name: displayName.value }));
        availabilityNotifyStore.closeDialog();
    }

    async function remove() {
        if (!dialog.userId) {
            return;
        }
        await availabilityNotifyStore.removeWatch(dialog.userId);
        toast.success(t('dialog.friend_availability_notify.removed', { name: displayName.value }));
        availabilityNotifyStore.closeDialog();
    }
</script>
