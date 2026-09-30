const text = (value) => (typeof value === 'string' ? value : '');
const strings = (value) =>
    Array.isArray(value) ? value.filter((x) => typeof x === 'string') : [];
const object = (value) =>
    value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const platform = (value) =>
    ({ standalonewindows: 'pc', quest: 'android' })[value] || value;

function imageUrl(value, source) {
    const input = text(value);
    if (!input) return '';
    try {
        const url =
            source === 'vrcndb'
                ? new URL(input, 'https://db.vrcnext.com')
                : new URL(input);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
        return '';
    }
}

/** Normalize only display fields. Database packages and discovery facts stay supplemental. */
export function normalizeAvatarResult(input, source, searchedAt = Date.now()) {
    if (!input || typeof input !== 'object' || Array.isArray(input))
        return null;
    const id = text(input.id || input.Id);
    if (!/^avtr_[a-zA-Z0-9-]+$/.test(id)) return null;
    const thumbnail = imageUrl(
        input.thumbnailImageUrl || input.ThumbnailImageUrl || input.thumbnail,
        source
    );
    const ref = {
        id,
        name: text(input.name || input.Name),
        authorId: text(input.authorId || input.AuthorId || input.author_id),
        authorName: text(
            input.authorName || input.AuthorName || input.author_name
        ),
        description: text(input.description || input.Description),
        imageUrl:
            imageUrl(input.imageUrl || input.ImageUrl, source) || thumbnail,
        thumbnailImageUrl: thumbnail,
        releaseStatus:
            text(input.releaseStatus || input.ReleaseStatus) || 'public',
        tags: strings(input.tags || input.Tags),
        created_at: text(input.created_at || input.CreatedAt),
        updated_at: text(input.updated_at || input.UpdatedAt)
    };
    const packages = Array.isArray(input.unityPackages)
        ? input.unityPackages.filter((p) => p && typeof p === 'object')
        : [];
    const performance = {};
    const avtrdbPerformance = object(input.performance);
    for (const [field, key] of [
        ['pc_rating', 'pc'],
        ['android_rating', 'android'],
        ['ios_rating', 'ios']
    ]) {
        if (typeof avtrdbPerformance[field] === 'string')
            performance[key] = avtrdbPerformance[field];
    }
    for (const [key, value] of Object.entries(
        object(input.performance || input.performanceRating)
    )) {
        if (
            ['pc', 'quest', 'android', 'ios', 'standalonewindows'].includes(
                key
            ) &&
            typeof value === 'string'
        )
            performance[platform(key)] = value;
    }
    for (const p of packages) {
        if (
            p.variant !== 'impostor' &&
            typeof p.platform === 'string' &&
            typeof p.performanceRating === 'string'
        )
            performance[platform(p.platform)] ||= p.performanceRating;
    }
    const data = {
        ...ref,
        hasImposters:
            typeof input.hasImposters === 'boolean'
                ? input.hasImposters
                : undefined,
        platforms: strings(input.platforms).map(platform),
        performance,
        impostor: [
            ...new Set([
                ...strings(input.impostor).map(platform),
                ...packages
                    .filter(
                        (p) =>
                            p.variant === 'impostor' &&
                            typeof p.platform === 'string'
                    )
                    .map((p) => platform(p.platform))
            ])
        ],
        styles: {
            primary: text(object(input.styles).primary),
            secondary: text(object(input.styles).secondary)
        }
    };
    for (const key of ['first_seen', 'pop', 'trend_rank', 'likes', 'wear']) {
        if (
            typeof input[key] === 'number' &&
            Number.isFinite(input[key]) &&
            input[key] >= 0
        )
            data[key] = input[key];
    }
    for (const key of ['liked', 'featured']) {
        if (typeof input[key] === 'boolean') data[key] = input[key];
    }
    if (typeof avtrdbPerformance.has_impostor === 'boolean')
        data.hasImposters = avtrdbPerformance.has_impostor;
    ref.$searchMetadata = {
        sources: [source],
        sourceData: { [source]: data },
        primarySource: source,
        searchedAt
    };
    return ref;
}

export function mergeMetadata(previous, incoming) {
    return {
        sources: [
            ...new Set([
                ...(previous?.sources || []),
                ...(incoming?.sources || [])
            ])
        ],
        sourceData: { ...previous?.sourceData, ...incoming?.sourceData },
        primarySource: previous?.primarySource || incoming?.primarySource || '',
        searchedAt: Math.max(
            previous?.searchedAt || 0,
            incoming?.searchedAt || 0
        )
    };
}

export function mergeAvatarResults(avatars) {
    const merged = new Map();
    for (const avatar of avatars) {
        const existing = merged.get(avatar.id);
        if (!existing) {
            merged.set(avatar.id, { ...avatar });
            continue;
        }
        for (const key of [
            'name',
            'authorId',
            'authorName',
            'description',
            'imageUrl',
            'thumbnailImageUrl',
            'created_at',
            'updated_at'
        ]) {
            if (!existing[key] && avatar[key]) existing[key] = avatar[key];
        }
        existing.$searchMetadata = mergeMetadata(
            existing.$searchMetadata,
            avatar.$searchMetadata
        );
    }
    return merged;
}
