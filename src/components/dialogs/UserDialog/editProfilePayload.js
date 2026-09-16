/**
 * Preserve the VRChat profile update contract while the profile response uses iconUrl.
 * @param {string} iconUrl
 * @param {{ iconUrl?: string }} selfProfileRef
 * @returns {{ userIcon?: string }}
 */
export function getProfileIconUpdate(iconUrl, selfProfileRef) {
    if (iconUrl === selfProfileRef?.iconUrl) {
        return {};
    }
    return { userIcon: iconUrl };
}
