import { beforeEach, afterEach, expect, it, vi } from 'vitest';
vi.mock('worker-timers', () => ({
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id)
}));
import { createAppUsageTracker, sanitizeUsageEvent } from '../tracker';
const session = { sessionId: 'run-1', startedAt: 1000000, platform: 'win32' };
let client, load, getSession, tracker;
beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1000000);
    localStorage.clear();
    sessionStorage.clear();
    client = {
        init: vi.fn(() => ({ promise: Promise.resolve() })),
        add: vi.fn(() => ({ promise: Promise.resolve() })),
        track: vi.fn(() => ({ promise: Promise.resolve() })),
        flush: vi.fn(() => ({ promise: Promise.resolve() })),
        setOptOut: vi.fn()
    };
    load = vi.fn().mockResolvedValue(client);
    getSession = vi.fn().mockResolvedValue(session);
    tracker = createAppUsageTracker({
        apiKey: 'test-public-key',
        version: '3.7.0',
        loadClient: load,
        getSession
    });
});
afterEach(() => {
    tracker.disable();
    vi.useRealTimers();
});
it('only starts when explicitly started, then emits the approved app metadata', async () => {
    expect(load).not.toHaveBeenCalled();
    await tracker.start();
    expect(client.track).toHaveBeenCalledWith(
        'App Started',
        { version: '3.7.0', platform: 'win32' },
        expect.any(Object)
    );
    expect(client.init.mock.calls[0][1]).toMatchObject({
        serverZone: 'EU',
        autocapture: false,
        defaultTracking: false,
        remoteConfig: { fetchRemoteConfig: false },
        enableDiagnostics: false,
        identityStorage: 'none',
        trackingOptions: { ipAddress: false, language: false, platform: false }
    });
});
it('emits one heartbeat per ten minutes with uptime', async () => {
    await tracker.start();
    await vi.advanceTimersByTimeAsync(599999);
    expect(client.track).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(client.track).toHaveBeenLastCalledWith(
        'App Heartbeat',
        { uptime_seconds: 600 },
        expect.any(Object)
    );
});
it('records real close duration once, not on renderer disposal', async () => {
    await tracker.start();
    vi.setSystemTime(3847000);
    await tracker.close();
    await tracker.close();
    expect(client.track).toHaveBeenLastCalledWith(
        'App Closed',
        { session_duration_seconds: 2847 },
        expect.any(Object)
    );
    expect(client.track).toHaveBeenCalledTimes(2);
});
it('renderer reload retains run identity and heartbeat schedule without another start or close', async () => {
    await tracker.start();
    await vi.advanceTimersByTimeAsync(300000);
    tracker.dispose();
    tracker = createAppUsageTracker({
        apiKey: 'test-public-key',
        version: '3.7.0',
        loadClient: load,
        getSession
    });
    await tracker.start();
    await vi.advanceTimersByTimeAsync(300000);
    expect(client.track.mock.calls.map(([name]) => name)).toEqual([
        'App Started',
        'App Heartbeat'
    ]);
});
it('disabled means no later events or queued sends and clears run state', async () => {
    await tracker.start();
    tracker.disable();
    await vi.advanceTimersByTimeAsync(1200000);
    await tracker.close();
    expect(client.track).toHaveBeenCalledTimes(1);
    expect(client.setOptOut).toHaveBeenLastCalledWith(true);
});
it('disabling during async startup prevents events', async () => {
    let resolve;
    load.mockImplementation(
        () =>
            new Promise((r) => {
                resolve = r;
            })
    );
    const starting = tracker.start();
    await Promise.resolve();
    await Promise.resolve();
    tracker.disable();
    resolve(client);
    await starting;
    expect(client.track).not.toHaveBeenCalled();
});
it('keeps the same anonymous installation id but uses a new session on restart', async () => {
    await tracker.start();
    const id = client.init.mock.calls[0][1].deviceId;
    tracker.dispose();
    getSession.mockResolvedValue({
        ...session,
        sessionId: 'run-2',
        startedAt: 2000000
    });
    await tracker.start();
    expect(client.init.mock.calls[1][1].deviceId).toBe(id);
    expect(client.track.mock.calls.map(([name]) => name)).toEqual([
        'App Started',
        'App Started'
    ]);
});
it('SDK or unavailable host failures do not break the app', async () => {
    getSession.mockRejectedValue(new Error('old host'));
    await expect(tracker.start()).resolves.toBeUndefined();
    expect(load).not.toHaveBeenCalled();
});
it('drops unknown events and strips identity, friend data, URLs, user agent and unsolicited properties', () => {
    expect(sanitizeUsageEvent({ event_type: 'page_view' })).toBeUndefined();
    const output = sanitizeUsageEvent({
        event_type: 'App Heartbeat',
        device_id: 'random-id',
        session_id: 1,
        time: 1,
        insert_id: 'insert-id',
        user_id: 'usr_friend',
        user_agent: 'private-agent',
        user_properties: { friends: ['secret'] },
        event_properties: {
            uptime_seconds: 600,
            location: 'wrld_private',
            url: 'secret'
        }
    });
    expect(output).toEqual({
        event_type: 'App Heartbeat',
        device_id: 'random-id',
        session_id: 1,
        time: 1,
        insert_id: 'insert-id',
        event_properties: { uptime_seconds: 600 },
        ip: '0.0.0.0'
    });
});

it('an obsolete SDK initialization cannot opt out a newer enabled client', async () => {
    let finishOld;
    const oldClient = {
        ...client,
        init: vi.fn(() => ({
            promise: new Promise((resolve) => {
                finishOld = resolve;
            })
        })),
        setOptOut: vi.fn()
    };
    load.mockResolvedValueOnce(oldClient).mockResolvedValueOnce(client);
    const oldRun = tracker.start();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    tracker.disable();
    await tracker.start();
    finishOld();
    await oldRun;
    expect(client.setOptOut).toHaveBeenLastCalledWith(false);
});
