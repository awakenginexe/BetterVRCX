import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
    execute: vi.fn(),
    executeNonQuery: vi.fn(),
    executeInsert: vi.fn()
}));
vi.mock('../../sqlite.js', () => ({ default: mocks }));
vi.mock('../index.js', () => ({
    dbVars: { userPrefix: 'usrtest', maxTableSize: 500, searchTableSize: 5000 }
}));
import { feed } from '../feed';
import { tableAlter } from '../tableAlter';
import { userProfile } from '../userProfile';
let db;
beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec(`CREATE TABLE usrtest_feed_bio (id INTEGER PRIMARY KEY, created_at TEXT, user_id TEXT, display_name TEXT, bio TEXT, previous_bio TEXT);
        INSERT INTO usrtest_feed_bio VALUES (1, '2026-10-18', 'usr_friend', 'Friend', 'Original', 'Earlier');`);
    mocks.execute.mockImplementation(async (callback, sql, args = {}) => {
        const statement = db.prepare(sql);
        statement.setReturnArrays(true);
        for (const row of statement.all(
            Object.fromEntries(
                Object.entries(args).map(([key, value]) => [
                    key.slice(1),
                    value
                ])
            )
        ))
            callback(row);
    });
    mocks.executeNonQuery.mockImplementation(async (sql, args = {}) =>
        db
            .prepare(sql)
            .run(
                Object.fromEntries(
                    Object.entries(args).map(([key, value]) => [
                        key.slice(1),
                        value
                    ])
                )
            )
    );
});
beforeEach(() => {
    mocks.executeInsert.mockImplementation(async (sql, args) => {
        const result = await mocks.executeNonQuery(sql, args);
        return result.changes ? Number(result.lastInsertRowid) : 0;
    });
});
afterEach(() => db.close());

it('migrates old bio history without inventing prior links, and stores known empty links distinctly', async () => {
    await tableAlter.addFeedBioLinks();
    await tableAlter.addFeedBioLinks();
    const old = (await feed.lookupFeedDatabase(['Bio'], []))[0];
    expect(old).toMatchObject({
        bio: 'Original',
        previousBio: 'Earlier',
        bioLinks: null,
        previousBioLinks: null
    });
    await feed.addBioToDatabase({
        created_at: '2026-10-19',
        userId: 'usr_friend',
        displayName: 'Friend',
        bio: 'Original',
        previousBio: 'Original',
        bioLinks: [],
        previousBioLinks: ['https://example.com']
    });
    const rows = await feed.lookupFeedDatabase(['Bio'], []);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
        bioLinks: [],
        previousBioLinks: ['https://example.com']
    });
    const found = await feed.searchFeedDatabase('example.com', ['Bio'], []);
    expect(found).toHaveLength(1);
});

it('round-trips the last observed public profile without changing its links', async () => {
    db.exec(
        'CREATE TABLE usrtest_user_profile (user_id TEXT PRIMARY KEY, bio TEXT, bio_links TEXT)'
    );
    await userProfile.setUserProfile({
        id: 'usr_friend',
        bio: '',
        bioLinks: ['https://example.com']
    });
    expect(await userProfile.getUserProfile('usr_friend')).toEqual({
        id: 'usr_friend',
        bio: '',
        bioLinks: ['https://example.com']
    });
    expect(await userProfile.getUserProfile('usr_other')).toBeNull();
});
