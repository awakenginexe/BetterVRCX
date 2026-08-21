import { describe, expect, test } from 'vitest';

import {
    getVersionStatus,
    parseAppVersion,
    VERSION_STATUS
} from '../appTitleBarUtils';

describe('appTitleBarUtils', () => {
    test('extracts the release version and build tag', () => {
        expect(parseAppVersion('BetterVRCX v3.2.0 B 2026.08.19')).toEqual({
            version: '3.2.0',
            build: '2026.08.19'
        });
    });

    test('shows the 3.2.3 release date without the build marker', () => {
        expect(parseAppVersion('BetterVRCX v3.2.3 B 2026.08.22')).toEqual({
            version: '3.2.3',
            build: '2026.08.22'
        });
    });

    test('marks a matching checked release as latest', () => {
        expect(
            getVersionStatus(
                'BetterVRCX v3.2.0 B 2026.08.19',
                'BetterVRCX v3.2.0'
            )
        ).toBe(VERSION_STATUS.LATEST);
    });

    test('marks a current release behind the checked release as outdated', () => {
        expect(
            getVersionStatus(
                'BetterVRCX v3.1.1 B 2026.08.17',
                'BetterVRCX v3.2.0'
            )
        ).toBe(VERSION_STATUS.OUTDATED);
    });

    test('uses the offline status before a latest release is known', () => {
        expect(getVersionStatus('BetterVRCX v3.2.0 B 2026.08.19', '')).toBe(
            VERSION_STATUS.OFFLINE
        );
    });
});
