import { describe, it, expect } from 'vitest';
import {
    favoriteWorldEntries,
    updateFavoriteMarkers,
    worldCard
} from '../model';
describe('World Hub data', () => {
    it('reuses remote and local favorites without duplicates', () => {
        expect(
            favoriteWorldEntries([{ ref: { id: 'wrld_a', name: 'A' } }], {
                local: [{ id: 'wrld_a' }, { id: 'wrld_b' }]
            }).map((w) => w.id)
        ).toEqual(['wrld_a', 'wrld_b']);
    });
    it('seeds baseline without updates, detects later changes and ignores absent metadata', () => {
        const markers = {};
        updateFavoriteMarkers(markers, [
            { id: 'wrld_a', version: 1, updated_at: '2026-01-01' }
        ]);
        expect(markers.wrld_a.updated).toBe(false);
        updateFavoriteMarkers(markers, [
            { id: 'wrld_a', version: 2, updated_at: '2026-01-02' }
        ]);
        expect(markers.wrld_a.updated).toBe(true);
        updateFavoriteMarkers(markers, [{ id: 'wrld_a' }]);
        expect(markers.wrld_a.version).toBe(2);
    });
    it('adding metadata alone does not fabricate an update', () => {
        const markers = {};
        updateFavoriteMarkers(markers, [{ id: 'wrld_a', version: 1 }]);
        updateFavoriteMarkers(markers, [
            { id: 'wrld_a', version: 1, updated_at: '2026-01-01' }
        ]);
        expect(markers.wrld_a.updated).toBe(false);
    });
    it('cards tolerate missing metadata and preserve history', () => {
        expect(
            worldCard(
                {
                    worldId: 'wrld_a',
                    worldName: 'Private visit',
                    visitCount: 3,
                    totalTime: 500
                },
                new Map()
            )
        ).toMatchObject({
            id: 'wrld_a',
            name: 'Private visit',
            visitCount: 3,
            totalTime: 500
        });
    });
});

it('older cache metadata cannot lower the established baseline', () => {
    const markers = {};
    updateFavoriteMarkers(markers, [
        { id: 'wrld_a', version: 3, updated_at: '2026-03-01' }
    ]);
    updateFavoriteMarkers(markers, [
        { id: 'wrld_a', version: 2, updated_at: '2026-02-01' }
    ]);
    updateFavoriteMarkers(markers, [
        { id: 'wrld_a', version: 3, updated_at: '2026-03-01' }
    ]);
    expect(markers.wrld_a.updated).toBe(false);
});

it('does not use default world placeholder version zero as an update baseline', () => {
    const markers = {};
    updateFavoriteMarkers(markers, [
        { id: 'wrld_a', version: 0, updated_at: '' }
    ]);
    updateFavoriteMarkers(markers, [
        { id: 'wrld_a', version: 2, updated_at: '2026-03-01' }
    ]);
    expect(markers.wrld_a.updated).toBe(false);
});
