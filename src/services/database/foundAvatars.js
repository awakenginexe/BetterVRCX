import sqliteService from '../sqlite';

function prefix(accountId) {
    if (!/^usr_[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(accountId))
        throw new Error('Invalid Found Avatars account');
    return accountId.replaceAll('-', '').replaceAll('_', '').toLowerCase();
}

const foundAvatars = {
    async initFoundAvatarTables(accountId) {
        const name = prefix(accountId);
        await sqliteService.executeNonQuery(
            `CREATE TABLE IF NOT EXISTS ${name}_found_avatar (avatar_id TEXT PRIMARY KEY, data TEXT NOT NULL)`
        );
        await sqliteService.executeNonQuery(
            `CREATE TABLE IF NOT EXISTS ${name}_found_avatar_wearer (avatar_id TEXT NOT NULL, user_id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (avatar_id, user_id))`
        );
    },

    async getFoundAvatars(accountId) {
        const name = prefix(accountId);
        const entries = new Map();
        await sqliteService.execute((row) => {
            entries.set(row[0], {
                ...JSON.parse(row[1]),
                id: row[0],
                wearers: []
            });
        }, `SELECT avatar_id, data FROM ${name}_found_avatar`);
        await sqliteService.execute((row) => {
            entries
                .get(row[0])
                ?.wearers.push({ ...JSON.parse(row[2]), userId: row[1] });
        }, `SELECT avatar_id, user_id, data FROM ${name}_found_avatar_wearer`);
        return [...entries.values()];
    },

    async saveFoundAvatar(accountId, entry) {
        const name = prefix(accountId);
        const { wearers, ...data } = entry;
        await sqliteService.executeNonQuery(
            `INSERT INTO ${name}_found_avatar (avatar_id, data) VALUES (@id, @data) ON CONFLICT(avatar_id) DO UPDATE SET data = excluded.data`,
            {
                '@id': entry.id,
                '@data': JSON.stringify(data)
            }
        );
        for (const wearer of wearers) {
            await sqliteService.executeNonQuery(
                `INSERT INTO ${name}_found_avatar_wearer (avatar_id, user_id, data) VALUES (@id, @userId, @data) ON CONFLICT(avatar_id, user_id) DO UPDATE SET data = excluded.data`,
                {
                    '@id': entry.id,
                    '@userId': wearer.userId,
                    '@data': JSON.stringify(wearer)
                }
            );
        }
    },

    async getFoundAvatarHistory(accountId) {
        const rows = [];
        await sqliteService.execute(
            (row) => rows.push({ avatarId: row[0], lastSeenAt: row[1] }),
            `SELECT avatar_id, created_at FROM ${prefix(accountId)}_avatar_history`
        );
        return rows;
    }
};

export { foundAvatars };
