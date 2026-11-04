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

export function getOwnedCosmetics(inventory, type) {
    return Array.from(
        new Map(
            inventory
                .filter(
                    (item) =>
                        item.itemType === type &&
                        item.templateId &&
                        !item.isArchived
                )
                .map((item) => [item.templateId, item])
        ).values()
    );
}

export function getProfileCosmeticUpdate(dialog, inventory) {
    const payload = {};
    for (const type of ['profileEffect', 'nameplateEffect', 'iconFrame']) {
        const value = dialog[type] ?? '';
        if (value === (dialog.selfProfileRef[type] ?? '')) continue;
        if (
            value &&
            !getOwnedCosmetics(inventory, type).some(
                (item) => item.templateId === value
            )
        ) {
            throw new Error('This cosmetic is not in your active inventory.');
        }
        payload[type] = value;
    }
    return payload;
}
