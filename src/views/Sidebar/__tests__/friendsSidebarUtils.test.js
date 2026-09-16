import { describe, expect, test } from 'vitest';

import {
    buildFriendRow,
    buildInstanceHeaderRow,
    buildLastKnownPresenceGroups,
    buildToggleRow,
    estimateRowSize
} from '../friendsSidebarUtils';

// ─── buildToggleRow ──────────────────────────────────────────────────

describe('buildToggleRow', () => {
    test('creates a toggle-header row with defaults', () => {
        const row = buildToggleRow({ key: 'online', label: 'Online' });
        expect(row).toEqual({
            type: 'toggle-header',
            key: 'online',
            label: 'Online',
            count: null,
            expanded: true,
            headerPadding: null,
            paddingBottom: null,
            onClick: null
        });
    });

    test('accepts all optional parameters', () => {
        const onClick = () => {};
        const row = buildToggleRow({
            key: 'vip',
            label: 'VIP',
            count: 5,
            expanded: false,
            headerPadding: 10,
            paddingBottom: 8,
            onClick
        });
        expect(row.count).toBe(5);
        expect(row.expanded).toBe(false);
        expect(row.headerPadding).toBe(10);
        expect(row.paddingBottom).toBe(8);
        expect(row.onClick).toBe(onClick);
    });

    test('always sets type to toggle-header', () => {
        const row = buildToggleRow({ key: 'x', label: 'X' });
        expect(row.type).toBe('toggle-header');
    });
});

// ─── buildFriendRow ──────────────────────────────────────────────────

describe('buildFriendRow', () => {
    const friend = { id: 'usr_123', displayName: 'TestUser' };

    test('creates a friend-item row with defaults', () => {
        const row = buildFriendRow(friend, 'friend:usr_123');
        expect(row).toEqual({
            type: 'friend-item',
            key: 'friend:usr_123',
            friend,
            isGroupByInstance: undefined,
            paddingBottom: undefined,
            itemStyle: undefined
        });
    });

    test('passes options through', () => {
        const style = { opacity: 0.5 };
        const row = buildFriendRow(friend, 'k', {
            isGroupByInstance: true,
            paddingBottom: 4,
            itemStyle: style
        });
        expect(row.isGroupByInstance).toBe(true);
        expect(row.paddingBottom).toBe(4);
        expect(row.itemStyle).toBe(style);
    });

    test('always sets type to friend-item', () => {
        const row = buildFriendRow(friend, 'k');
        expect(row.type).toBe('friend-item');
    });
});

// ─── buildInstanceHeaderRow ──────────────────────────────────────────

describe('buildInstanceHeaderRow', () => {
    test('creates an instance-header row', () => {
        const row = buildInstanceHeaderRow(
            'wrld_123:456~private',
            3,
            'inst:wrld_123'
        );
        expect(row).toEqual({
            type: 'instance-header',
            key: 'inst:wrld_123',
            location: 'wrld_123:456~private',
            count: 3,
            paddingBottom: 4
        });
    });

    test('always has paddingBottom of 4', () => {
        const row = buildInstanceHeaderRow('loc', 1, 'k');
        expect(row.paddingBottom).toBe(4);
    });
});

// ─── estimateRowSize ─────────────────────────────────────────────────

describe('estimateRowSize', () => {
    test('returns 44 for null/undefined', () => {
        expect(estimateRowSize(null)).toBe(44);
        expect(estimateRowSize(undefined)).toBe(44);
    });

    test('returns 28 + paddingBottom for toggle-header', () => {
        expect(estimateRowSize({ type: 'toggle-header' })).toBe(28);
        expect(
            estimateRowSize({ type: 'toggle-header', paddingBottom: 8 })
        ).toBe(36);
    });

    test('returns 24 + paddingBottom for vip-subheader', () => {
        expect(estimateRowSize({ type: 'vip-subheader' })).toBe(24);
        expect(
            estimateRowSize({ type: 'vip-subheader', paddingBottom: 4 })
        ).toBe(28);
    });

    test('returns 26 + paddingBottom for instance-header', () => {
        expect(estimateRowSize({ type: 'instance-header' })).toBe(26);
        expect(
            estimateRowSize({ type: 'instance-header', paddingBottom: 4 })
        ).toBe(30);
    });

    test('returns 52 + paddingBottom for any other type (friend-item)', () => {
        expect(estimateRowSize({ type: 'friend-item' })).toBe(52);
        expect(estimateRowSize({ type: 'friend-item', paddingBottom: 6 })).toBe(
            58
        );
    });
});

