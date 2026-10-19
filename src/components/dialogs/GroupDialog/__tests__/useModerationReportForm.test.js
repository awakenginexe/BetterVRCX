import { describe, expect, test, vi } from 'vitest';
import { ref } from 'vue';
import { useModerationReportForm } from '../useModerationReportForm';
function setup() {
    const context = ref({
        type: 'user',
        contentId: 'usr_target',
        details: { location: 'world' }
    });
    const config = ref({
        reportOptions: { user: { behavior: ['hacking'] } },
        reportCategories: { behavior: { text: 'Behavior', order: 1 } },
        reportReasons: { hacking: { text: 'Hacking' } }
    });
    const api = {
        submitModerationReport: vi
            .fn()
            .mockResolvedValue({ json: { id: 'report_1' } })
    };
    return {
        context,
        api,
        state: useModerationReportForm(context, config, api)
    };
}
describe('moderation report form', () => {
    test('submits only category and reason allowed by the live configuration', async () => {
        const { state, api } = setup();
        state.category.value = 'behavior';
        state.reason.value = 'unsupported';
        expect(state.canSubmit.value).toBe(false);
        expect(await state.submit()).toBe(false);
        expect(api.submitModerationReport).not.toHaveBeenCalled();
        state.reason.value = 'hacking';
        state.description.value = '  Details  ';
        expect(await state.submit()).toBe(true);
        expect(api.submitModerationReport).toHaveBeenCalledWith({
            type: 'user',
            contentId: 'usr_target',
            category: 'behavior',
            reason: 'hacking',
            description: 'Details',
            details: { location: 'world' }
        });
    });
    test('failed submission preserves form for retry and exposes the error', async () => {
        const { state, api } = setup();
        state.category.value = 'behavior';
        state.reason.value = 'hacking';
        api.submitModerationReport.mockRejectedValue(new Error('Unavailable'));
        expect(await state.submit()).toBe(false);
        expect(state.reason.value).toBe('hacking');
        expect(state.error.value).toBe('Unavailable');
        expect(state.loading.value).toBe(false);
    });
    test('switching targets prevents an earlier submission from closing the new form', async () => {
        const { state, api, context } = setup();
        let resolve;
        state.category.value = 'behavior';
        state.reason.value = 'hacking';
        api.submitModerationReport.mockReturnValue(
            new Promise((r) => {
                resolve = r;
            })
        );
        const pending = state.submit();
        context.value = { type: 'user', contentId: 'usr_other' };
        state.reset();
        resolve({ json: {} });
        expect(await pending).toBe(false);
        expect(state.category.value).toBe('');
    });
});
