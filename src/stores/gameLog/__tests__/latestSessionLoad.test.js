import { describe, expect, test, vi } from 'vitest';
import { createLatestSessionLoad } from '../latestSessionLoad';

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('latest session load', () => {
    test('coalesces rapid searches and ignores an older response', async () => {
        const first = deferred();
        const output = [];
        const run = vi.fn(async (operation, isCurrent) => {
            if (operation.term === 'old') await first.promise;
            if (isCurrent()) output.push(operation.term);
        });
        const loading = vi.fn();
        const coordinator = createLatestSessionLoad({
            run,
            onLoadingChange: loading
        });
        const done = coordinator.reload({ term: 'old' });
        await tick();
        coordinator.reload({ term: 'middle' });
        coordinator.reload({ term: 'new' });
        first.resolve();
        await done;
        expect(run.mock.calls.map(([operation]) => operation.term)).toEqual([
            'old',
            'new'
        ]);
        expect(output).toEqual(['new']);
        expect(loading).toHaveBeenLastCalledWith(false);
    });

    test('filter reload supersedes load more', async () => {
        const more = deferred();
        const output = [];
        const coordinator = createLatestSessionLoad({
            run: async (operation, isCurrent) => {
                if (operation.mode === 'more') await more.promise;
                if (isCurrent()) output.push(operation.mode);
            },
            onLoadingChange: vi.fn()
        });
        const done = coordinator.more();
        await tick();
        coordinator.reload({ mode: 'filter' });
        more.resolve();
        await done;
        expect(output).toEqual(['filter']);
    });

    test('resets loading after current error and logout invalidation', async () => {
        const loading = vi.fn();
        const run = vi.fn().mockRejectedValueOnce(new Error('offline'));
        const coordinator = createLatestSessionLoad({
            run,
            onLoadingChange: loading
        });
        await expect(coordinator.reload({ mode: 'initial' })).rejects.toThrow(
            'offline'
        );
        expect(loading).toHaveBeenLastCalledWith(false);

        const pending = deferred();
        run.mockImplementationOnce(() => pending.promise);
        const done = coordinator.reload({ mode: 'initial' });
        await tick();
        coordinator.invalidate();
        expect(loading).toHaveBeenLastCalledWith(false);
        coordinator.reload({ mode: 'after-login' });
        expect(loading).toHaveBeenLastCalledWith(true);
        pending.resolve();
        await done;
        expect(run).toHaveBeenCalledWith(
            { mode: 'after-login' },
            expect.any(Function)
        );
        expect(loading).toHaveBeenLastCalledWith(false);
    });
});
