import { expect, it, vi } from 'vitest';
import { createInstance } from '@amplitude/analytics-browser';
import { createAppUsageTracker } from '../tracker';
vi.mock('worker-timers', () => ({
    setTimeout: () => 1,
    clearTimeout: () => {}
}));
it('real SDK sends only allowlisted payloads and no initialization/autocapture requests', async () => {
    localStorage.clear();
    sessionStorage.clear();
    const fetch = vi.fn().mockRejectedValue(new Error('Unexpected network'));
    vi.stubGlobal('fetch', fetch);
    const sent = [];
    const client = createInstance();
    // Replace transport at the documented plugin setup boundary; never contact Amplitude in tests.
    client.add({
        name: 'test-transport',
        type: 'before',
        setup(config) {
            config.transportProvider = {
                send: async (_url, payload) => {
                    sent.push(payload);
                    return {
                        status: 'success',
                        statusCode: 200,
                        body: { events_ingested: payload.events.length }
                    };
                }
            };
        },
        execute: async (event) => event
    });
    const tracker = createAppUsageTracker({
        apiKey: 'test-api-key',
        version: '3.7.0',
        getSession: async () => ({
            sessionId: 'host-session',
            startedAt: Date.now(),
            platform: 'win32'
        }),
        loadClient: async () => client
    });
    await tracker.start();
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(sent).toHaveLength(1);
    const event = sent[0].events[0];
    expect(event.event_type).toBe('App Started');
    expect(event.event_properties).toEqual({
        version: '3.7.0',
        platform: 'win32'
    });
    expect(event).not.toHaveProperty('user_agent');
    expect(event).not.toHaveProperty('user_id');
    expect(event).not.toHaveProperty('user_properties');
    expect(event.ip).toBe('0.0.0.0');
    expect(fetch).not.toHaveBeenCalled();
    tracker.disable();
    await client.track('App Heartbeat', { uptime_seconds: 10 }).promise;
    expect(sent).toHaveLength(1);
    vi.unstubAllGlobals();
});
