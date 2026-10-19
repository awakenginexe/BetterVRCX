<template>
    <Dialog v-model:open="open">
        <DialogContent class="sm:max-w-3xl max-h-[85vh] flex flex-col">
            <DialogHeader
                ><DialogTitle>{{ t('group_management.moderation_reports') }}</DialogTitle></DialogHeader
            >

            <div class="flex gap-2">
                <Select v-model="type">
                    <SelectTrigger class="w-48"
                        ><SelectValue :placeholder="t('group_management.report_type')"
                    /></SelectTrigger>

                    <SelectContent
                        ><SelectItem value="all">{{ t('group_management.all_types') }}</SelectItem
                        ><SelectItem v-for="option in typeOptions" :key="option" :value="option">{{
                            option
                        }}</SelectItem></SelectContent
                    >
                </Select>

                <Button variant="outline" size="sm" class="ml-auto" :disabled="loading" @click="load(true)">{{
                    t('group_management.refresh')
                }}</Button>
            </div>

            <p v-if="error" role="alert" class="text-sm text-destructive">{{ error }}</p>

            <p v-if="loading" role="status" class="text-sm text-muted-foreground">
                {{ t('group_management.loading') }}
            </p>

            <p v-else-if="!reports.length" class="text-sm text-muted-foreground">
                {{ t('group_management.no_reports') }}
            </p>

            <div class="min-h-0 overflow-auto">
                <div v-for="report in reports" :key="report.id" class="flex items-start gap-3 border-b py-3">
                    <img
                        v-if="report.contentThumbnailImageUrl"
                        :src="report.contentThumbnailImageUrl"
                        class="size-12 rounded-md object-cover"
                        loading="lazy"
                        alt="" />

                    <div class="flex-1 min-w-0 text-sm">
                        <Button
                            variant="link"
                            size="sm"
                            class="h-auto max-w-full px-0 justify-start whitespace-normal text-left"
                            @click="showContent(report)"
                            >{{ report.contentName || report.contentId }}</Button
                        >

                        <p class="text-xs text-muted-foreground">
                            {{ report.type }} · {{ categoryLabel(report.category) }} · {{ reasonLabel(report.reason) }}
                        </p>

                        <p v-if="report.description" class="whitespace-pre-wrap break-words mt-1">
                            {{ report.description }}
                        </p>

                        <p class="text-xs text-muted-foreground mt-1">{{ formatDateFilter(report.created, 'long') }}</p>
                    </div>

                    <Button variant="destructive" size="sm" :disabled="loading" @click="deleteReport(report)">{{
                        t('group_management.delete')
                    }}</Button>
                </div>
            </div>

            <Button v-if="hasNext" variant="outline" size="sm" :disabled="loading" @click="load(false)">{{
                t('group_management.load_more')
            }}</Button>
        </DialogContent>
    </Dialog>
</template>

<script setup>
    import { computed, ref, watch } from 'vue';

    import { storeToRefs } from 'pinia';

    import { useI18n } from 'vue-i18n';

    import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

    import { Button } from '@/components/ui/button';

    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

    import { useAuthStore, useModalStore, useUserStore } from '../../../stores';

    import { formatDateFilter } from '../../../shared/utils';

    import moderationReportRequest from '../../../api/moderationReport';

    import { showAvatarDialog } from '../../../coordinators/avatarCoordinator';

    import { showGroupDialog } from '../../../coordinators/groupCoordinator';

    import { showUserDialog } from '../../../coordinators/userCoordinator';

    import { showWorldDialog } from '../../../coordinators/worldCoordinator';

    import { useModerationReports } from './useModerationReports';

    const open = defineModel('open', { type: Boolean, default: false });

    const { t } = useI18n();

    const modal = useModalStore();

    const { currentUser } = storeToRefs(useUserStore());

    const { cachedConfig } = storeToRefs(useAuthStore());

    const type = ref('all');

    const userId = computed(() => currentUser.value.id);

    const typeOptions = computed(() => Object.keys(cachedConfig.value?.reportOptions || {}));

    const categoryLabel = (key) => cachedConfig.value?.reportCategories?.[key]?.text || key;

    const reasonLabel = (key) => cachedConfig.value?.reportReasons?.[key]?.text || key;

    const { reports, hasNext, loading, error, load, remove, cancel } = useModerationReports(
        type,
        userId,
        moderationReportRequest
    );

    function showContent(report) {
        ({ user: showUserDialog, world: showWorldDialog, avatar: showAvatarDialog, group: showGroupDialog })[
            report.type
        ]?.(report.contentId);
    }

    async function deleteReport(report) {
        const user = userId.value;

        const filter = type.value;

        const { ok } = await modal.confirm({
            title: t('confirm.title'),
            description: t('group_management.delete_report_confirm'),
            destructive: true
        });

        if (ok && open.value && user === userId.value && filter === type.value) await remove(report);
    }

    watch(
        open,
        (visible) => {
            if (visible) load(true);
            else cancel();
        },
        { immediate: true }
    );

    watch([type, userId], () => {
        if (open.value) load(true);
    });
</script>
