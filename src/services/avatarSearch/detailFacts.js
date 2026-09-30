const labels = { pc: 'PC', android: 'Android / Quest', ios: 'iOS' };
const meaningfulRating = (value) =>
    value && !['None', 'Unknown', ''].includes(value);
const ratingLabel = (value) => value.replace(/([a-z])([A-Z])/g, '$1 $2');

/** Only facts missing from official data are offered as platform/style supplements. */
export function getAvatarDatabaseFacts(avatar, metadata) {
    const packages = Array.isArray(avatar.unityPackages)
        ? avatar.unityPackages
        : [];
    const platformKey = (p) => (p === 'standalonewindows' ? 'pc' : p);
    const officialRatings = {};
    for (const p of packages) {
        if (p.variant !== 'impostor' && meaningfulRating(p.performanceRating))
            officialRatings[platformKey(p.platform)] = p.performanceRating;
    }
    const officialStyles = avatar.styles?.primary || avatar.styles?.secondary;
    const officialImpostors = new Set(
        packages
            .filter((p) => p.variant === 'impostor')
            .map((p) => platformKey(p.platform))
    );
    const facts = [];
    for (const source of metadata?.sources || []) {
        const data = metadata.sourceData?.[source];
        if (!data) continue;
        const add = (key, value, date = false) =>
            facts.push({ key, value, source, date });
        if (!packages.length && data.platforms?.length)
            add(
                'platforms',
                data.platforms.map((p) => labels[p] || p).join(' · ')
            );
        for (const [p, value] of Object.entries(data.performance || {})) {
            if (!officialRatings[p] && meaningfulRating(value))
                add('performance', `${labels[p] || p}: ${ratingLabel(value)}`);
        }
        const extraImpostors = (data.impostor || []).filter(
            (p) => !officialImpostors.has(p)
        );
        if (extraImpostors.length)
            add(
                'impostor',
                extraImpostors.map((p) => labels[p] || p).join(' · ')
            );
        else if (
            !officialImpostors.size &&
            data.hasImposters &&
            !data.impostor?.length
        )
            add('impostor', 'Available');
        if (!officialStyles && (data.styles?.primary || data.styles?.secondary))
            add(
                'styles',
                [data.styles.primary, data.styles.secondary]
                    .filter(Boolean)
                    .join(' · ')
            );
        for (const key of ['likes', 'wear', 'pop', 'trend_rank'])
            if (data[key] > 0) add(key, String(data[key]));
        if (data.featured === true) add('featured', 'Yes');
        if (data.first_seen > 0) {
            const date = new Date(data.first_seen * 1000);
            if (!Number.isNaN(date.getTime()))
                add('first_seen', date.toISOString(), true);
        }
        for (const key of ['created_at', 'updated_at']) {
            const value = data[key];
            if (
                value &&
                !value.startsWith('0001-') &&
                !Number.isNaN(Date.parse(value)) &&
                (key === 'updated_at' || !avatar.created_at)
            )
                add(key, value, true);
        }
    }
    return facts;
}
