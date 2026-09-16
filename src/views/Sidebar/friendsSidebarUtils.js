/**
 * @param {object} opts
 * @param {string} opts.key - Unique key
 * @param {string} opts.label - Display label
 * @param {number|null} [opts.count] - Item count
 * @param {boolean} [opts.expanded] - Whether section is expanded
 * @param {number|null} [opts.headerPadding] - Top padding in px
 * @param {number|null} [opts.paddingBottom] - Bottom padding in px
 * @param {Function|null} [opts.onClick] - Click handler
 * @returns {object} Row object
 */
export function buildToggleRow({
    key,
    label,
    count = null,
    expanded = true,
    headerPadding = null,
    paddingBottom = null,
    onClick = null
}) {
    return {
        type: 'toggle-header',
        key,
        label,
        count,
        expanded,
        headerPadding,
        paddingBottom,
        onClick
    };
}

/**
 * @param {object} friend - Friend data object
 * @param {string} key - Unique key
 * @param {object} [options] - Additional options
 * @param {boolean} [options.isGroupByInstance] - Whether grouped by instance
 * @param {number} [options.paddingBottom] - Bottom padding
 * @param {object} [options.itemStyle] - Additional style
 * @returns {object} Row object
 */
export function buildFriendRow(friend, key, options = {}) {
    return {
        type: 'friend-item',
        key,
        friend,
        isGroupByInstance: options.isGroupByInstance,
        paddingBottom: options.paddingBottom,
        itemStyle: options.itemStyle
    };
}

/**
 * @param {string} location - Instance location string
 * @param {number} count - Number of friends in instance
 * @param {string} key - Unique key
 * @returns {object} Row object
 */
export function buildInstanceHeaderRow(location, count, key) {
    return {
        type: 'instance-header',
        key,
        location,
        count,
        paddingBottom: 4
    };
}

/**
 * @param {string} location - Instance location string
 * @param {Array} friends - List of friends in instance
 * @param {string} key - Unique key
 * @returns {object} Row object
 */
export function buildInstanceGroupRow(location, friends, key) {
    return {
        type: 'instance-group',
        key,
        location,
        count: friends.length,
        friends,
        paddingBottom: 6
    };
}

/**
 * Combines session-only observations with the existing live instance groups.
 * Confirmed friends remain separate from remembered friends so callers can
 * preserve live counts, ordering, and controls.
 *
 * @param {object} options
 * @param {Map<string, object>} options.observations
 * @param {Map<string, object>} options.friendsById
 * @param {Array<Array<object>>} options.liveGroups
 * @param {Set<string>} options.locallyPresentIds
 * @returns {Array<{locationTag: string, confirmed: Array<object>, remembered: Array<object>, historicalOnly: boolean}>}
 */
export function buildLastKnownPresenceGroups({
    observations,
    friendsById,
    liveGroups,
    locallyPresentIds
}) {
    const groupsByTag = new Map();
    const liveIds = new Set();
    const confirmedByTag = new Map();
    const liveGroupOrder = new Map();

    for (const [index, liveGroup] of liveGroups.entries()) {
        const locationTag = liveGroup?.[0]?.ref?.$location?.tag;
        if (!locationTag) continue;
        const confirmed = liveGroup.map((friend) => {
            liveIds.add(friend.id);
            return friendsById.get(friend.id) ?? friend;
        });
        if (confirmed.length) {
            confirmedByTag.set(locationTag, confirmed);
            liveGroupOrder.set(locationTag, index);
        }
    }

    for (const observation of observations.values()) {
        if (!observation?.userId || !observation.locationTag) continue;
        if (locallyPresentIds.has(observation.userId)) continue;
        const friend = friendsById.get(observation.userId);
        if (!friend || liveIds.has(observation.userId)) continue;

        let group = groupsByTag.get(observation.locationTag);
        if (!group) {
            const confirmed = confirmedByTag.get(observation.locationTag) ?? [];
            group = {
                locationTag: observation.locationTag,
                confirmed,
                remembered: [],
                historicalOnly: confirmed.length === 0
            };
            groupsByTag.set(observation.locationTag, group);
        }
        group.remembered.push({ friend, observation });
    }

    return [...groupsByTag.values()]
        .filter((group) => group.confirmed.length || group.remembered.length)
        .sort((left, right) => {
            const leftIndex = liveGroupOrder.get(left.locationTag);
            const rightIndex = liveGroupOrder.get(right.locationTag);
            if (leftIndex === undefined && rightIndex === undefined) return 0;
            if (leftIndex === undefined) return 1;
            if (rightIndex === undefined) return -1;
            return leftIndex - rightIndex;
        });
}

/**
 * Estimate pixel height for a virtual row.
 * @param {object} row - Row object with type property
 * @returns {number} Estimated height in pixels
 */
export function estimateRowSize(row) {
    if (!row) {
        return 44;
    }
    if (row.type === 'toggle-header') {
        return 28 + (row.paddingBottom || 0);
    }
    if (row.type === 'vip-subheader') {
        return 24 + (row.paddingBottom || 0);
    }
    if (row.type === 'instance-header') {
        return 26 + (row.paddingBottom || 0);
    }
    if (row.type === 'instance-group') {
        return (
            34 +
            ((row.friends?.length || 1) + (row.remembered?.length || 0)) * 44 +
            (row.paddingBottom || 0)
        );
    }
    if (row.type === 'last-known-group') {
        return (
            52 +
            ((row.confirmed?.length || 0) + (row.remembered?.length || 0)) * 44
        );
    }
    return 52 + (row.paddingBottom || 0);
}