describe('buildLastKnownPresenceGroups', () => {
    const observation = (userId, locationTag, observedAt = 1) => ({
        userId,
        locationTag,
        worldId: locationTag.split(':')[0],
        observedAt
    });

    test('includes remembered rows in an instance-group virtual height', () => {
        expect(
            estimateRowSize({
                type: 'instance-group',
                friends: [{ id: 'usr_live' }],
                remembered: [{ friend: { id: 'usr_hint' } }]
            })
        ).toBe(122);
    });

    test('merges remembered friends into the matching live tag, including a lone confirmed friend', () => {
        const groups = buildLastKnownPresenceGroups({
            observations: new Map([
                [
                    'usr_confirmed',
                    observation('usr_confirmed', 'wrld_a:1~private')
                ],
                [
                    'usr_remembered',
                    observation('usr_remembered', 'wrld_a:1~private')
                ]
            ]),
            friendsById: new Map([
                [
                    'usr_confirmed',
                    { id: 'usr_confirmed', ref: { displayName: 'Confirmed' } }
                ],
                [
                    'usr_remembered',
                    { id: 'usr_remembered', ref: { displayName: 'Remembered' } }
                ]
            ]),
            liveGroups: [
                [
                    {
                        id: 'usr_confirmed',
                        ref: { $location: { tag: 'wrld_a:1~private' } }
                    }
                ]
            ],
            locallyPresentIds: new Set()
        });

        expect(groups).toEqual([
            {
                locationTag: 'wrld_a:1~private',
                confirmed: [
                    { id: 'usr_confirmed', ref: { displayName: 'Confirmed' } }
                ],
                remembered: [
                    {
                        friend: {
                            id: 'usr_remembered',
                            ref: { displayName: 'Remembered' }
                        },
                        observation: observation(
                            'usr_remembered',
                            'wrld_a:1~private'
                        )
                    }
                ],
                historicalOnly: false
            }
        ]);
    });

    test('retains historical-only groups and excludes live or locally present users', () => {
        const groups = buildLastKnownPresenceGroups({
            observations: new Map([
                ['usr_live', observation('usr_live', 'wrld_a:1')],
                ['usr_local', observation('usr_local', 'wrld_b:2')],
                ['usr_history', observation('usr_history', 'wrld_c:3')]
            ]),
            friendsById: new Map([
                ['usr_live', { id: 'usr_live' }],
                ['usr_local', { id: 'usr_local' }],
                ['usr_history', { id: 'usr_history' }]
            ]),
            liveGroups: [
                [{ id: 'usr_live', ref: { $location: { tag: 'wrld_a:1' } } }]
            ],
            locallyPresentIds: new Set(['usr_local'])
        });

        expect(groups).toEqual([
            {
                locationTag: 'wrld_c:3',
                confirmed: [],
                remembered: [
                    {
                        friend: { id: 'usr_history' },
                        observation: observation('usr_history', 'wrld_c:3')
                    }
                ],
                historicalOnly: true
            }
        ]);
    });

    test('keeps live-group order and puts confirmed members before remembered members', () => {
        const groups = buildLastKnownPresenceGroups({
            observations: new Map([
                ['usr_b', observation('usr_b', 'wrld_b:2')],
                ['usr_a', observation('usr_a', 'wrld_a:1')],
                ['usr_c', observation('usr_c', 'wrld_a:1')],
                ['usr_d', observation('usr_d', 'wrld_b:2')]
            ]),
            friendsById: new Map([
                ['usr_a', { id: 'usr_a' }],
                ['usr_b', { id: 'usr_b' }],
                ['usr_c', { id: 'usr_c' }],
                ['usr_d', { id: 'usr_d' }]
            ]),
            liveGroups: [
                [{ id: 'usr_b', ref: { $location: { tag: 'wrld_b:2' } } }],
                [{ id: 'usr_a', ref: { $location: { tag: 'wrld_a:1' } } }]
            ],
            locallyPresentIds: new Set()
        });

        expect(groups.map((group) => group.locationTag)).toEqual([
            'wrld_b:2',
            'wrld_a:1'
        ]);
        expect(groups[0].confirmed.map((friend) => friend.id)).toEqual([
            'usr_b'
        ]);
        expect(groups[0].remembered.map(({ friend }) => friend.id)).toEqual([
            'usr_d'
        ]);
        expect(groups[1].confirmed.map((friend) => friend.id)).toEqual([
            'usr_a'
        ]);
        expect(groups[1].remembered.map(({ friend }) => friend.id)).toEqual([
            'usr_c'
        ]);
    });
});
