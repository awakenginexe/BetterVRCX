import { reactive } from 'vue';

function retryAfterMillis(error, now) {
    const value = error?.retryAfter ?? error?.headers?.['Retry-After'];
    if (value == null) return 60_000;
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
    const date = Date.parse(String(value));
    return Number.isFinite(date) ? Math.max(0, date - now) : 60_000;
}

function classifyFailure(error) {
    const status = Number(error?.status || 0);
    if (status === 429)
        return { status: 'failed', reason: 'rate_limited', retryable: true };
    if (status >= 400 && status < 500 && status !== 408) {
        return { status: 'failed', reason: 'rejected', retryable: false };
    }
    return { status: 'unknown', reason: 'uncertain', retryable: false };
}

/**
 * @param {{send: (payload: any) => Promise<any>, getAccountId: () => string,
 * isLoggedIn: () => boolean, onSuccess?: (entry: any, payload: any) => void,
 * onFinished?: (status: string, summary: any) => void, now?: () => number}} options
 */
export function createInviteBatchManager({
    send,
    getAccountId,
    isLoggedIn,
    onSuccess = () => {},
    onFinished = () => {},
    now = Date.now
}) {
    const state = reactive({
        accountId: '',
        instanceId: '',
        worldName: '',
        status: 'idle',
        entries: [],
        retryAfterAt: 0,
        cancelRequested: false
    });
    let payload = null;

    function summary() {
        const count = (status) =>
            state.entries.filter((entry) => entry.status === status).length;
        return {
            total: state.entries.length,
            completed: state.entries.filter(
                (entry) => !['pending', 'sending'].includes(entry.status)
            ).length,
            succeeded: count('success'),
            failed: count('failed'),
            unknown: count('unknown'),
            cancelled: count('cancelled')
        };
    }

    function cancelPending(reason = 'cancelled') {
        for (const entry of state.entries) {
            if (entry.status === 'pending') {
                entry.status = 'cancelled';
                entry.reason = reason;
            }
        }
    }

    function accountIsCurrent() {
        return isLoggedIn() && getAccountId() === state.accountId;
    }

    async function run() {
        state.status = 'running';
        for (const entry of state.entries) {
            if (entry.status !== 'pending') continue;
            if (state.cancelRequested || !accountIsCurrent()) {
                state.cancelRequested = true;
                cancelPending(
                    accountIsCurrent() ? 'cancelled' : 'account_changed'
                );
                break;
            }
            entry.status = 'sending';
            try {
                await send({ ...payload, id: entry.id });
                entry.status = 'success';
                try {
                    onSuccess(entry, payload);
                } catch (error) {
                    console.error(error);
                }
            } catch (error) {
                const result = classifyFailure(error);
                Object.assign(entry, result, {
                    detail: String(error?.message || '')
                });
                if (result.reason === 'rate_limited') {
                    state.retryAfterAt = now() + retryAfterMillis(error, now());
                    for (const remaining of state.entries) {
                        if (remaining.status === 'pending') {
                            Object.assign(remaining, {
                                status: 'failed',
                                reason: 'rate_limit_unattempted',
                                retryable: true
                            });
                        }
                    }
                    break;
                }
                if (result.status === 'unknown') {
                    cancelPending('stopped_unknown');
                    break;
                }
            }
        }

        const result = summary();
        state.status = state.cancelRequested
            ? 'cancelled'
            : result.unknown
              ? 'uncertain'
              : result.failed
                ? result.succeeded
                    ? 'partial'
                    : 'failure'
                : 'success';
        onFinished(state.status, result);
        return result;
    }

    return {
        state,
        summary,
        start(options) {
            if (
                state.status === 'running' ||
                !isLoggedIn() ||
                getAccountId() !== options.accountId ||
                !options.instanceId
            )
                return false;
            const seen = new Set();
            const entries = [];
            for (const person of options.recipients || []) {
                const id = String(person?.id || '');
                if (!id || seen.has(id)) continue;
                seen.add(id);
                entries.push({
                    id,
                    name: String(person?.name || id),
                    status: 'pending',
                    reason: '',
                    retryable: false,
                    detail: ''
                });
            }
            if (!entries.length) return false;
            state.accountId = options.accountId;
            state.instanceId = options.instanceId;
            state.worldName = options.worldName || '';
            state.entries = entries;
            state.retryAfterAt = 0;
            state.cancelRequested = false;
            payload = { ...options, recipients: undefined };
            return run();
        },
        retryFailed() {
            if (
                state.status === 'running' ||
                !accountIsCurrent() ||
                now() < state.retryAfterAt
            )
                return false;
            const retryable = state.entries.filter(
                (entry) => entry.status === 'failed' && entry.retryable
            );
            if (!retryable.length) return false;
            for (const entry of retryable) {
                entry.status = 'pending';
                entry.reason = '';
                entry.detail = '';
            }
            state.cancelRequested = false;
            state.retryAfterAt = 0;
            return run();
        },
        cancel() {
            if (state.status !== 'running') return;
            state.cancelRequested = true;
            cancelPending();
        }
    };
}
