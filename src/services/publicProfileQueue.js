/**
 * Limits background public-profile requests. Profile data remains owned by the
 * query cache; this queue holds only pending IDs and a short retry cooldown.
 */
export function createPublicProfileQueue({
    fetchProfile,
    onSettled,
    maxConcurrent = 3,
    now = Date.now
}) {
    let scope = '';
    let generation = 0;
    let active = 0;
    let pending = [];
    const queued = new Set();
    const nextAttempt = new Map();

    function drain() {
        while (active < maxConcurrent && pending.length) {
            const userId = pending.shift();
            const requestGeneration = generation;
            const requestScope = scope;
            active += 1;
            Promise.resolve()
                .then(() =>
                    requestGeneration === generation
                        ? fetchProfile(userId, requestScope)
                        : undefined
                )
                .then(
                    () => finish(userId, requestGeneration),
                    () => finish(userId, requestGeneration)
                );
        }
    }

    function finish(userId, requestGeneration) {
        active -= 1;
        if (requestGeneration === generation) {
            queued.delete(userId);
            nextAttempt.set(userId, now() + 60_000);
            onSettled(userId);
        }
        drain();
    }

    return {
        setScope(nextScope) {
            if (scope === nextScope) return;
            scope = nextScope;
            generation += 1;
            pending = [];
            queued.clear();
            nextAttempt.clear();
        },
        enqueue(userIds) {
            if (!scope) return;
            for (const userId of userIds) {
                if (
                    !userId ||
                    queued.has(userId) ||
                    now() < (nextAttempt.get(userId) ?? 0)
                )
                    continue;
                queued.add(userId);
                pending.push(userId);
            }
            drain();
        },
        invalidate() {
            generation += 1;
            pending = [];
            queued.clear();
            nextAttempt.clear();
        }
    };
}
