export const AVAILABILITY_NOTIFY_TRIGGERS = Object.freeze({
    ACTIVE: 'active',
    ONLINE: 'online'
});

export const AVAILABILITY_NOTIFY_DURATIONS = Object.freeze({
    ONCE: 'once',
    SEVEN_DAYS: '7days',
    THIRTY_DAYS: '30days',
    FOREVER: 'forever'
});

const DAY_MS = 24 * 60 * 60 * 1000;
const DURATION_MS = Object.freeze({
    [AVAILABILITY_NOTIFY_DURATIONS.SEVEN_DAYS]: 7 * DAY_MS,
    [AVAILABILITY_NOTIFY_DURATIONS.THIRTY_DAYS]: 30 * DAY_MS
});

const VALID_TRIGGERS = new Set(Object.values(AVAILABILITY_NOTIFY_TRIGGERS));
const VALID_DURATIONS = new Set(Object.values(AVAILABILITY_NOTIFY_DURATIONS));

function createDefaultTriggers(triggers = {}) {
    const active = triggers[AVAILABILITY_NOTIFY_TRIGGERS.ACTIVE];
    const online = triggers[AVAILABILITY_NOTIFY_TRIGGERS.ONLINE];
    const normalized = {
        [AVAILABILITY_NOTIFY_TRIGGERS.ACTIVE]:
            typeof active === 'boolean' ? active : true,
        [AVAILABILITY_NOTIFY_TRIGGERS.ONLINE]:
            typeof online === 'boolean' ? online : true
    };
    if (!normalized.active && !normalized.online) {
        normalized.active = true;
        normalized.online = true;
    }
    return normalized;
}

function createDefaultCompleted(completed = {}) {
    return {
        [AVAILABILITY_NOTIFY_TRIGGERS.ACTIVE]: Boolean(
            completed[AVAILABILITY_NOTIFY_TRIGGERS.ACTIVE]
        ),
        [AVAILABILITY_NOTIFY_TRIGGERS.ONLINE]: Boolean(
            completed[AVAILABILITY_NOTIFY_TRIGGERS.ONLINE]
        )
    };
}

function getExpiresAt(duration, now) {
    const ttl = DURATION_MS[duration];
    return ttl ? now + ttl : null;
}

function isOnceWatch(watch) {
    return watch.duration === AVAILABILITY_NOTIFY_DURATIONS.ONCE;
}

function selectedTriggersComplete(watch) {
    return Object.values(AVAILABILITY_NOTIFY_TRIGGERS).every((trigger) => {
        if (!watch.triggers[trigger]) return true;
        return Boolean(watch.completed[trigger]);
    });
}

function toTransitionTrigger(state) {
    if (state === AVAILABILITY_NOTIFY_TRIGGERS.ACTIVE) {
        return AVAILABILITY_NOTIFY_TRIGGERS.ACTIVE;
    }
    if (state === AVAILABILITY_NOTIFY_TRIGGERS.ONLINE) {
        return AVAILABILITY_NOTIFY_TRIGGERS.ONLINE;
    }
    return '';
}

export function normalizeAvailabilityWatch(watch = {}) {
    const now = Date.now();
    const duration = VALID_DURATIONS.has(watch.duration)
        ? watch.duration
        : AVAILABILITY_NOTIFY_DURATIONS.ONCE;
    const createdAt = Number.isFinite(watch.createdAt) ? watch.createdAt : now;
    const expiresAt =
        watch.expiresAt === null || typeof watch.expiresAt === 'undefined'
            ? null
            : Number(watch.expiresAt) || null;

    return {
        userId: typeof watch.userId === 'string' ? watch.userId : '',
        displayName:
            typeof watch.displayName === 'string' ? watch.displayName : '',
        duration,
        triggers: createDefaultTriggers(watch.triggers),
        completed: createDefaultCompleted(watch.completed),
        createdAt,
        updatedAt: Number.isFinite(watch.updatedAt)
            ? watch.updatedAt
            : createdAt,
        expiresAt
    };
}

export function createAvailabilityWatch({
    userId,
    displayName = '',
    duration = AVAILABILITY_NOTIFY_DURATIONS.ONCE,
    triggers,
    now = Date.now()
}) {
    const normalizedDuration = VALID_DURATIONS.has(duration)
        ? duration
        : AVAILABILITY_NOTIFY_DURATIONS.ONCE;
    return normalizeAvailabilityWatch({
        userId,
        displayName,
        duration: normalizedDuration,
        triggers,
        completed: {},
        createdAt: now,
        updatedAt: now,
        expiresAt: getExpiresAt(normalizedDuration, now)
    });
}

export function isAvailabilityWatchExpired(watch, now = Date.now()) {
    const normalized = normalizeAvailabilityWatch(watch);
    return (
        typeof normalized.expiresAt === 'number' && normalized.expiresAt <= now
    );
}

export function applyAvailabilityTransition(
    watch,
    { previousState, newState, now = Date.now() } = {}
) {
    const normalized = normalizeAvailabilityWatch(watch);
    if (!normalized.userId || isAvailabilityWatchExpired(normalized, now)) {
        return {
            watch: null,
            notification: null,
            changed: true,
            removed: true
        };
    }

    const trigger = toTransitionTrigger(newState);
    if (
        !trigger ||
        previousState === newState ||
        !VALID_TRIGGERS.has(trigger)
    ) {
        return {
            watch: normalized,
            notification: null,
            changed: false,
            removed: false
        };
    }

    if (
        !normalized.triggers[trigger] ||
        (isOnceWatch(normalized) && normalized.completed[trigger])
    ) {
        return {
            watch: normalized,
            notification: null,
            changed: false,
            removed: false
        };
    }

    const nextWatch = {
        ...normalized,
        completed: { ...normalized.completed },
        updatedAt: now
    };

    if (isOnceWatch(nextWatch)) {
        nextWatch.completed[trigger] = true;
        if (
            trigger === AVAILABILITY_NOTIFY_TRIGGERS.ONLINE &&
            nextWatch.triggers[AVAILABILITY_NOTIFY_TRIGGERS.ACTIVE] &&
            !nextWatch.completed[AVAILABILITY_NOTIFY_TRIGGERS.ACTIVE]
        ) {
            nextWatch.completed[AVAILABILITY_NOTIFY_TRIGGERS.ACTIVE] = true;
        }
    }

    const notification = {
        userId: nextWatch.userId,
        displayName: nextWatch.displayName,
        trigger,
        createdAt: now
    };

    if (isOnceWatch(nextWatch) && selectedTriggersComplete(nextWatch)) {
        return {
            watch: null,
            notification,
            changed: true,
            removed: true
        };
    }

    return {
        watch: nextWatch,
        notification,
        changed: isOnceWatch(nextWatch),
        removed: false
    };
}

export function formatAvailabilityNotificationText(displayName, trigger) {
    const name = displayName || 'Friend';
    const body =
        trigger === AVAILABILITY_NOTIFY_TRIGGERS.ACTIVE
            ? 'is active'
            : 'is online';
    return {
        title: name,
        body,
        speech: `${name} ${body}`
    };
}
