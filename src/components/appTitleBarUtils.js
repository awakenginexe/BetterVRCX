export const VERSION_STATUS = Object.freeze({
    LATEST: 'latest',
    OUTDATED: 'outdated',
    OFFLINE: 'offline'
});

const SEMVER_PATTERN = /v?(\d+)\.(\d+)\.(\d+)/i;
const DATE_PATTERN = /(\d{4})\.(\d{2})\.(\d{2})/;
const BUILD_PATTERN = /\bB\s+([^\s]+)/i;

/**
 * @param {string} value
 * @returns {{ version: string, build: string }}
 */
export function parseAppVersion(value) {
    const text = String(value || '').trim();
    const versionMatch = text.match(SEMVER_PATTERN);
    const buildMatch = text.match(BUILD_PATTERN);

    return {
        version: versionMatch
            ? `v${versionMatch[1]}.${versionMatch[2]}.${versionMatch[3]}`
            : '—',
        build: buildMatch ? `B ${buildMatch[1]}` : ''
    };
}

/**
 * @param {string} value
 * @returns {{ kind: 'semver' | 'date', parts: number[] } | null}
 */
function parseComparableVersion(value) {
    const text = String(value || '');
    const semverMatch = text.match(SEMVER_PATTERN);
    if (semverMatch) {
        return {
            kind: 'semver',
            parts: semverMatch.slice(1).map(Number)
        };
    }

    const dateMatch = text.match(DATE_PATTERN);
    if (dateMatch) {
        return {
            kind: 'date',
            parts: dateMatch.slice(1).map(Number)
        };
    }

    return null;
}

/**
 * @param {string} left
 * @param {string} right
 * @returns {number | null}
 */
function compareVersions(left, right) {
    const leftVersion = parseComparableVersion(left);
    const rightVersion = parseComparableVersion(right);
    if (
        !leftVersion ||
        !rightVersion ||
        leftVersion.kind !== rightVersion.kind
    ) {
        return null;
    }

    for (let index = 0; index < leftVersion.parts.length; index += 1) {
        if (leftVersion.parts[index] !== rightVersion.parts[index]) {
            return leftVersion.parts[index] > rightVersion.parts[index]
                ? 1
                : -1;
        }
    }

    return 0;
}

/**
 * @param {string} currentVersion
 * @param {string} latestVersion
 * @param {boolean} checkingForUpdate
 * @returns {'latest' | 'outdated' | 'offline'}
 */
export function getVersionStatus(
    currentVersion,
    latestVersion,
    checkingForUpdate = false
) {
    if (checkingForUpdate || !currentVersion || !latestVersion) {
        return VERSION_STATUS.OFFLINE;
    }

    const comparison = compareVersions(latestVersion, currentVersion);
    if (comparison === null) {
        return VERSION_STATUS.OFFLINE;
    }

    return comparison > 0 ? VERSION_STATUS.OUTDATED : VERSION_STATUS.LATEST;
}
