const FILE_ID =
    /^file_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const performancePlatforms = ['standalonewindows', 'android', 'ios'];

/** @type {Array<[string, string[]]>} */
export const performanceGroups = [
    [
        'geometry',
        ['totalPolygons', 'totalVertices', 'skinnedMeshCount', 'meshCount']
    ],
    ['textures', ['totalTextureUsage', 'materialCount', 'materialSlotsUsed']],
    [
        'rendering',
        [
            'lightCount',
            'trailRendererCount',
            'lineRendererCount',
            'raycastCount'
        ]
    ],
    [
        'particles',
        [
            'particleSystemCount',
            'totalMaxParticles',
            'meshParticleMaxPolygons',
            'particleTrailsEnabled',
            'particleCollisionEnabled'
        ]
    ],
    [
        'dynamics',
        [
            'physBoneComponentCount',
            'physBoneTransformCount',
            'physBoneColliderCount',
            'physBoneCollisionCheckCount',
            'contactCount'
        ]
    ],
    [
        'rig',
        [
            'boneCount',
            'animatorCount',
            'constraintCount',
            'constraintDepth',
            'audioSourceCount',
            'clothCount',
            'totalClothVertices',
            'writeDefaultsUsed'
        ]
    ]
];
const booleanStats = new Set([
    'particleTrailsEnabled',
    'particleCollisionEnabled',
    'writeDefaultsUsed'
]);

/** Resolve file versions centrally; assetVersion is the bundle format, not the file version. */
export function resolveFileVersion(pkg) {
    if (!pkg || typeof pkg !== 'object') return null;
    const validate = (fileId, versionId) => {
        const version =
            typeof versionId === 'string' && /^\d+$/.test(versionId)
                ? Number(versionId)
                : versionId;
        return typeof fileId === 'string' &&
            FILE_ID.test(fileId) &&
            Number.isSafeInteger(version) &&
            version > 0
            ? { fileId, versionId: version }
            : null;
    };
    const direct = validate(pkg.fileId, pkg.versionId);
    if (direct) return direct;
    try {
        const url = new URL(pkg.assetUrl);
        if (
            url.protocol !== 'https:' ||
            !['api.vrchat.cloud', 'api.vrchat.com', 'vrchat.com'].includes(
                url.hostname
            )
        )
            return null;
        const match = /^\/api\/1\/file\/(file_[^/]+)\/(\d+)\/file\/?$/.exec(
            url.pathname
        );
        return match ? validate(match[1], match[2]) : null;
    } catch {
        return null;
    }
}

/** One latest normal build per platform; never analyze an impostor as an avatar. */
export function resolveAvatarPackages(avatar) {
    const packages = Array.isArray(avatar?.unityPackages)
        ? avatar.unityPackages
        : [];
    return performancePlatforms.flatMap((platform) => {
        const candidates = packages.filter(
            (pkg) =>
                pkg?.platform === platform &&
                (!pkg.variant || ['standard', 'security'].includes(pkg.variant))
        );
        candidates.sort(
            (a, b) =>
                (Date.parse(b.created_at) || 0) -
                    (Date.parse(a.created_at) || 0) ||
                (Number(b.unitySortNumber) || 0) -
                    (Number(a.unitySortNumber) || 0) ||
                packages.indexOf(b) - packages.indexOf(a)
        );
        const pkg = candidates[0];
        if (!pkg) return [];
        // Match BetterVRCX's existing bundle analysis: standard uploads use security analysis.
        return [
            {
                avatarId: avatar.id,
                platform,
                variant: 'security',
                ...resolveFileVersion(pkg)
            }
        ];
    });
}

export function normalizeAnalysis(json) {
    const status = json?.error?.status_code;
    if (status) return analysisFailure(status);
    if (!json || json.success === false) return { status: 'unavailable' };
    const stats = {};
    for (const [, fields] of performanceGroups) {
        for (const field of fields) {
            const value = json.avatarStats?.[field];
            if (
                booleanStats.has(field)
                    ? typeof value === 'boolean'
                    : typeof value === 'number' &&
                      Number.isFinite(value) &&
                      value >= 0
            ) {
                stats[field] = value;
            }
        }
    }
    const rating =
        typeof json.performanceRating === 'string' &&
        json.performanceRating.trim()
            ? json.performanceRating
            : null;
    if (!rating && Object.keys(stats).length === 0)
        return { status: 'unavailable' };
    return { status: 'available', rating, stats, fetchedAt: Date.now() };
}

export function analysisFailure(status) {
    if (status === 202) return { status: 'pending' };
    if (status === 404 || status === -1) return { status: 'unavailable' };
    if (status === 401 || status === 403) return { status: 'access' };
    return { status: 'error' };
}

/** The API schema does not document totalTextureUsage units. Keep its raw value. */
export function formatPerformanceStat(field, value, locale, t) {
    if (typeof value === 'boolean')
        return t(`dialog.avatar.performance.${value ? 'yes' : 'no'}`);
    const formatted = new Intl.NumberFormat(locale).format(value);
    return field === 'totalTextureUsage'
        ? t('dialog.avatar.performance.texture_raw', { value: formatted })
        : formatted;
}
