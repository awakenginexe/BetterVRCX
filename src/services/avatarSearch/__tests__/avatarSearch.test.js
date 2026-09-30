import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAvatarSearchService } from '../avatarSearchService';
import { normalizeAvatarResult } from '../normalizeAvatarResult';
import { MetadataCache } from '../metadataCache';

const record = (id = 'avtr_one', name = 'One') => ({ id, name });
const ok = (data) => ({ status: 200, data: JSON.stringify(data) });

describe('avatar database normalization', () => {
    it('preserves nested AvtrDB performance and impostor availability', () => {
        const ref = normalizeAvatarResult(
            {
                ...record(),
                performance: {
                    pc_rating: 'VeryPoor',
                    android_rating: 'Good',
                    ios_rating: null,
                    has_impostor: true
                }
            },
            'avtrdb'
        );
        expect(ref.$searchMetadata.sourceData.avtrdb).toMatchObject({
            performance: { pc: 'VeryPoor', android: 'Good' },
            hasImposters: true
        });
    });
    it('accepts VRCX casing without copying package fields into canonical data', () => {
        const ref = normalizeAvatarResult(
            {
                Id: 'avtr_one',
                Name: 'One',
                AuthorId: 'usr_one',
                unityPackages: [{ platform: 'android' }]
            },
            'avtrdb'
        );
        expect(ref).toMatchObject({
            id: 'avtr_one',
            name: 'One',
            authorId: 'usr_one'
        });
        expect(ref.unityPackages).toBeUndefined();
        expect(ref.$searchMetadata.sources).toEqual(['avtrdb']);
    });
    it('handles optional ICU fields and preserves reported packages separately', () => {
        const ref = normalizeAvatarResult(
            {
                ...record(),
                tags: null,
                performanceRating: { standalonewindows: 'Good' },
                platforms: ['standalonewindows'],
                hasImposters: true
            },
            'avtricu'
        );
        expect(ref.tags).toEqual([]);
        expect(ref.$searchMetadata.sourceData.avtricu.performance).toEqual({
            pc: 'Good'
        });
        expect(ref.$searchMetadata.sourceData.avtricu.hasImposters).toBe(true);
    });
    it('normalizes VRCNDb author and thumbnail and retains discovery facts', () => {
        const ref = normalizeAvatarResult(
            {
                ...record(),
                author_id: 'usr_one',
                author_name: 'Author',
                thumbnail: '/thumbs/one.webp',
                performance: { pc: 'VeryPoor' },
                impostor: ['quest'],
                first_seen: 1790490146,
                likes: 2,
                liked: false,
                styles: { primary: 'Anime' }
            },
            'vrcndb'
        );
        expect(ref).toMatchObject({
            authorId: 'usr_one',
            authorName: 'Author',
            thumbnailImageUrl: 'https://db.vrcnext.com/thumbs/one.webp'
        });
        expect(ref.$searchMetadata.sourceData.vrcndb).toMatchObject({
            performance: { pc: 'VeryPoor' },
            impostor: ['android'],
            likes: 2,
            liked: false,
            first_seen: 1790490146
        });
    });
    it.each([null, {}, { id: '' }, { id: 'usr_wrong' }, { id: 12 }])(
        'rejects unusable records %s',
        (input) => {
            expect(normalizeAvatarResult(input, 'avtrdb')).toBeNull();
        }
    );
});

