/** Reuse favorite refs; no second library or persisted world copies. */
export function favoriteWorldEntries(remote = [], local = {}) {
    const worlds = new Map();
    for (const world of [
        ...remote.map((f) => f.ref ?? { id: f.worldId }),
        ...Object.values(local).flat()
    ]) {
        if (world?.id?.startsWith('wrld_') && !worlds.has(world.id))
            worlds.set(world.id, world);
    }
    return [...worlds.values()];
}

/** Compact per-account markers only. Unknown metadata never signals an update. */
export function updateFavoriteMarkers(markers, worlds) {
    let changed = false;
    for (const world of worlds) {
        const version =
            Number.isFinite(world.version) && world.version > 0
                ? world.version
                : undefined;
        const updatedAt =
            typeof world.updated_at === 'string' &&
            Number.isFinite(Date.parse(world.updated_at))
                ? world.updated_at
                : undefined;
        if (version === undefined && updatedAt === undefined) continue;
        const old = markers[world.id];
        const updated =
            !!old &&
            (old.updated ||
                (version !== undefined &&
                    old.version !== undefined &&
                    version > old.version) ||
                (updatedAt &&
                    old.updatedAt &&
                    Date.parse(updatedAt) > Date.parse(old.updatedAt)));
        const next = {
            version:
                version === undefined
                    ? old?.version
                    : Math.max(version, old?.version ?? version),
            updatedAt:
                !updatedAt ||
                (old?.updatedAt &&
                    Date.parse(old.updatedAt) > Date.parse(updatedAt))
                    ? old?.updatedAt
                    : updatedAt,
            updated: !!updated
        };
        if (JSON.stringify(old) !== JSON.stringify(next)) {
            markers[world.id] = next;
            changed = true;
        }
    }
    return changed;
}

export function worldCard(entry, cachedWorlds) {
    const id = entry.worldId || entry.id;
    return {
        ...entry,
        ...cachedWorlds.get(id),
        id,
        name: cachedWorlds.get(id)?.name || entry.name || entry.worldName || id
    };
}
