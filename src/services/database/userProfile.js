import { dbVars } from '../database';
import sqliteService from '../sqlite.js';

export function parseBioLinks(value) {
    if (value == null) return null;
    try {
        const links = JSON.parse(value);
        return Array.isArray(links)
            ? links.filter((link) => typeof link === 'string')
            : null;
    } catch {
        return null;
    }
}

export const userProfile = {
    async getUserProfile(userId) {
        let profile = null;
        await sqliteService.execute(
            (row) => {
                profile = {
                    id: row[0],
                    bio: row[1],
                    bioLinks: parseBioLinks(row[2])
                };
            },
            `SELECT user_id, bio, bio_links FROM ${dbVars.userPrefix}_user_profile WHERE user_id = @user_id`,
            { '@user_id': userId }
        );
        return profile;
    },
    setUserProfile(profile) {
        return sqliteService.executeNonQuery(
            `INSERT OR REPLACE INTO ${dbVars.userPrefix}_user_profile (user_id, bio, bio_links) VALUES (@user_id, @bio, @bio_links)`,
            {
                '@user_id': profile.id,
                '@bio': profile.bio,
                '@bio_links': JSON.stringify(profile.bioLinks)
            }
        );
    }
};
