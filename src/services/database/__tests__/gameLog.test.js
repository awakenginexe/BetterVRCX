import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    execute: vi.fn()
}));

vi.mock('../../sqlite.js', () => ({
    default: {
        execute: mocks.execute,
        executeNonQuery: vi.fn()
    }
}));
vi.mock('../index.js', () => ({
    dbVars: {
        maxTableSize: 500,
        userPrefix: ''
    }
}));

import { gameLog } from '../gameLog.js';

describe('gameLog.getMyTopWorlds', () => {
    beforeEach(() => {
        mocks.execute.mockReset();
    });

    test('adds an exclude clause when a home world id is provided', async () => {
        mocks.execute.mockImplementation(async (callback, sql, params) => {
            callback(['wrld_1', 'World One', 3, 9000]);
            return undefined;
        });

        const result = await gameLog.getMyTopWorlds(30, 5, 'time', 'wrld_home');

        expect(result).toEqual([
            {
                worldId: 'wrld_1',
                worldName: 'World One',
                visitCount: 3,
                totalTime: 9000
            }
        ]);
        expect(mocks.execute).toHaveBeenCalledTimes(1);
        expect(mocks.execute.mock.calls[0][1]).toContain(
            'AND world_id != @excludeWorldId'
        );
        expect(mocks.execute.mock.calls[0][2]).toMatchObject({
            '@limit': 5,
            '@daysOffset': '-30 days',
            '@excludeWorldId': 'wrld_home'
        });
    });
});

test('recent worlds aggregate all access types from existing location history', async () => {
    mocks.execute
        .mockReset()
        .mockImplementation(async (callback) =>
            callback(['wrld_private', 'Private world', 3, 9000, '2026-09-15'])
        );
    const rows = await gameLog.getRecentWorlds(24);
    expect(rows).toEqual([
        {
            worldId: 'wrld_private',
            worldName: 'Private world',
            visitCount: 3,
            totalTime: 9000,
            lastVisit: '2026-09-15'
        }
    ]);
    const sql = mocks.execute.mock.calls[0][1];
    expect(sql).toContain('FROM gamelog_location');
    expect(sql).toContain('GROUP BY world_id');
    expect(sql).toContain('COUNT(*)');
    expect(sql).toContain('MAX(created_at)');
    expect(sql).not.toMatch(/location LIKE|public|private|accessType/i);
});

test('executes recent aggregation against repeated public and private visits', async () => {
    const db = new DatabaseSync(':memory:');
    db.exec(
        'CREATE TABLE gamelog_location (world_id TEXT, world_name TEXT, location TEXT, time INTEGER, created_at TEXT)'
    );
    const insert = db.prepare(
        'INSERT INTO gamelog_location VALUES (?,?,?,?,?)'
    );
    for (const access of [
        '1',
        '2~friends(owner)',
        '3~hidden(owner)',
        '4~private(owner)',
        '5~private(owner)~canRequestInvite',
        '6~group(group)~groupAccessType(members)',
        '7~group(group)~groupAccessType(plus)',
        '8~group(group)~groupAccessType(public)'
    ])
        insert.run(
            'wrld_a',
            'World A',
            'wrld_a:' + access,
            1000,
            '2026-09-15T12:00:00Z'
        );
    insert.run('wrld_b', 'World B', 'wrld_b:2', 500, '2026-09-16T12:00:00Z');
    mocks.execute
        .mockReset()
        .mockImplementation(async (callback, sql, params) => {
            const statement = db.prepare(sql);
            statement.setReturnArrays(true);
            for (const row of statement.all(params)) callback(row);
        });
    const rows = await gameLog.getRecentWorlds(24);
    expect(rows.map((r) => r.worldId)).toEqual(['wrld_b', 'wrld_a']);
    expect(rows[1]).toMatchObject({ visitCount: 8, totalTime: 8000 });
    db.close();
});
