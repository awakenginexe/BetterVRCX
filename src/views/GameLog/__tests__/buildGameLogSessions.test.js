import { describe, expect, test } from 'vitest';

import { buildGameLogSessions } from '../sessions/buildGameLogSessions';

describe('buildGameLogSessions', () => {
    test('keeps events with their matching location session and newest session first', () => {
        const locationSegments = [
            {
                id: 'session-old',
                created_at: '2026-08-12T10:00:00.000Z',
                location: 'wrld_old:1',
                worldId: 'wrld_old',
                worldName: 'Old World'
            },
            {
                id: 'session-new',
                created_at: '2026-08-12T11:00:00.000Z',
                location: 'wrld_new:2',
                worldId: 'wrld_new',
                worldName: 'New World'
            }
        ];
        const events = [
            {
                type: 'VideoPlay',
                created_at: '2026-08-12T10:05:00.000Z',
                location: 'wrld_old:1',
                videoUrl: 'https://example.com/old'
            },
            {
                type: 'OnPlayerJoined',
                created_at: '2026-08-12T11:05:00.000Z',
                location: 'wrld_new:2',
                userId: 'usr_new',
                displayName: 'New Friend'
            }
        ];

        const result = buildGameLogSessions(locationSegments, events);

        expect(result.segments.map((segment) => segment.id)).toEqual([
            'session-new',
            'session-old'
        ]);
        expect(result.segments[0].events).toEqual([
            expect.objectContaining({
                type: 'OnPlayerJoined',
                userId: 'usr_new'
            })
        ]);
        expect(result.segments[1].events).toEqual([
            expect.objectContaining({
                type: 'VideoPlay',
                videoUrl: 'https://example.com/old',
                playCount: 1
            })
        ]);
    });
});
