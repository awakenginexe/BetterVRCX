import { describe, expect, test, vi } from 'vitest';
import { createInviteBatchManager } from '../inviteBatch';

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

const recipients = [
    { id: 'usr_a', name: 'Alice' },
    { id: 'usr_b', name: 'Bob' }
];
const options = {
    accountId: 'usr_me',
    instanceId: 'wrld_1:123',
    worldName: 'World',
    recipients
};

function makeManager(
    send = vi.fn().mockResolvedValue({}),
    current = () => 'usr_me'
) {
    return createInviteBatchManager({
        send,
        getAccountId: current,
        isLoggedIn: () => true
    });
}

describe('invite batch', () => {
    test('deduplicates recipients and counts only acknowledged sends as success', async () => {
        const send = vi.fn().mockResolvedValue({});
        const manager = makeManager(send);
        await manager.start({
            ...options,
            recipients: [...recipients, recipients[0]]
        });
        expect(send).toHaveBeenCalledTimes(2);
        expect(manager.summary()).toMatchObject({
            total: 2,
            completed: 2,
            succeeded: 2,
            failed: 0
        });
        expect(manager.state.status).toBe('success');
    });

    test('partial failure has a retryable entry without resending success', async () => {
        let now = 0;
        const send = vi
            .fn()
            .mockResolvedValueOnce({})
            .mockRejectedValueOnce(
                Object.assign(new Error('rate limited'), { status: 429 })
            )
            .mockResolvedValue({});
        const manager = createInviteBatchManager({
            send,
            getAccountId: () => 'usr_me',
            isLoggedIn: () => true,
            now: () => now
        });
        await manager.start(options);
        expect(manager.state.status).toBe('partial');
        expect(manager.summary()).toMatchObject({ succeeded: 1, failed: 1 });
        expect(await manager.retryFailed()).toBe(false);
        now = 60_001;
        await manager.retryFailed();
        expect(send.mock.calls.map(([item]) => item.id)).toEqual([
            'usr_a',
            'usr_b',
            'usr_b'
        ]);
        expect(manager.state.status).toBe('success');
    });

    test('timeout remains uncertain and cannot be blindly retried', async () => {
        const send = vi
            .fn()
            .mockRejectedValue(
                Object.assign(new Error('timeout'), { status: 0 })
            );
        const manager = makeManager(send);
        await manager.start(options);
        expect(manager.state.status).toBe('uncertain');
        expect(manager.summary()).toMatchObject({ unknown: 1, cancelled: 1 });
        expect(await manager.retryFailed()).toBe(false);
        expect(send).toHaveBeenCalledTimes(1);
    });

    test('cancel stops unstarted recipients but records in-flight result', async () => {
        const first = deferred();
        const send = vi.fn().mockReturnValueOnce(first.promise);
        const manager = makeManager(send);
        const done = manager.start(options);
        await Promise.resolve();
        manager.cancel();
        first.resolve({});
        await done;
        expect(send).toHaveBeenCalledTimes(1);
        expect(manager.summary()).toMatchObject({ succeeded: 1, cancelled: 1 });
        expect(manager.state.status).toBe('cancelled');
    });

    test('duplicate submit is ignored and account switching stops the queue', async () => {
        let accountId = 'usr_me';
        const first = deferred();
        const send = vi.fn().mockReturnValueOnce(first.promise);
        const manager = makeManager(send, () => accountId);
        const done = manager.start(options);
        await Promise.resolve();
        expect(await manager.start(options)).toBe(false);
        accountId = 'usr_other';
        first.resolve({});
        await done;
        expect(send).toHaveBeenCalledTimes(1);
        expect(manager.state.status).toBe('cancelled');
    });

    test('logout stops remaining recipients and completed results survive view remount', async () => {
        let loggedIn = true;
        const first = deferred();
        const send = vi.fn().mockReturnValueOnce(first.promise);
        const manager = createInviteBatchManager({
            send,
            getAccountId: () => 'usr_me',
            isLoggedIn: () => loggedIn
        });
        const done = manager.start(options);
        const firstView = manager.state;
        loggedIn = false;
        first.resolve({});
        await done;
        const reopenedView = manager.state;
        expect(reopenedView).toBe(firstView);
        expect(manager.summary()).toMatchObject({ succeeded: 1, cancelled: 1 });
    });

    test('explicit server rejection gives total failure without safe retry', async () => {
        const send = vi
            .fn()
            .mockRejectedValue(
                Object.assign(new Error('Forbidden'), { status: 403 })
            );
        const manager = makeManager(send);
        await manager.start(options);
        expect(manager.state.status).toBe('failure');
        expect(manager.summary()).toMatchObject({ failed: 2, succeeded: 0 });
        expect(await manager.retryFailed()).toBe(false);
    });

    test('rate limit stops remaining sends and observes Retry-After on manual retry', async () => {
        let now = 1000;
        const send = vi
            .fn()
            .mockRejectedValueOnce(
                Object.assign(new Error('rate limited'), {
                    status: 429,
                    retryAfter: '120'
                })
            )
            .mockResolvedValue({});
        const manager = createInviteBatchManager({
            send,
            getAccountId: () => 'usr_me',
            isLoggedIn: () => true,
            now: () => now
        });
        await manager.start(options);
        expect(send).toHaveBeenCalledTimes(1);
        expect(manager.summary()).toMatchObject({ failed: 2, succeeded: 0 });
        expect(await manager.retryFailed()).toBe(false);
        now = 121_001;
        await manager.retryFailed();
        expect(send).toHaveBeenCalledTimes(3);
        expect(manager.state.status).toBe('success');
    });
});
