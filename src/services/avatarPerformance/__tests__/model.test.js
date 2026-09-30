import { describe, expect, it } from 'vitest';
import {
    formatPerformanceStat,
    normalizeAnalysis,
    resolveAvatarPackages,
    resolveFileVersion
} from '../model';

const fileId = 'file_ce35d830-e20a-4df0-a6d4-5aaef4508044';
const pkg = (platform = 'standalonewindows', version = 42) => ({
    platform,
    assetVersion: 4,
    assetUrl: `https://api.vrchat.cloud/api/1/file/${fileId}/${version}/file`
});

describe('package resolution', () => {
    it.each(['standalonewindows', 'android'])(
        'resolves %s without using assetVersion as the file version',
        (platform) => {
            expect(
                resolveAvatarPackages({
                    id: 'avtr_one',
                    unityPackages: [pkg(platform)]
                })
            ).toEqual([
                {
                    avatarId: 'avtr_one',
                    platform,
                    fileId,
                    versionId: 42,
                    variant: 'security'
                }
            ]);
        }
    );
    it('resolves both platforms separately and excludes impostors', () => {
        expect(
            resolveAvatarPackages({
                unityPackages: [
                    pkg(),
                    pkg('android'),
                    { ...pkg('android'), variant: 'impostor' }
                ]
            }).map((p) => p.platform)
        ).toEqual(['standalonewindows', 'android']);
    });
    it('handles missing/null packages', () => {
        for (const avatar of [
            null,
            {},
            { unityPackages: null },
            { unityPackages: {} },
            { unityPackages: [null] }
        ])
            expect(resolveAvatarPackages(avatar)).toEqual([]);
    });
    it('prefers structured file/version fields', () => {
        expect(
            resolveFileVersion({ fileId, versionId: 65, assetUrl: 'invalid' })
        ).toEqual({ fileId, versionId: 65 });
    });
    it.each([
        'invalid',
        'https://external.test/api/1/file/file_bad/42/file',
        `https://api.vrchat.cloud/api/1/file/${fileId}/0/file`,
        `https://api.vrchat.cloud/api/1/file/${fileId}/42oops/file`,
        `https://api.vrchat.cloud/api/1/file/file_bad/42/file`,
        `http://api.vrchat.cloud/api/1/file/${fileId}/42/file`
    ])('rejects malformed/foreign URL %s', (assetUrl) => {
        expect(resolveFileVersion({ assetUrl })).toBeNull();
    });
    it('does not fall back to an older upload when the newest URL is inaccessible', () => {
        const packages = resolveAvatarPackages({
            unityPackages: [
                { ...pkg(), created_at: '2026-09-01' },
                {
                    platform: 'standalonewindows',
                    assetUrl: null,
                    created_at: '2026-10-01'
                }
            ]
        });
        expect(packages).toHaveLength(1);
        expect(packages[0].fileId).toBeUndefined();
    });
});
describe('analysis normalization and formatting', () => {
    it('preserves exact server rating and missing optional fields, including zero/false', () => {
        expect(
            normalizeAnalysis({
                success: true,
                performanceRating: 'VeryPoor',
                avatarStats: {
                    totalPolygons: 0,
                    particleCollisionEnabled: false,
                    boneCount: null,
                    meshCount: -1,
                    animatorCount: '4'
                }
            })
        ).toMatchObject({
            status: 'available',
            rating: 'VeryPoor',
            stats: { totalPolygons: 0, particleCollisionEnabled: false }
        });
    });
    it('accepts rating-only and stats-only older analysis without inventing ratings', () => {
        expect(normalizeAnalysis({ performanceRating: 'Good' }).stats).toEqual(
            {}
        );
        expect(
            normalizeAnalysis({ avatarStats: { meshCount: 1 } }).rating
        ).toBeNull();
    });
    it.each([null, {}, { success: false }, { avatarStats: null }])(
        'handles unusable analysis %j',
        (data) => {
            expect(normalizeAnalysis(data)).toEqual({ status: 'unavailable' });
        }
    );
    it('keeps texture usage raw and explicitly labels the unit uncertainty', () => {
        const t = (key, args) =>
            args ? `${args.value} (unit unverified)` : key;
        expect(
            formatPerformanceStat('totalTextureUsage', 1048576, 'en-US', t)
        ).toBe('1,048,576 (unit unverified)');
        expect(formatPerformanceStat('meshCount', 1234, 'en-US', t)).toBe(
            '1,234'
        );
        expect(
            formatPerformanceStat('writeDefaultsUsed', false, 'en-US', t)
        ).toContain('.no');
    });
});
