const PROFILE_EFFECT_THEMES = [
    { theme: 'meteor', keywords: ['meteor'] },
    { theme: 'eclipse', keywords: ['eclipse'] },
    { theme: 'singularity', keywords: ['singularity'] },
    { theme: 'neon', keywords: ['neon'] },
    { theme: 'afterglow', keywords: ['afterglow'] },
    { theme: 'electric', keywords: ['electric'] },
    { theme: 'gale', keywords: ['gale'] },
    { theme: 'ocean', keywords: ['ocean'] },
    { theme: 'earth', keywords: ['earth'] },
    { theme: 'storm', keywords: ['storm'] },
    { theme: 'fire', keywords: ['fire'] },
    { theme: 'reference', keywords: ['reference'] }
];

const VRCHAT_FILE_ID_PATTERN = /^file_[0-9a-f-]+$/i;
const VRCHAT_INVENTORY_TEMPLATE_ID_PATTERN = /^invt_[0-9a-f-]+$/i;
const VRCHAT_FILE_BASE_URL = 'https://api.vrchat.cloud/api/1/file';
const profileEffectAssetCache = new WeakMap();
const profileInventoryTemplateCache = new WeakMap();

function getProfileEffectTheme(effectId) {
    const normalizedEffectId = effectId.toLowerCase().replace(/[_-]+/g, ' ');

    return (
        PROFILE_EFFECT_THEMES.find(({ keywords }) =>
            keywords.some((keyword) => normalizedEffectId.includes(keyword))
        )?.theme || 'default'
    );
}

export function getProfileEffectAssetUrl(assetId) {
    if (typeof assetId !== 'string') {
        return '';
    }

    const normalizedAssetId = assetId.trim();
    if (/^https?:\/\//i.test(normalizedAssetId)) {
        return normalizedAssetId;
    }

    if (VRCHAT_FILE_ID_PATTERN.test(normalizedAssetId)) {
        return `${VRCHAT_FILE_BASE_URL}/${normalizedAssetId}/1/file`;
    }

    return '';
}

export function getProfileEffectPresentation(profileEffect) {
    if (typeof profileEffect !== 'string') {
        return { active: false, assetUrl: '', id: '', theme: 'default' };
    }

    const id = profileEffect.trim();
    if (!id) {
        return { active: false, assetUrl: '', id: '', theme: 'default' };
    }

    return {
        active: true,
        assetUrl: getProfileEffectAssetUrl(id),
        id,
        theme: getProfileEffectTheme(id)
    };
}

/**
 * Resolve a profile-effect inventory template to the animated asset used by VRChat.
 *
 * @param {string} profileEffect
 * @param {(params: object) => Promise<{ json?: object }>} getInventoryTemplate
 * @returns {Promise<string>}
 */
export async function resolveProfileEffectAssetUrl(
    profileEffect,
    getInventoryTemplate
) {
    const presentation = getProfileEffectPresentation(profileEffect);
    if (!presentation.active || presentation.assetUrl) {
        return presentation.assetUrl;
    }

    if (!VRCHAT_INVENTORY_TEMPLATE_ID_PATTERN.test(presentation.id)) {
        return '';
    }

    return resolveProfileInventoryAssetUrl(
        presentation.id,
        getInventoryTemplate,
        'mainAnimation'
    );
}

/**
 * Resolve an inventory-backed VRChat icon frame to its animated asset.
 *
 * @param {string} iconFrame
 * @param {(params: object) => Promise<{ json?: object }>} getInventoryTemplate
 * @returns {Promise<string>}
 */
export async function resolveProfileIconFrameAssetUrl(
    iconFrame,
    getInventoryTemplate
) {
    const assetUrl = getProfileEffectAssetUrl(iconFrame);
    if (assetUrl) {
        return assetUrl;
    }

    if (
        typeof iconFrame !== 'string' ||
        !VRCHAT_INVENTORY_TEMPLATE_ID_PATTERN.test(iconFrame.trim())
    ) {
        return '';
    }

    return resolveProfileInventoryAssetUrl(
        iconFrame.trim(),
        getInventoryTemplate,
        'mainAnimation'
    );
}

async function resolveProfileInventoryAssetUrl(
    inventoryTemplateId,
    getInventoryTemplate,
    assetType
) {
    if (typeof getInventoryTemplate !== 'function') {
        return '';
    }

    let assetCache = profileEffectAssetCache.get(getInventoryTemplate);
    if (!assetCache) {
        assetCache = new Map();
        profileEffectAssetCache.set(getInventoryTemplate, assetCache);
    }

    const assetCacheKey = `${assetType}:${inventoryTemplateId}`;
    if (assetCache.has(assetCacheKey)) {
        return assetCache.get(assetCacheKey);
    }

    let templateCache = profileInventoryTemplateCache.get(getInventoryTemplate);
    if (!templateCache) {
        templateCache = new Map();
        profileInventoryTemplateCache.set(getInventoryTemplate, templateCache);
    }

    let templatePromise = templateCache.get(inventoryTemplateId);
    if (!templatePromise) {
        templatePromise = getInventoryTemplate({
            inventoryTemplateId
        })
            .then((response) =>
                getInventoryTemplateFromResponse(response, inventoryTemplateId)
            )
            .catch(() => {
                templateCache.delete(inventoryTemplateId);
                return null;
            });
        templateCache.set(inventoryTemplateId, templatePromise);
    }

    const inventoryTemplate = await templatePromise;
    const assets = Array.isArray(inventoryTemplate?.metadata?.assets)
        ? inventoryTemplate.metadata.assets
        : [];
    const animationAsset = assets.find((asset) => asset?.type === assetType);
    const assetId =
        typeof animationAsset?.url === 'string'
            ? animationAsset.url
            : typeof animationAsset?.fileId === 'string'
              ? animationAsset.fileId
              : '';
    const assetUrl = getProfileEffectAssetUrl(assetId);

    if (assetUrl) {
        assetCache.set(assetCacheKey, assetUrl);
    }

    return assetUrl;
}

function getInventoryTemplateFromResponse(response, inventoryTemplateId) {
    const payload = response?.json ?? response;
    const candidates = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [payload?.data ?? payload];

    return (
        candidates.find(
            (template) =>
                template?.id === inventoryTemplateId ||
                template?.templateId === inventoryTemplateId
        ) || candidates[0]
    );
}