describe('avatar search strategies', () => {
    let execute, service;
    beforeEach(() => {
        execute = vi.fn();
        service = createAvatarSearchService({ execute, log: vi.fn() });
    });
    it('stops after usable AvtrDB results', async () => {
        execute.mockResolvedValue(ok([record()]));
        const result = await service.search('Rurune');
        expect(result.avatars.size).toBe(1);
        expect(result.state.attemptedProviders).toEqual(['avtrdb']);
        expect(execute).toHaveBeenCalledTimes(1);
    });
    it('identifies BetterVRCX with version and project contact for ICU', async () => {
        execute.mockResolvedValue(ok([record()]));
        await service.search('Rurune', {
            sources: ['avtricu'],
            contactEmail: 'support@example.invalid'
        });
        expect(execute.mock.calls[0][0].headers['User-Agent']).toBe(
            'BetterVRCX/4.1.0 support@example.invalid'
        );
        expect(execute.mock.calls[0][0].headers['VRCX-ID']).toBeUndefined();
    });
    it('never substitutes upstream or private contact information when none is configured', async () => {
        execute.mockResolvedValue(ok([record()]));
        await service.search('Rurune', { sources: ['avtricu'] });
        const agent = execute.mock.calls[0][0].headers['User-Agent'];
        expect(agent).toContain('BetterVRCX/4.1.0');
        expect(agent).toContain(
            'https://github.com/awakenginexe/BetterVRCX/issues'
        );
        expect(agent).not.toContain('@');
    });
    it('does not commit metadata from a discarded search', async () => {
        let resolve;
        let current = true;
        execute.mockImplementationOnce(
            () =>
                new Promise((r) => {
                    resolve = r;
                })
        );
        execute.mockResolvedValueOnce(
            ok({ results: [{ ...record(), likes: 8 }] })
        );
        const old = service.search('Rur', {
            sources: ['vrcndb'],
            isCurrent: () => current
        });
        current = false;
        await service.search('Rurune', { sources: ['vrcndb'] });
        resolve(ok({ results: [{ ...record(), likes: 1 }] }));
        await old;
        expect(service.metadata.get('avtr_one').sourceData.vrcndb.likes).toBe(
            8
        );
    });
    it('does not commit a cache hit rejected by its caller', async () => {
        execute.mockResolvedValue(ok([record()]));
        await service.search('Rurune');
        service.metadata.clear();
        await service.search('Rurune', { isCurrent: () => false });
        expect(service.metadata.get('avtr_one')).toBeNull();
        expect(execute).toHaveBeenCalledTimes(1);
    });
    it.each(['empty', 'error', 'malformed', 'schema', 'unusable', 'http'])(
        'falls back from AvtrDB %s to ICU',
        async (failure) => {
            if (failure === 'error')
                execute.mockRejectedValueOnce(new Error('offline'));
            else
                execute.mockResolvedValueOnce(
                    failure === 'empty'
                        ? ok([])
                        : failure === 'malformed'
                          ? { status: 200, data: '{' }
                          : failure === 'schema'
                            ? ok({ unexpected: [] })
                            : failure === 'http'
                              ? { status: 429, data: '{}' }
                              : ok([{ id: '' }])
                );
            execute.mockResolvedValueOnce(ok([record()]));
            const result = await service.search('Rurune');
            expect(result.state.attemptedProviders).toEqual([
                'avtrdb',
                'avtricu'
            ]);
            expect(result.state.resultSources).toEqual(['avtricu']);
        }
    );
    it.each(['empty', 'error'])(
        'continues from ICU %s to unsigned VRCNDb',
        async (failure) => {
            execute.mockResolvedValueOnce(ok([]));
            if (failure === 'error')
                execute.mockRejectedValueOnce(new Error('offline'));
            else execute.mockResolvedValueOnce(ok([]));
            execute.mockResolvedValueOnce(
                ok({ page: 1, total: 87, has_more: true, results: [record()] })
            );
            const result = await service.search('Rurune', { limit: 5 });
            expect(result.state.resultSources).toEqual(['vrcndb']);
            expect(result.state.pagination.vrcndb).toMatchObject({
                total: 87,
                has_more: true
            });
            expect(execute.mock.calls[2][0]).toMatchObject({
                url: 'https://db.vrcnext.com/api/search.php?q=Rurune&limit=5&page=1',
                headers: {}
            });
        }
    );
    it('returns an empty Map and failures when every request fails', async () => {
        execute.mockRejectedValue(new Error('offline'));
        const result = await service.search('Rurune');
        expect(result.avatars.size).toBe(0);
        expect(result.state.failedProviders).toEqual([
            'avtrdb',
            'avtricu',
            'vrcndb'
        ]);
    });
    it('deep search merges duplicates, keeps first nonempty fields and all sources', async () => {
        execute
            .mockResolvedValueOnce(ok([record()]))
            .mockResolvedValueOnce(
                ok([
                    {
                        ...record('avtr_one', 'Conflicting'),
                        authorName: 'Author'
                    },
                    record('avtr_two')
                ])
            )
            .mockResolvedValueOnce(
                ok({ results: [{ ...record(), likes: 5 }] })
            );
        const result = await service.search('Rurune', { mode: 'deep' });
        expect(execute).toHaveBeenCalledTimes(3);
        expect(result.avatars.size).toBe(2);
        expect(result.avatars.get('avtr_one')).toMatchObject({
            name: 'One',
            authorName: 'Author',
            $searchMetadata: {
                sources: ['avtrdb', 'avtricu', 'vrcndb'],
                sourceData: { vrcndb: { likes: 5 } }
            }
        });
        expect(service.metadata.get('avtr_one').sources).toHaveLength(3);
    });
    it('deep search retains other results after one rejection', async () => {
        execute
            .mockRejectedValueOnce(new Error('offline'))
            .mockResolvedValueOnce(ok([record()]))
            .mockResolvedValueOnce(ok({ results: [] }));
        expect(
            (await service.search('Rurune', { mode: 'deep' })).avatars.size
        ).toBe(1);
    });
    it('supports a separately selected custom VRCX endpoint and precise IDs', async () => {
        execute.mockResolvedValue(ok([record()]));
        await service.search('usr_one', {
            mode: 'custom',
            customUrl: 'https://custom.test/search?existing=1',
            vrcxId: 'client'
        });
        const request = execute.mock.calls[0][0];
        expect(request.url).toContain('existing=1&authorId=usr_one');
        expect(request.headers['VRCX-ID']).toBe('client');
        expect(service.metadata.get('avtr_one').sources).toEqual(['custom']);
    });
    it('deduplicates repeated searches and caches successful responses', async () => {
        execute.mockResolvedValue(ok([record()]));
        await Promise.all([service.search('Rurune'), service.search('Rurune')]);
        await service.search('Rurune');
        expect(execute).toHaveBeenCalledTimes(1);
    });
    it('does not cache a complete failure', async () => {
        execute.mockRejectedValue(new Error('offline'));
        await service.search('Rurune');
        execute.mockResolvedValue(ok([record()]));
        expect((await service.search('Rurune')).avatars.size).toBe(1);
    });
    it('times out a stalled request and continues', async () => {
        vi.useFakeTimers();
        try {
            execute
                .mockImplementationOnce(() => new Promise(() => {}))
                .mockResolvedValueOnce(ok([record()]));
            const pending = service.search('Rurune', { timeoutMs: 50 });
            await vi.advanceTimersByTimeAsync(51);
            expect((await pending).state.resultSources).toEqual(['avtricu']);
        } finally {
            vi.useRealTimers();
        }
    });
    it('honors disabled built-ins', async () => {
        execute.mockResolvedValue(ok({ results: [record()] }));
        expect(
            (await service.search('Rurune', { sources: ['vrcndb'] })).state
                .attemptedProviders
        ).toEqual(['vrcndb']);
    });
    it('starts every deep-search request before waiting on any provider', async () => {
        const resolvers = [];
        execute.mockImplementation(
            () => new Promise((resolve) => resolvers.push(resolve))
        );
        const pending = service.search('Rurune', { mode: 'deep' });
        expect(resolvers).toHaveLength(3);
        resolvers[0](ok([]));
        resolvers[1](ok([record()]));
        resolvers[2](ok({ results: [] }));
        expect((await pending).avatars.size).toBe(1);
    });
    it('can isolate a disabled stale caller while another subscriber accepts the same query', async () => {
        let resolve;
        execute.mockImplementation(
            () =>
                new Promise((r) => {
                    resolve = r;
                })
        );
        const stale = service.search('Rurune', { isCurrent: () => false });
        const accepted = service.search('Rurune', { isCurrent: () => true });
        resolve(ok([record()]));
        await Promise.all([stale, accepted]);
        expect(execute).toHaveBeenCalledTimes(1);
        expect(service.metadata.get('avtr_one').sources).toEqual(['avtrdb']);
    });
    it('clearing session state prevents a late request from repopulating metadata', async () => {
        let resolve;
        execute.mockImplementation(
            () =>
                new Promise((r) => {
                    resolve = r;
                })
        );
        const pending = service.search('Rurune');
        service.clear();
        resolve(ok([record()]));
        await pending;
        expect(service.metadata.get('avtr_one')).toBeNull();
    });
    it('supports native remote page and offset parameters without changing local pagination', async () => {
        execute
            .mockResolvedValueOnce(ok([]))
            .mockResolvedValueOnce(ok({ results: [] }));
        await service.search('Rurune', {
            sources: ['avtricu'],
            limit: 20,
            offset: 20
        });
        await service.search('Rurune', {
            sources: ['vrcndb'],
            limit: 20,
            page: 2
        });
        expect(execute.mock.calls[0][0].url).toContain('limit=20&offset=20');
        expect(execute.mock.calls[1][0].url).toContain('limit=20&page=2');
    });
});

describe('external metadata cache lifecycle', () => {
    it('merges provenance, expires and caps entries without changing official fields', () => {
        let now = 0;
        const cache = new MetadataCache({
            ttl: 100,
            maxSize: 2,
            now: () => now
        });
        cache.set(
            'avtr_one',
            normalizeAvatarResult(record(), 'avtrdb').$searchMetadata
        );
        cache.set(
            'avtr_one',
            normalizeAvatarResult(record(), 'vrcndb').$searchMetadata
        );
        expect(cache.get('avtr_one').sources).toEqual(['avtrdb', 'vrcndb']);
        cache.set('avtr_two', {});
        cache.set('avtr_three', {});
        expect(cache.get('avtr_one')).toBeNull();
        now = 101;
        expect(cache.get('avtr_three')).toBeNull();
        cache.clear();
        expect(cache.size).toBe(0);
    });
});
