/** @param {object} world @returns {Array<object>} */
export function getWorldInstances(world) {
    const legacy = Array.isArray(world?.instances) ? world.instances : [];
    const instances = Array.isArray(world?.slimInstances)
        ? world.slimInstances
        : legacy.filter(Array.isArray).map(([instanceId, n_users]) => ({
              instanceId,
              n_users
          }));
    return instances.filter(
        (instance) =>
            typeof instance?.instanceId === 'string' && instance.instanceId
    );
}

/** @param {object} instance @param {object} names @returns {Array<object>} */
export function getInstanceLanguages(instance, names = {}) {
    if (!Array.isArray(instance?.languages)) return [];
    const languages = instance.languages.filter(
        (code) => typeof code === 'string' && code
    );
    const bases = [...new Set(languages.map((code) => code.split('-')[0]))];
    const aliases = Object.fromEntries(
        bases.map((base, index) => [base, instance.languagesIso639?.[index]])
    );
    return languages
        .map((code) => {
            const [base, region] = code.split('-');
            const key = aliases[base] || code;
            const ratio = instance.languageRatio?.[code];
            const validRatio =
                typeof ratio === 'number' &&
                Number.isFinite(ratio) &&
                ratio >= 0 &&
                ratio <= 1;
            const population = instance.userCount ?? instance.n_users;
            return {
                key: code,
                flagKey: key,
                name: `${names[key] || code}${region ? ` (${region.toUpperCase()})` : ''}`,
                percent: validRatio ? Math.round(ratio * 100) : null,
                count:
                    validRatio && Number.isFinite(population)
                        ? Math.round(ratio * population)
                        : null
            };
        })
        .sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1));
}

/** @param {object} instance @param {string} userId @param {boolean} vrcPlus @param {object} group @returns {boolean} */
export function canManageInstance(instance, userId, vrcPlus, group) {
    if (!instance?.ownerId || !userId) return false;
    if (instance.ownerId === userId) return Boolean(vrcPlus);
    if (!instance.ownerId.startsWith('grp_')) return false;
    const permissions = group?.myMember?.permissions ?? [];
    return (
        permissions.includes('*') ||
        permissions.includes('group-instance-manage')
    );
}

/** @param {Array<object>} events @param {number} now @returns {Array<object>} */
export function getLinkableInstanceEvents(events, now = Date.now()) {
    const window = 6 * 60 * 60 * 1000;
    return events
        .filter(
            (event) =>
                Date.parse(event.startsAt) <= now + window &&
                Date.parse(event.endsAt) >= now - window
        )
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** @param {object} room @returns {boolean} */
export function isClosedInstance(room) {
    return Boolean(room?.ref?.closedAt);
}
