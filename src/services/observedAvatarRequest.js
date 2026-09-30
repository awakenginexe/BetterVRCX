import { avatarRequest } from '../api';

const REQUEST_INTERVAL_MS = 2_000;
const DEFAULT_RATE_LIMIT_MS = 60_000;

function retryAfterMillis(error, now) {
    const value = error?.retryAfter;
    if (value == null) return DEFAULT_RATE_LIMIT_MS;
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0)
        return Math.max(DEFAULT_RATE_LIMIT_MS, seconds * 1_000);
    const date = Date.parse(String(value));
    return Number.isFinite(date)
        ? Math.max(DEFAULT_RATE_LIMIT_MS, date - now)
        : DEFAULT_RATE_LIMIT_MS;
}

export function createObservedAvatarRequester({
    request,
    now = Date.now,
    wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
}) {
    let queue = Promise.resolve();
    let nextRequestAt = 0;
    let rateLimitedUntil = 0;

    function run(operation, isCancelled = () => false) {
        const result = queue.then(async () => {
            if (isCancelled()) return { status: 'cancelled' };
            if (now() < rateLimitedUntil) return { status: 'rate_limited' };

            const delay = Math.max(0, nextRequestAt - now());
            if (delay) await wait(delay);
            if (isCancelled()) return { status: 'cancelled' };
            if (now() < rateLimitedUntil) return { status: 'rate_limited' };

            nextRequestAt = now() + REQUEST_INTERVAL_MS;
            try {
                const { json } = await operation();
                return { status: 'ok', json };
            } catch (error) {
                if (error?.status === 429) {
                    rateLimitedUntil = now() + retryAfterMillis(error, now());
                    return { status: 'rate_limited' };
                }
                return { status: 'error' };
            }
        });
        queue = result.then(() => {});
        return result;
    }

    function getAvatar(avatarId, isCancelled) {
        return run(() => request(avatarId), isCancelled);
    }

    return { getAvatar, run };
}

export const observedAvatarRequester = createObservedAvatarRequester({
    request: (avatarId) => avatarRequest.getAvatar({ avatarId })
});
