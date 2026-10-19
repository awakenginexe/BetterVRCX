<template>
    <Dialog v-model:open="open">
        <DialogContent class="sm:max-w-3xl max-h-[85vh] flex flex-col">
            <DialogHeader
                ><DialogTitle>{{ t('group_management.personal_groups') }}</DialogTitle></DialogHeader
            >
            <div class="flex flex-wrap items-center gap-2">
                <Button
                    v-for="status in ['invited', 'requested', 'userblocked']"
                    :key="status"
                    size="sm"
                    :variant="tab === status ? 'default' : 'outline'"
                    @click="tab = status"
                    >{{ t(`group_management.${status}`) }}</Button
                >
                <Button size="sm" variant="outline" class="ml-auto" :disabled="loading" @click="load">{{
                    t('group_management.refresh')
                }}</Button>
            </div>
            <p v-if="error" role="alert" class="text-sm text-destructive">{{ error }}</p>
            <p v-if="loading" role="status" class="text-sm text-muted-foreground">
                {{ t('group_management.loading') }}
            </p>
            <p v-else-if="!groups.length" class="text-sm text-muted-foreground">
                {{ t('group_management.no_groups') }}
            </p>
            <div class="min-h-0 overflow-auto">
                <div v-for="group in groups" :key="group.id" class="flex flex-wrap items-center gap-3 border-b py-3">
                    <img
                        v-if="group.iconUrl"
                        :src="group.iconUrl"
                        class="size-12 rounded-md object-cover"
                        loading="lazy"
                        alt="" />
                    <div class="flex-1 min-w-0">
                        <Button
                            size="sm"
                            variant="link"
                            class="h-auto max-w-full px-0 justify-start whitespace-normal text-left"
                            @click="showGroupDialog(group.groupId || group.id)"
                            >{{ group.name || group.groupId || group.id }}</Button
                        >
                        <p v-if="group.description" class="text-xs text-muted-foreground line-clamp-2">
                            {{ group.description }}
                        </p>
                    </div>
                    <template v-if="tab === 'invited'">
                        <Button size="sm" :disabled="loading" @click="act(group, 'accept')">{{
                            t('group_management.accept')
                        }}</Button>
                        <Button
                            size="sm"
                            variant="outline"
                            :disabled="loading"
                            @click="confirmAction(group, 'decline')"
                            >{{ t('group_management.decline') }}</Button
                        >
                    </template>
                    <Button
                        v-if="tab === 'requested'"
                        size="sm"
                        variant="outline"
                        :disabled="loading"
                        @click="confirmAction(group, 'cancel')"
                        >{{ t('group_management.cancel_request') }}</Button
                    >
                    <Button
                        v-if="tab !== 'userblocked'"
                        size="sm"
                        variant="destructive"
                        :disabled="loading"
                        @click="confirmAction(group, 'block')"
                        >{{ t('group_management.block') }}</Button
                    >
                    <Button
                        v-else
                        size="sm"
                        variant="outline"
                        :disabled="loading"
                        @click="confirmAction(group, 'unblock')"
                        >{{ t('group_management.unblock') }}</Button
                    >
                </div>
            </div>
        </DialogContent>
    </Dialog>
</template>

<script setup>
    import { computed, ref, watch } from 'vue';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';
    import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
    import { Button } from '@/components/ui/button';
    import { groupRequest } from '../../../api';
    import { useModalStore, useUserStore } from '../../../stores';
    import { showGroupDialog } from '../../../coordinators/groupCoordinator';
    import { useGroupUserActions } from './useGroupUserActions';

    const props = defineProps({ initialTab: { type: String, default: 'invited' } });
    const open = defineModel('open', { type: Boolean, default: false });
    const { t } = useI18n();
    const modal = useModalStore();
    const { currentUser } = storeToRefs(useUserStore());
    const tab = ref(props.initialTab);
    const userId = computed(() => currentUser.value.id);
    const { groups, loading, error, load, act, cancel } = useGroupUserActions(tab, userId, groupRequest);
    async function confirmAction(group, action) {
        const status = tab.value;
        const user = userId.value;
        const { ok } = await modal.confirm({
            title: t('confirm.title'),
            description: t(`group_management.${action}_group_confirm`, { name: group.name || group.groupId }),
            destructive: action !== 'unblock'
        });
        if (ok && open.value && status === tab.value && user === userId.value) await act(group, action);
    }
    watch(
        open,
        (visible) => {
            if (visible) {
                tab.value = props.initialTab;
                load();
            } else cancel();
        },
        { immediate: true }
    );
    watch([tab, userId], () => {
        if (open.value) load();
    });
</script>
