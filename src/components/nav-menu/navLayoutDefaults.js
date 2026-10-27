import { DASHBOARD_NAV_KEY_PREFIX } from '../../shared/constants';

function avatarFolder(t) {
    return {
        type: 'folder',
        id: 'default-folder-avatars',
        nameKey: 'nav_tooltip.avatars',
        name: t('nav_tooltip.avatars'),
        icon: 'ri-contacts-book-3-line',
        items: ['my-avatars', 'found-avatars']
    };
}

export function migrateAvatarNav(layout, hiddenKeys, t) {
    const hasFound = layout.some(
        (item) =>
            item?.key === 'found-avatars' ||
            (Array.isArray(item?.items) && item.items.includes('found-avatars'))
    );
    if (hasFound || hiddenKeys.includes('found-avatars'))
        return { layout, hiddenKeys };
    if (hiddenKeys.includes('my-avatars'))
        return { layout, hiddenKeys: [...hiddenKeys, 'found-avatars'] };
    let inserted = false;
    const migrated = layout.map((item) => {
        if (item?.type === 'item' && item.key === 'my-avatars') {
            inserted = true;
            return avatarFolder(t);
        }
        if (
            item?.type === 'folder' &&
            Array.isArray(item.items) &&
            item.items.includes('my-avatars')
        ) {
            inserted = true;
            const items = [...item.items];
            items.splice(items.indexOf('my-avatars') + 1, 0, 'found-avatars');
            return { ...item, items };
        }
        return item;
    });
    if (!inserted) migrated.push(avatarFolder(t));
    return { layout: migrated, hiddenKeys };
}

export function createBaseDefaultNavLayout(t) {
    return [
        { type: 'item', key: 'feed' },
        { type: 'item', key: 'friends-locations' },
        { type: 'item', key: 'game-log' },
        { type: 'item', key: 'player-list' },
        { type: 'item', key: 'search' },
        {
            type: 'folder',
            id: 'default-folder-favorites',
            nameKey: 'nav_tooltip.favorites',
            name: t('nav_tooltip.favorites'),
            icon: 'ri-star-line',
            items: ['favorite-friends', 'favorite-worlds', 'favorite-avatars']
        },
        {
            type: 'folder',
            id: 'default-folder-social',
            nameKey: 'nav_tooltip.social',
            name: t('nav_tooltip.social'),
            icon: 'ri-group-line',
            items: ['friend-log', 'friend-list', 'moderation']
        },
        {
            type: 'folder',
            id: 'default-folder-world',
            nameKey: 'nav_tooltip.world',
            name: t('nav_tooltip.world'),
            icon: 'ri-earth-line',
            items: ['world-recent', 'world-updated', 'world-library']
        },
        { type: 'item', key: 'notification' },
        avatarFolder(t),
        {
            type: 'folder',
            id: 'default-folder-charts',
            nameKey: 'nav_tooltip.charts',
            name: t('nav_tooltip.charts'),
            icon: 'ri-pie-chart-line',
            items: ['charts-instance', 'charts-mutual', 'charts-hot-worlds']
        },
        { type: 'item', key: 'tools' },
        { type: 'item', key: 'direct-access' }
    ];
}

export function insertDashboardEntries(layout, dashboardDefinitions) {
    const nextLayout = Array.isArray(layout) ? [...layout] : [];
    const dashboardEntries = (dashboardDefinitions || []).map((def) => ({
        type: 'item',
        key: def.key
    }));

    if (!dashboardEntries.length) {
        return nextLayout;
    }

    const directAccessIdx = nextLayout.findIndex(
        (entry) => entry.type === 'item' && entry.key === 'direct-access'
    );

    if (directAccessIdx !== -1) {
        nextLayout.splice(directAccessIdx, 0, ...dashboardEntries);
    } else {
        nextLayout.push(...dashboardEntries);
    }

    return nextLayout;
}

export function isDashboardNavKey(key) {
    return String(key || '').startsWith(DASHBOARD_NAV_KEY_PREFIX);
}
