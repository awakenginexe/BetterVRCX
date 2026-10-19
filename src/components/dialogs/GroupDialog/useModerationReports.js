import { ref } from 'vue';

export function useModerationReports(type, userId, api) {
    const reports = ref([]);
    const hasNext = ref(false);
    const loading = ref(false);
    const error = ref('');
    let generation = 0;
    function cancel() {
        generation++;
        loading.value = false;
    }
    async function load(reset = true) {
        if (!reset && (loading.value || !hasNext.value)) return;
        const token = reset ? ++generation : generation;
        const user = userId.value;
        const filter = type.value;
        if (reset) {
            reports.value = [];
            hasNext.value = false;
        }
        if (!user) return;
        const params = {
            reportingUserId: user,
            n: 100,
            offset: reports.value.length,
            ...(filter === 'all' ? {} : { type: filter })
        };
        loading.value = true;
        error.value = '';
        try {
            const { json } = await api.getModerationReports(params);
            if (
                token === generation &&
                user === userId.value &&
                filter === type.value
            ) {
                reports.value.push(...(json.results || []));
                hasNext.value = Boolean(json.hasNext);
            }
        } catch (e) {
            if (token === generation) error.value = e.message || String(e);
        } finally {
            if (token === generation) loading.value = false;
        }
    }
    async function remove(report) {
        if (
            loading.value ||
            !userId.value ||
            !reports.value.some((item) => item.id === report.id) ||
            (report.reportingUserId && report.reportingUserId !== userId.value)
        )
            return;
        const token = generation;
        const user = userId.value;
        loading.value = true;
        error.value = '';
        try {
            await api.deleteModerationReport({ moderationReportId: report.id });
            if (token === generation && user === userId.value)
                reports.value = reports.value.filter(
                    (item) => item.id !== report.id
                );
        } catch (e) {
            if (token === generation) error.value = e.message || String(e);
        } finally {
            if (token === generation) loading.value = false;
        }
    }
    return { reports, hasNext, loading, error, load, remove, cancel };
}
