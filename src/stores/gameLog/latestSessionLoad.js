/** Runs one session query at a time and keeps only the most recent reload. */
export function createLatestSessionLoad({ run, onLoadingChange }) {
    let generation = 0;
    let pending = null;
    let active = null;
    let loading = false;

    function setLoading(value) {
        if (loading === value) return;
        loading = value;
        onLoadingChange(value);
    }

    function drain() {
        setLoading(true);
        if (active) return active;
        active = (async () => {
            try {
                while (pending) {
                    const operation = pending;
                    pending = null;
                    const requestGeneration = generation;
                    try {
                        await run(
                            operation,
                            () => requestGeneration === generation
                        );
                    } catch (error) {
                        if (requestGeneration === generation && !pending) {
                            throw error;
                        }
                    }
                }
            } finally {
                active = null;
                setLoading(false);
            }
        })();
        return active;
    }

    return {
        reload(operation) {
            generation += 1;
            pending = operation;
            return drain();
        },
        more() {
            if (!pending) pending = { mode: 'more' };
            return drain();
        },
        invalidate() {
            generation += 1;
            pending = null;
            setLoading(false);
        }
    };
}
