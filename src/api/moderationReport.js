import { request } from '../services/request';

export default {
    getModerationReports(params) {
        return request('moderationReports', { method: 'GET', params }).then(
            (json) => ({ json, params })
        );
    },
    submitModerationReport(params) {
        return request('moderationReports', { method: 'POST', params }).then(
            (json) => ({ json, params })
        );
    },
    deleteModerationReport(params) {
        return request(`moderationReports/${params.moderationReportId}`, {
            method: 'DELETE'
        }).then((json) => ({ json, params }));
    }
};
