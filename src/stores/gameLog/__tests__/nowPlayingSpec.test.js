import { describe, expect, test, vi } from 'vitest';
import { createNowPlayingSpecHandler } from '../nowPlayingSpec';
function setup() {
    const nowPlaying = { value: { url: '' } };
    const publish = vi.fn(async (entry) => {
        nowPlaying.value = { ...entry, url: entry.videoUrl };
    });
    const clear = vi.fn(() => {
        nowPlaying.value = { url: '' };
    });
    const title = vi.fn();
    const handler = createNowPlayingSpecHandler({
        nowPlaying,
        setNowPlaying: publish,
        clearNowPlaying: clear,
        startNowPlayingTicker: vi.fn(),
        updateNowPlayingVideoName: title,
        addGameLogVideo: async (log) => publish({ videoUrl: log.videoUrl })
    });
    const event = async (data, seconds = 0) =>
        handler.handleNowPlayingEvent(
            {
                dt: new Date(
                    Date.UTC(2026, 9, 31, 0, 0, seconds)
                ).toISOString(),
                data: JSON.stringify(data)
            },
            'wrld_1:1'
        );
    return { nowPlaying, publish, clear, title, handler, event };
}
describe('structured ProTV/TechAnon media events', () => {
    test('pause, seek, speed and resume preserve media identity', async () => {
        const { event, nowPlaying, publish } = setup();
        await event({
            id: 'Main-1',
            type: 'mediaChange',
            mediaUrl: 'https://example.com/video',
            mediaName: 'Movie',
            mediaLength: 120,
            mediaSpeed: 2
        });
        await event({ id: 'Main-1', type: 'mediaPause', mediaTime: 24 }, 12);
        expect(nowPlaying.value).toMatchObject({
            paused: true,
            elapsed: 24,
            speed: 2,
            length: 120
        });
        await event({ id: 'Main-1', type: 'mediaSeek', mediaTime: 70 }, 20);
        expect(nowPlaying.value.elapsed).toBe(70);
        await event({ id: 'Main-1', type: 'mediaPlay', mediaTime: 70 }, 30);
        expect(nowPlaying.value).toMatchObject({ paused: false, elapsed: 70 });
        expect(publish).toHaveBeenCalledTimes(1);
    });
    test('priority selects a producer and stopping it restores the other player', async () => {
        const { event, nowPlaying, handler } = setup();
        await event({
            id: 'Main-1',
            type: 'mediaChange',
            mediaUrl: 'https://example.com/main',
            mediaName: 'Main'
        });
        await event(
            {
                id: 'Other-1',
                type: 'mediaChange',
                mediaUrl: 'https://example.com/priority',
                mediaName: 'Priority',
                highPriority: true
            },
            1
        );
        expect(nowPlaying.value.url).toBe('https://example.com/priority');
        await event(
            {
                id: 'Main-1',
                type: 'mediaChange',
                mediaUrl: 'https://example.com/new',
                mediaName: 'New'
            },
            2
        );
        expect(nowPlaying.value.url).toBe('https://example.com/priority');
        await event({ id: 'Other-1', type: 'mediaStop' }, 3);
        expect(nowPlaying.value.url).toBe('https://example.com/new');
        handler.resetNowPlayingProducers();
        expect(handler.hasNowPlayingProducer()).toBe(false);
    });
    test('hidden URLs are not passed into persisted media rows and late titles update the current row', async () => {
        const { event, publish, nowPlaying, title } = setup();
        await event({
            id: 'Hidden-1',
            type: 'mediaChange',
            mediaUrl: 'https://private.example/secret',
            mediaName: 'Private',
            hideUrl: true,
            mediaLength: 100
        });
        expect(publish.mock.calls[0][0]).toMatchObject({
            videoUrl: 'Private',
            urlHidden: true
        });
        expect(JSON.stringify(nowPlaying.value)).not.toContain(
            'private.example'
        );
        await event(
            { id: 'Hidden-1', type: 'mediaInfo', mediaName: 'Late title' },
            1
        );
        expect(title).toHaveBeenCalledWith('Late title');
    });
    test('malformed and unsupported events do not claim legacy-player ownership', async () => {
        const { handler, event, publish } = setup();
        await handler.handleNowPlayingEvent(
            { data: 'not json', dt: '2026-10-31' },
            'world'
        );
        await event({ id: 'Main', type: 'unknown' });
        expect(publish).not.toHaveBeenCalled();
        expect(handler.hasNowPlayingProducer()).toBe(false);
    });
});
