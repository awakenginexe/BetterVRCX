import { computed, ref } from 'vue';

export function useModerationReportForm(context, config, api) {
    const category = ref('');
    const reason = ref('');
    const description = ref('');
    const loading = ref(false);
    const error = ref('');
    let generation = 0;
    const options = computed(
        () => config.value?.reportOptions?.[context.value.type] || {}
    );
    const categories = computed(() =>
        Object.keys(options.value)
            .map((value) => ({
                value,
                label: config.value?.reportCategories?.[value]?.text || value,
                order: config.value?.reportCategories?.[value]?.order || 0
            }))
            .sort((a, b) => a.order - b.order)
    );
    const reasons = computed(() =>
        (options.value[category.value] || []).map((value) => ({
            value,
            label: config.value?.reportReasons?.[value]?.text || value
        }))
    );
    const canSubmit = computed(
        () =>
            Boolean(
                context.value.contentId &&
                options.value[category.value]?.includes(reason.value)
            ) && !loading.value
    );
    function reset() {
        generation++;
        category.value = '';
        reason.value = '';
        description.value = '';
        error.value = '';
        loading.value = false;
    }
    async function submit() {
        if (!canSubmit.value) return false;
        const token = generation;
        const { type, contentId, details } = context.value;
        const params = {
            type,
            contentId,
            category: category.value,
            reason: reason.value,
            ...(description.value.trim()
                ? { description: description.value.trim() }
                : {}),
            ...(details ? { details } : {})
        };
        loading.value = true;
        error.value = '';
        try {
            await api.submitModerationReport(params);
            return (
                token === generation &&
                contentId === context.value.contentId &&
                type === context.value.type
            );
        } catch (e) {
            if (token === generation) error.value = e.message || String(e);
            return false;
        } finally {
            if (token === generation) loading.value = false;
        }
    }
    return {
        category,
        reason,
        description,
        categories,
        reasons,
        canSubmit,
        loading,
        error,
        submit,
        reset
    };
}
