import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Session 5 Live-Data Performance Firewall', () => {
    const session5Files = [
        'src/views/Feed/Feed.vue',
        'src/views/Feed/columns.jsx',
        'src/views/FriendLog/FriendLog.vue',
        'src/views/FriendLog/columns.jsx',
        'src/views/GameLog/GameLog.vue',
        'src/views/GameLog/columns.jsx',
        'src/views/GameLog/components/GameLogSessions.vue',
        'src/views/GameLog/components/GameLogSessionsSegment.vue',
        'src/views/GameLog/components/GameLogSessionsEvent.vue',
        'src/views/Moderation/Moderation.vue',
        'src/views/Moderation/columns.jsx',
        'src/views/PlayerList/PlayerList.vue',
        'src/views/PlayerList/columns.jsx',
        'src/views/PlayerList/components/PhotonEventTable.vue',
        'src/views/PlayerList/components/photonEventColumns.jsx'
    ];

    test('no TransitionGroup used in Session 5 live collection surfaces', () => {
        for (const file of session5Files) {
            const content = readFileSync(resolve(process.cwd(), file), 'utf8');
            expect(content).not.toContain('<TransitionGroup');
            expect(content).not.toContain('TransitionGroup');
        }
    });

    test('no transition-all utility used in Session 5 components', () => {
        for (const file of session5Files) {
            const content = readFileSync(resolve(process.cwd(), file), 'utf8');
            expect(content).not.toContain('transition-all');
        }
    });

    test('no backdrop-blur used on high-volume session rows or segment headers', () => {
        const segmentContent = readFileSync(
            resolve(
                process.cwd(),
                'src/views/GameLog/components/GameLogSessionsSegment.vue'
            ),
            'utf8'
        );
        expect(segmentContent).not.toContain('backdrop-blur');
    });

    test('event type badges in logs use semantic data-tone attribute', () => {
        const feedColumns = readFileSync(
            resolve(process.cwd(), 'src/views/Feed/columns.jsx'),
            'utf8'
        );
        const friendLogColumns = readFileSync(
            resolve(process.cwd(), 'src/views/FriendLog/columns.jsx'),
            'utf8'
        );
        const gameLogColumns = readFileSync(
            resolve(process.cwd(), 'src/views/GameLog/columns.jsx'),
            'utf8'
        );
        const moderationColumns = readFileSync(
            resolve(process.cwd(), 'src/views/Moderation/columns.jsx'),
            'utf8'
        );

        expect(feedColumns).toContain('FEED_TYPE_TONES');
        expect(feedColumns).toContain('data-tone={tone}');
        expect(friendLogColumns).toContain('FRIEND_LOG_TYPE_TONES');
        expect(friendLogColumns).toContain('data-tone={tone}');
        expect(gameLogColumns).toContain('GAME_LOG_TYPE_TONES');
        expect(gameLogColumns).toContain('data-tone={tone}');
        expect(moderationColumns).toContain('MODERATION_TYPE_TONES');
        expect(moderationColumns).toContain('data-tone={tone}');
    });

    test('destructive delete actions use semantic destructive tokens rather than status-busy presence', () => {
        const friendLogColumns = readFileSync(
            resolve(process.cwd(), 'src/views/FriendLog/columns.jsx'),
            'utf8'
        );
        const gameLogColumns = readFileSync(
            resolve(process.cwd(), 'src/views/GameLog/columns.jsx'),
            'utf8'
        );
        const moderationColumns = readFileSync(
            resolve(process.cwd(), 'src/views/Moderation/columns.jsx'),
            'utf8'
        );

        expect(friendLogColumns).toContain('text-destructive');
        expect(friendLogColumns).not.toContain('text-red-600');
        expect(gameLogColumns).toContain('text-destructive');
        expect(gameLogColumns).not.toContain('text-red-600');
        expect(moderationColumns).toContain('text-destructive');
        expect(moderationColumns).not.toContain('text-red-600');
    });
});
