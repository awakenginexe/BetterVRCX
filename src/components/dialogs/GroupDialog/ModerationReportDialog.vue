<template>
    <Dialog v-model:open="open">
        <DialogContent class="sm:max-w-lg">
            <DialogHeader
                ><DialogTitle
                    >{{ t('group_management.report_content') }} · {{ contentName || contentId }}</DialogTitle
                ></DialogHeader
            >

            <p v-if="error" role="alert" class="text-sm text-destructive">{{ error }}</p>

            <p v-if="!categories.length" class="text-sm text-muted-foreground">
                {{ t('group_management.report_options_unavailable') }}
            </p>

            <Field>
                <FieldLabel>{{ t('group_management.report_category') }}</FieldLabel>

                <Select :model-value="category" :disabled="loading" @update:model-value="selectCategory"
                    ><SelectTrigger class="w-full"
                        ><SelectValue :placeholder="t('group_management.select_category')" /></SelectTrigger
                    ><SelectContent
                        ><SelectItem v-for="option in categories" :key="option.value" :value="option.value">{{
                            option.label
                        }}</SelectItem></SelectContent
                    ></Select
                >

                <p v-if="categoryDescription" class="text-xs text-muted-foreground">{{ categoryDescription }}</p>
            </Field>

            <Field>
                <FieldLabel>{{ t('group_management.report_reason') }}</FieldLabel>

                <Select v-model="reason" :disabled="loading || !category"
                    ><SelectTrigger class="w-full"
                        ><SelectValue :placeholder="t('group_management.select_reason')" /></SelectTrigger
                    ><SelectContent
                        ><SelectItem v-for="option in reasons" :key="option.value" :value="option.value">{{
                            option.label
                        }}</SelectItem></SelectContent
                    ></Select
                >

                <p v-if="reasonDescription" class="text-xs text-muted-foreground">{{ reasonDescription }}</p>
            </Field>

            <Field
                ><FieldLabel>{{ t('group_management.report_description') }}</FieldLabel
                ><InputGroupTextareaField v-model="description" :disabled="loading" :rows="4"
            /></Field>

            <DialogFooter
                ><Button variant="outline" :disabled="loading" @click="open = false">{{
                    t('group_management.cancel')
                }}</Button
                ><Button variant="destructive" :disabled="!canSubmit" @click="submitReport">{{
                    t(loading ? 'group_management.submitting' : 'group_management.submit_report')
                }}</Button></DialogFooter
            >
        </DialogContent>
    </Dialog>
</template>

<script setup>
    import { computed, watch } from 'vue';

    import { storeToRefs } from 'pinia';

    import { useI18n } from 'vue-i18n';

    import { toast } from 'vue-sonner';

    import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

    import { Button } from '@/components/ui/button';

    import { Field, FieldLabel } from '@/components/ui/field';

    import { InputGroupTextareaField } from '@/components/ui/input-group';

    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

    import { useAuthStore } from '../../../stores';

    import moderationReportRequest from '../../../api/moderationReport';

    import { useModerationReportForm } from './useModerationReportForm';

    const props = defineProps({
        type: { type: String, required: true },
        contentId: { type: String, required: true },
        contentName: { type: String, default: '' },
        details: { type: Object, default: null }
    });

    const open = defineModel('open', { type: Boolean, default: false });

    const { t } = useI18n();

    const { cachedConfig } = storeToRefs(useAuthStore());

    const { category, reason, description, categories, reasons, canSubmit, loading, error, submit, reset } =
        useModerationReportForm(
            computed(() => props),
            cachedConfig,
            moderationReportRequest
        );

    const categoryDescription = computed(() => cachedConfig.value?.reportCategories?.[category.value]?.description);

    const reasonDescription = computed(() => cachedConfig.value?.reportReasons?.[reason.value]?.description);

    function selectCategory(value) {
        category.value = value;
        reason.value = '';
    }

    async function submitReport() {
        if (await submit()) {
            toast.success(t('group_management.report_submitted'));
            open.value = false;
        }
    }

    watch([open, () => props.type, () => props.contentId], reset);
</script>
