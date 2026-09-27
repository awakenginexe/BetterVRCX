import { describe, expect, test, vi } from 'vitest';
import { createPublicProfileQueue } from '../publicProfileQueue';

const deferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('publicProfileQueue', () => {
    test('bounds concurrent fetches and deduplicates recipients', async () => {
        const first = deferred();
        const requests = [first, deferred(), deferred()];
        const fetchProfile = vi
            .fn()
            .mockImplementation(() => requests.shift().promise);
        const onSettled = vi.fn();
        const queue = createPublicProfileQueue({
            fetchProfile,
            onSettled,
            maxConcurrent: 2
        });
        queue.setScope('account|instance');
        queue.enqueue(['usr_a', 'usr_a', 'usr_b', 'usr_c']);
        await tick();
        expect(fetchProfile).toHaveBeenCalledTimes(2);
        first.resolve();
        await tick();
        expect(fetchProfile).toHaveBeenCalledTimes(3);
    });

    test('ignores previous account responses and failed requests cool down', async () => {
        let now = 0;
        const old = deferred();
        const fetchProfile = vi
            .fn()
            .mockReturnValueOnce(old.promise)
            .mockRejectedValueOnce(new Error('offline'))
            .mockResolvedValue(undefined);
        const onSettled = vi.fn();
        const queue = createPublicProfileQueue({
            fetchProfile,
            onSettled,
            now: () => now
        });
        queue.setScope('old|instance');
        queue.enqueue(['usr_a']);
        await tick();
        queue.setScope('new|instance');
        old.resolve();
        await tick();
        expect(onSettled).not.toHaveBeenCalled();
        queue.enqueue(['usr_b']);
        await tick();
        expect(onSettled).toHaveBeenCalledTimes(1);
        queue.enqueue(['usr_b']);
        expect(fetchProfile).toHaveBeenCalledTimes(2);
        now = 60_001;
        queue.enqueue(['usr_b']);
        await tick();
        expect(fetchProfile).toHaveBeenCalledTimes(3);
    });
});
