import { parseLocation } from './location';
import { queryRequest } from '../../api';
import { convertFileUrlToImageUrl } from './common';

/**
 *
 * @param {object} ref
 * @param {string} permission
 * @returns {boolean}
 */
function hasGroupPermission(ref, permission) {
    if (
        ref &&
        ref.myMember &&
        ref.myMember.permissions &&
        (ref.myMember.permissions.includes('*') ||
            ref.myMember.permissions.includes(permission))
    ) {
        return true;
    }
    return false;
}

/**
 *
 * @param {object} group
 * @returns {boolean}
 */
function hasGroupModerationPermission(group) {
    return (
        hasGroupPermission(group, 'group-invites-manage') ||
        hasGroupPermission(group, 'group-moderates-manage') ||
        hasGroupPermission(group, 'group-audit-view') ||
        hasGroupPermission(group, 'group-bans-manage') ||
        hasGroupPermission(group, 'group-data-manage') ||
        hasGroupPermission(group, 'group-members-manage') ||
        hasGroupPermission(group, 'group-members-remove') ||
        hasGroupPermission(group, 'group-roles-assign') ||
        hasGroupPermission(group, 'group-roles-manage') ||
        hasGroupPermission(group, 'group-default-role-manage')
    );
}

/**
 *
 * @param {string} data
 * @returns {Promise<{name: string, iconUrl: string, bannerUrl: string}>}
 */
async function getGroupSummary(data) {
    if (!data) {
        return { name: '', iconUrl: '', bannerUrl: '' };
    }
    let groupId = data;
    if (!data.startsWith('grp_')) {
        const L = parseLocation(data);
        groupId = L.groupId;
        if (!L.groupId) {
            return { name: '', iconUrl: '', bannerUrl: '' };
        }
    }
    try {
        const args = await queryRequest.fetch('group.dialog', {
            groupId
        });
        const ref = args?.ref || {};
        return {
            name: ref.name || '',
            iconUrl: ref.iconUrl ? convertFileUrlToImageUrl(ref.iconUrl) : '',
            bannerUrl: ref.bannerUrl ? convertFileUrlToImageUrl(ref.bannerUrl) : ''
        };
    } catch (err) {
        console.error(err);
    }
    return { name: '', iconUrl: '', bannerUrl: '' };
}

/**
 *
 * @param {string} data
 * @returns {Promise<string>}
 */
async function getGroupName(data) {
    const summary = await getGroupSummary(data);
    return summary.name;
}

export {
    hasGroupPermission,
    hasGroupModerationPermission,
    getGroupName,
    getGroupSummary
};
