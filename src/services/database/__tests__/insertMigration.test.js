import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
const bridge = vi.hoisted(() => ({
    execute: vi.fn(),
    executeNonQuery: vi.fn(),
    executeInsert: vi.fn()
}));
vi.mock('../../sqlite.js', () => ({ default: bridge }));
vi.mock('../index.js', () => ({ dbVars: { userPrefix: 'test' } }));
import { tableFixes } from '../tableFixes';
import { gameLog } from '../gameLog';
import { feed } from '../feed';
let db;
const params = (args = {}) =>
    Object.fromEntries(
        Object.entries(args).map(([key, value]) => [
            key.slice(1),
            value ?? null
        ])
    );
beforeEach(() => {
    db = new DatabaseSync(':memory:');
    bridge.execute.mockImplementation(async (callback, sql, args) => {
        const statement = db.prepare(sql);
        statement.setReturnArrays(true);
        for (const row of statement.all(params(args))) callback(row);
    });
    bridge.executeNonQuery.mockImplementation(
        async (sql, args) => db.prepare(sql).run(params(args)).changes
    );
    bridge.executeInsert.mockImplementation(async (sql, args) => {
        const result = db.prepare(sql).run(params(args));
        return result.changes ? Number(result.lastInsertRowid) : 0;
    });
});
afterEach(() => db.close());
test('display-name repair preserves canonical duplicates and repairs other rows idempotently', async () => {
    db.exec(`CREATE TABLE gamelog_join_leave (id INTEGER PRIMARY KEY, created_at TEXT, type TEXT, display_name TEXT, UNIQUE(created_at, type, display_name));
        INSERT INTO gamelog_join_leave VALUES (1,'date','OnPlayerJoined','Alice'), (2,'date','OnPlayerJoined','Alice (usr_1)'), (3,'date','OnPlayerLeft','Alice (usr_1)'), (4,'date','OnPlayerJoined','Bob (usr_2)');`);
    await tableFixes.fixBrokenGameLogDisplayNames();
    await tableFixes.fixBrokenGameLogDisplayNames();
    expect(
        db
            .prepare(
                'SELECT id,display_name FROM gamelog_join_leave ORDER BY id'
            )
            .all()
            .map((r) => [r.id, r.display_name])
    ).toEqual([
        [1, 'Alice'],
        [3, 'Alice'],
        [4, 'Bob']
    ]);
});
test('GameLog inserts return persisted identity and ignore duplicate events, including bulk input', async () => {
    db.exec(
        `CREATE TABLE gamelog_join_leave (id INTEGER PRIMARY KEY, created_at TEXT, type TEXT, display_name TEXT, location TEXT, user_id TEXT, time INTEGER, UNIQUE(created_at,type,display_name));`
    );
    const entry = {
        created_at: 'date',
        type: 'OnPlayerJoined',
        displayName: "Alice's",
        location: 'wrld_1:1',
        userId: 'usr_1',
        time: 0
    };
    expect(await gameLog.addGamelogJoinLeaveToDatabase(entry)).toEqual({
        ...entry,
        rowId: 1
    });
    expect(await gameLog.addGamelogJoinLeaveToDatabase(entry)).toBeUndefined();
    expect(
        await gameLog.addGamelogJoinLeaveBulk([
            entry,
            { ...entry, type: 'OnPlayerLeft' }
        ])
    ).toEqual([{ ...entry, type: 'OnPlayerLeft', rowId: 2 }]);
});
test('feed insertion returns identity only for rows actually inserted', async () => {
    db.exec(
        'CREATE TABLE test_feed_status (id INTEGER PRIMARY KEY, created_at TEXT UNIQUE, user_id TEXT, display_name TEXT, status TEXT, status_description TEXT, previous_status TEXT, previous_status_description TEXT)'
    );
    const entry = {
        created_at: 'date',
        userId: 'usr_1',
        displayName: 'Alice',
        type: 'Status',
        status: 'active'
    };
    expect(await feed.addStatusToDatabase(entry)).toEqual({
        ...entry,
        rowId: 1
    });
    expect(await feed.addStatusToDatabase(entry)).toBeUndefined();
});
