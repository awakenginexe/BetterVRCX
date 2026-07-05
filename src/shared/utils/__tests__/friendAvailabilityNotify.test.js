import { describe, expect, test } from 'vitest';

import {
    AVAILABILITY_NOTIFY_DURATIONS,
    AVAILABILITY_NOTIFY_TRIGGERS,
    applyAvailabilityTransition,
    createAvailabilityWatch,
    formatAvailabilityNotificationText,
    isAvailabilityWatchExpired,
    normalizeAvailabilityWatch
} from '../friendAvailabilityNotify';

const NOW = Date.parse('2026-07-04T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

describe('friend availability notification rules', () => {
    test('creates a one-shot watch with both triggers enabled by default', () => {
        const watch = createAvailabilityWatch({
            userId: 'usr_1',
            displayName: 'Aki',
            now: NOW
        });

        expect(watch).toMatchObject({
            userId: 'usr_1',
            displayName: 'Aki',
            duration: AVAILABILITY_NOTIFY_DURATIONS.ONCE,
            triggers: {
                [AVAILABILITY_NOTIFY_TRIGGERS.ACTIVE]: true,
                [AVAILABILITY_NOTIFY_TRIGGERS.ONLINE]: true
            },
            completed: {
                [AVAILABILITY_NOTIFY_TRIGGERS.ACTIVE]: false,
                [AVAILABILITY_NOTIFY_TRIGGERS.ONLINE]: false
            },
            createdAt: NOW,
            updatedAt: NOW,
            expiresAt: null
        });
    });

    test('sets seven-day and thirty-day expirations from the creation time', () => {
        const sevenDays = createAvailabilityWatch({
            userId: 'usr_1',
            duration: AVAILABILITY_NOTIFY_DURATIONS.SEVEN_DAYS,
            now: NOW
        });
        const thirtyDays = createAvailabilityWatch({
            userId: 'usr_1',
            duration: AVAILABILITY_NOTIFY_DURATIONS.THIRTY_DAYS,
            now: NOW
        });
        const forever = createAvailabilityWatch({
            userId: 'usr_1',
            duration: AVAILABILITY_NOTIFY_DURATIONS.FOREVER,
            now: NOW
        });

        expect(sevenDays.expiresAt).toBe(NOW + 7 * DAY);
        expect(thirtyDays.expiresAt).toBe(NOW + 30 * DAY);
        expect(forever.expiresAt).toBeNull();
    });

    test('normalizes invalid watches to safe defaults', () => {
        const watch = normalizeAvailabilityWatch({
            userId: 'usr_1',
            duration: 'bad-duration',
            triggers: {},
            completed: {}
        });

        expect(watch.duration).toBe(AVAILABILITY_NOTIFY_DURATIONS.ONCE);
        expect(watch.triggers[AVAILABILITY_NOTIFY_TRIGGERS.ACTIVE]).toBe(true);
        expect(watch.triggers[AVAILABILITY_NOTIFY_TRIGGERS.ONLINE]).toBe(true);
        expect(watch.completed[AVAILABILITY_NOTIFY_TRIGGERS.ACTIVE]).toBe(
            false
        );
        expect(watch.completed[AVAILABILITY_NOTIFY_TRIGGERS.ONLINE]).toBe(
            false
        );
    });

    test('detects expired fixed-duration watches', () => {
        const watch = createAvailabilityWatch({
            userId: 'usr_1',
            duration: AVAILABILITY_NOTIFY_DURATIONS.SEVEN_DAYS,
            now: NOW
        });

        expect(isAvailabilityWatchExpired(watch, NOW + 7 * DAY - 1)).toBe(
            false
        );
        expect(isAvailabilityWatchExpired(watch, NOW + 7 * DAY)).toBe(true);
    });

    test('removes expired watches without notifying', () => {
        const watch = createAvailabilityWatch({
            userId: 'usr_1',
            duration: AVAILABILITY_NOTIFY_DURATIONS.SEVEN_DAYS,
            now: NOW
        });

        const result = applyAvailabilityTransition(watch, {
            previousState: 'offline',
            newState: 'online',
            now: NOW + 7 * DAY
        });

        expect(result.notification).toBeNull();
        expect(result.watch).toBeNull();
        expect(result.changed).toBe(true);
        expect(result.removed).toBe(true);
    });

    test('one-shot active-only watch notifies once and completes', () => {
        const watch = createAvailabilityWatch({
            userId: 'usr_1',
            triggers: { active: true, online: false },
            now: NOW
        });

        const result = applyAvailabilityTransition(watch, {
            previousState: 'offline',
            newState: 'active',
            now: NOW + 1000
        });

        expect(result.notification).toMatchObject({
            trigger: AVAILABILITY_NOTIFY_TRIGGERS.ACTIVE,
            userId: 'usr_1'
        });
        expect(result.watch).toBeNull();
        expect(result.removed).toBe(true);
    });

    test('one-shot online-only watch ignores active and completes on online', () => {
        const watch = createAvailabilityWatch({
            userId: 'usr_1',
            triggers: { active: false, online: true },
            now: NOW
        });

        const activeResult = applyAvailabilityTransition(watch, {
            previousState: 'offline',
            newState: 'active',
            now: NOW + 1000
        });

        expect(activeResult.notification).toBeNull();
        expect(activeResult.watch).not.toBeNull();

        const onlineResult = applyAvailabilityTransition(activeResult.watch, {
            previousState: 'active',
            newState: 'online',
            now: NOW + 2000
        });

        expect(onlineResult.notification?.trigger).toBe(
            AVAILABILITY_NOTIFY_TRIGGERS.ONLINE
        );
        expect(onlineResult.watch).toBeNull();
    });

    test('one-shot active then online notifies once for each selected trigger', () => {
        const watch = createAvailabilityWatch({
            userId: 'usr_1',
            now: NOW
        });

        const activeResult = applyAvailabilityTransition(watch, {
            previousState: 'offline',
            newState: 'active',
            now: NOW + 1000
        });

        expect(activeResult.notification?.trigger).toBe(
            AVAILABILITY_NOTIFY_TRIGGERS.ACTIVE
        );
        expect(activeResult.watch?.completed.active).toBe(true);
        expect(activeResult.watch?.completed.online).toBe(false);

        const onlineResult = applyAvailabilityTransition(activeResult.watch, {
            previousState: 'active',
            newState: 'online',
            now: NOW + 2000
        });

        expect(onlineResult.notification?.trigger).toBe(
            AVAILABILITY_NOTIFY_TRIGGERS.ONLINE
        );
        expect(onlineResult.watch).toBeNull();
        expect(onlineResult.removed).toBe(true);
    });

    test('one-shot online first cancels pending active trigger', () => {
        const watch = createAvailabilityWatch({
            userId: 'usr_1',
            now: NOW
        });

        const result = applyAvailabilityTransition(watch, {
            previousState: 'offline',
            newState: 'online',
            now: NOW + 1000
        });

        expect(result.notification?.trigger).toBe(
            AVAILABILITY_NOTIFY_TRIGGERS.ONLINE
        );
        expect(result.watch).toBeNull();
        expect(result.removed).toBe(true);
    });

    test('fixed-duration watches stay armed after matching notifications', () => {
        const watch = createAvailabilityWatch({
            userId: 'usr_1',
            duration: AVAILABILITY_NOTIFY_DURATIONS.SEVEN_DAYS,
            now: NOW
        });

        const result = applyAvailabilityTransition(watch, {
            previousState: 'offline',
            newState: 'active',
            now: NOW + 1000
        });

        expect(result.notification?.trigger).toBe(
            AVAILABILITY_NOTIFY_TRIGGERS.ACTIVE
        );
        expect(result.watch).not.toBeNull();
        expect(result.removed).toBe(false);
        expect(result.watch.completed.active).toBe(false);
    });

    test('does not notify when the transition state is not selected or unchanged', () => {
        const watch = createAvailabilityWatch({
            userId: 'usr_1',
            triggers: { active: false, online: true },
            now: NOW
        });

        expect(
            applyAvailabilityTransition(watch, {
                previousState: 'offline',
                newState: 'active',
                now: NOW + 1000
            }).notification
        ).toBeNull();
        expect(
            applyAvailabilityTransition(watch, {
                previousState: 'online',
                newState: 'online',
                now: NOW + 1000
            }).notification
        ).toBeNull();
    });

    test('formats desktop and speech text for active and online notifications', () => {
        expect(formatAvailabilityNotificationText('Aki', 'active')).toEqual({
            title: 'Aki',
            body: 'is active',
            speech: 'Aki is active'
        });
        expect(formatAvailabilityNotificationText('Aki', 'online')).toEqual({
            title: 'Aki',
            body: 'is online',
            speech: 'Aki is online'
        });
    });
});
