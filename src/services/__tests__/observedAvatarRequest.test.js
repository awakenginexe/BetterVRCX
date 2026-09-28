import { describe, expect, test, vi } from 'vitest';

vi.mock('../../api', () => ({ avatarRequest: { getAvatar: vi.fn() } }));

import { createObservedAvatarRequester } from '../observedAvatarRequest';

describe('observed avatar requests', () => {
    test('serializes requests and waits two seconds between starts', async () => {
        let time = 10_000;
        let finishFirst;
        const request = vi
            .fn()
            .mockImplementationOnce(
                () => new Promise((resolve) => (finishFirst = resolve))
            )
            .mockResolvedValueOnce({ json: { id: 'second' } });
        const wait = vi.fn(async (ms) => {
            time += ms;
        });
        const requester = createObservedAvatarRequester({
            request,
            now: () => time,
            wait
        });

        const first = requester.getAvatar('first');
        const second = requester.getAvatar('second');
        await Promise.resolve();
        expect(request).toHaveBeenCalledTimes(1);

        finishFirst({ json: { id: 'first' } });
        await expect(first).resolves.toEqual({
            status: 'ok',
            json: { id: 'first' }
        });
        await expect(second).resolves.toEqual({
            status: 'ok',
            json: { id: 'second' }
        });
        expect(wait).toHaveBeenCalledExactlyOnceWith(2_000);
        expect(request.mock.calls).toEqual([['first'], ['second']]);
    });

    test('stops requests on HTTP 429 and honors the longer Retry-After', async () => {
        let time = 10_000;
        const request = vi
            .fn()
            .mockRejectedValueOnce(
                Object.assign(new Error('rate limited'), {
                    status: 429,
                    retryAfter: '120'
                })
            )
            .mockResolvedValueOnce({ json: { id: 'later' } });
        const requester = createObservedAvatarRequester({
            request,
            now: () => time,
            wait: async () => {}
        });

        await expect(requester.getAvatar('first')).resolves.toEqual({
            status: 'rate_limited'
        });
        await expect(requester.getAvatar('second')).resolves.toEqual({
            status: 'rate_limited'
        });
        expect(request).toHaveBeenCalledTimes(1);

        time += 120_000;
        await expect(requester.getAvatar('later')).resolves.toEqual({
            status: 'ok',
            json: { id: 'later' }
        });
        expect(request).toHaveBeenCalledTimes(2);
    });

    test('drops a queued request when its profile is closed', async () => {
        let finishFirst;
        let cancelled = false;
        const request = vi.fn(
            () => new Promise((resolve) => (finishFirst = resolve))
        );
        const requester = createObservedAvatarRequester({
            request,
            now: () => 10_000
        });

        const first = requester.getAvatar('first');
        const second = requester.getAvatar('second', () => cancelled);
        await Promise.resolve();
        cancelled = true;
        finishFirst({ json: { id: 'first' } });
        await first;
        await expect(second).resolves.toEqual({ status: 'cancelled' });
        expect(request).toHaveBeenCalledTimes(1);
    });
});
