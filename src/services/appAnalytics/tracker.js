import * as timers from 'worker-timers';

const INTERVAL = 10 * 60 * 1000;
const DEVICE_KEY = 'BetterVRCX_appUsageInstallationId';
const RUN_KEY = 'BetterVRCX_appUsageRun';
const EVENT_PROPERTIES = {
    'App Started': ['version', 'platform'],
    'App Heartbeat': ['uptime_seconds'],
    'App Closed': ['session_duration_seconds']
};

/** Final allowlist after SDK enrichment; never pass through application objects. */
export function sanitizeUsageEvent(event) {
    const keys = EVENT_PROPERTIES[event.event_type];
    if (!keys) return undefined;
    const eventProperties = {};
    for (const key of keys) {
        const value = event.event_properties?.[key];
        if (
            typeof value === 'string' ||
            (typeof value === 'number' && Number.isFinite(value))
        )
            eventProperties[key] = value;
    }
    return {
        event_type: event.event_type,
        device_id: event.device_id,
        session_id: event.session_id,
        time: event.time,
        insert_id: event.insert_id,
        event_properties: eventProperties,
        // Explicitly prevent ingestion-time IP geolocation enrichment.
        ip: '0.0.0.0'
    };
}

/** One main-renderer tracker; native session identity distinguishes reload from exit. */
export function createAppUsageTracker({
    apiKey,
    version,
    loadClient,
    getSession
}) {
    let client;
    let run;
    let active = false;
    let generation = 0;
    let timer;
    let starting;
    function readRun() {
        try {
            return JSON.parse(sessionStorage.getItem(RUN_KEY) || 'null');
        } catch {
            return null;
        }
    }
    function saveRun() {
        try {
            sessionStorage.setItem(RUN_KEY, JSON.stringify(run));
        } catch {
            /* Native run ID also deduplicates start events server-side. */
        }
    }
    function installationId() {
        let id;
        try {
            id = localStorage.getItem(DEVICE_KEY);
        } catch {
            /* Storage may be unavailable. */
        }
        if (!/^[0-9a-f-]{36}$/i.test(id || '')) {
            id = crypto.randomUUID();
            try {
                localStorage.setItem(DEVICE_KEY, id);
            } catch {
                /* Use this renderer's random ID. */
            }
        }
        return id;
    }
    function emit(name, properties, insertId) {
        if (!active || !client || !run) return;
        try {
            const result = client.track(name, properties, {
                session_id: run.startedAt,
                time: Date.now(),
                ...(insertId ? { insert_id: insertId } : {})
            });
            result?.promise?.catch(() => {});
            return result?.promise;
        } catch {
            /* Usage reporting must never break the app. */
        }
    }
    function schedule() {
        if (!active || !run) return;
        const currentGeneration = generation;
        timer = timers.setTimeout(
            () => {
                if (!active || currentGeneration !== generation) return;
                run.lastHeartbeatAt = Date.now();
                saveRun();
                emit('App Heartbeat', {
                    uptime_seconds: Math.max(
                        0,
                        Math.floor((Date.now() - run.startedAt) / 1000)
                    )
                });
                schedule();
            },
            Math.max(1000, run.lastHeartbeatAt + INTERVAL - Date.now())
        );
    }
    function start() {
        if (active || starting) return starting || Promise.resolve();
        const currentGeneration = ++generation;
        starting = (async () => {
            try {
                const session = await getSession();
                if (
                    currentGeneration !== generation ||
                    !apiKey ||
                    !session?.sessionId ||
                    !Number.isFinite(session.startedAt) ||
                    !['win32', 'linux', 'darwin'].includes(session.platform)
                )
                    return;
                const loadedClient = await loadClient();
                if (currentGeneration !== generation) return;
                client = loadedClient;
                const previous = readRun();
                run =
                    previous?.sessionId === session.sessionId &&
                    !previous.closed
                        ? previous
                        : {
                              ...session,
                              lastHeartbeatAt: Date.now(),
                              started: false
                          };
                await loadedClient.init(apiKey, {
                    serverZone: 'EU',
                    deviceId: installationId(),
                    sessionId: run.startedAt,
                    identityStorage: 'none',
                    autocapture: false,
                    defaultTracking: false,
                    fetchRemoteConfig: false,
                    remoteConfig: { fetchRemoteConfig: false },
                    enableDiagnostics: false,
                    customEnrichment: false,
                    trackingOptions: {
                        ipAddress: false,
                        language: false,
                        platform: false
                    },
                    logLevel: 0,
                    flushQueueSize: 1,
                    flushIntervalMillis: 100,
                    flushMaxRetries: 0,
                    // No event queue or identity cookies on disk; only our random installation ID persists.
                    storageProvider: {
                        isEnabled: async () => true,
                        get: async () => undefined,
                        set: async () => {},
                        remove: async () => {}
                    },
                    transport: { type: 'fetch', enableKeepalive: true }
                }).promise;
                if (currentGeneration !== generation) {
                    loadedClient.setOptOut(true);
                    return;
                }
                await loadedClient.add({
                    name: 'bettervrcx-usage-only',
                    type: 'enrichment',
                    setup(config) {
                        const transport = config.transportProvider;
                        // Also gate queued SDK sends when the user switches analytics off.
                        if (transport)
                            config.transportProvider = {
                                send: (...args) =>
                                    active && currentGeneration === generation
                                        ? transport.send(...args)
                                        : Promise.resolve(null)
                            };
                    },
                    execute: async (event) =>
                        active && currentGeneration === generation
                            ? sanitizeUsageEvent(event)
                            : undefined
                }).promise;
                if (currentGeneration !== generation) {
                    loadedClient.setOptOut(true);
                    return;
                }
                active = true;
                client.setOptOut(false);
                if (!run.started) {
                    run.started = true;
                    saveRun();
                    emit(
                        'App Started',
                        { version, platform: session.platform },
                        `${session.sessionId}:started`
                    );
                }
                schedule();
            } catch {
                /* Missing host/API/network must never prevent startup. */
            } finally {
                if (currentGeneration === generation) starting = undefined;
            }
        })();
        return starting;
    }
    function dispose() {
        active = false;
        generation++;
        starting = undefined;
        if (timer !== undefined) timers.clearTimeout(timer);
        timer = undefined;
        client?.setOptOut(true);
    }
    function disable() {
        dispose();
        try {
            sessionStorage.removeItem(RUN_KEY);
        } catch {
            /* Storage may be unavailable. */
        }
        run = undefined;
    }
    async function close() {
        if (!active || !run || run.closed) return;
        if (timer !== undefined) timers.clearTimeout(timer);
        run.closed = true;
        saveRun();
        const sent = emit(
            'App Closed',
            {
                session_duration_seconds: Math.max(
                    0,
                    Math.floor((Date.now() - run.startedAt) / 1000)
                )
            },
            `${run.sessionId}:closed`
        );
        // Native shutdown also has a hard deadline. A crash or forced termination can lose this event.
        let deadline;
        try {
            await Promise.race([
                sent,
                new Promise((resolve) => {
                    deadline = setTimeout(resolve, 700);
                })
            ]);
        } finally {
            clearTimeout(deadline);
            dispose();
        }
    }
    return { start, disable, dispose, close };
}
