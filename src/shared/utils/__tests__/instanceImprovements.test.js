import { describe, expect, it } from 'vitest';
import {
    getWorldInstances,
    getInstanceLanguages,
    canManageInstance,
    getLinkableInstanceEvents,
    isClosedInstance
} from '../instanceImprovements';

describe('world instance summaries', () => {
    it('uses slim summaries including zero counts, with legacy fallback', () => {
        expect(
            getWorldInstances({
                slimInstances: [{ instanceId: '1', n_users: 0 }],
                instances: [['old', 3]]
            })
        ).toEqual([{ instanceId: '1', n_users: 0 }]);
        expect(getWorldInstances({ instances: [['old', 3]] })).toEqual([
            { instanceId: 'old', n_users: 3 }
        ]);
        expect(
            getWorldInstances({ slimInstances: [], instances: [['old', 3]] })
        ).toEqual([]);
        expect(getWorldInstances({})).toEqual([]);
    });
    it('ignores malformed summaries', () => {
        expect(getWorldInstances({ instances: [null, {}, ['1', 0]] })).toEqual([
            { instanceId: '1', n_users: 0 }
        ]);
        expect(getWorldInstances({ instances: {} })).toEqual([]);
        expect(
            getWorldInstances({
                slimInstances: [null, {}, { instanceId: '1', n_users: 2 }]
            })
        ).toEqual([{ instanceId: '1', n_users: 2 }]);
    });
});

describe('instance languages', () => {
    it('maps shared language bases, sorts percentages and reports estimated counts', () => {
        expect(
            getInstanceLanguages(
                {
                    languages: ['en-us', 'en-gb', 'ja'],
                    languagesIso639: ['eng', 'jpn'],
                    languageRatio: { 'en-us': 0.25, 'en-gb': 0.5, ja: 0.1 },
                    userCount: 20
                },
                { eng: 'English', jpn: 'Japanese' }
            )
        ).toEqual([
            {
                key: 'en-gb',
                flagKey: 'eng',
                name: 'English (GB)',
                percent: 50,
                count: 10
            },
            {
                key: 'en-us',
                flagKey: 'eng',
                name: 'English (US)',
                percent: 25,
                count: 5
            },
            {
                key: 'ja',
                flagKey: 'jpn',
                name: 'Japanese',
                percent: 10,
                count: 2
            }
        ]);
    });
    it('does not invent counts or percentages for missing ratios', () => {
        expect(
            getInstanceLanguages({ languages: ['xx'], userCount: 10 })
        ).toEqual([
            { key: 'xx', flagKey: 'xx', name: 'xx', percent: null, count: null }
        ]);
        expect(getInstanceLanguages(null)).toEqual([]);
    });
});

describe('instance management', () => {
    it('requires VRC+ for personal rename and manage permission for groups', () => {
        expect(canManageInstance({ ownerId: 'usr_me' }, 'usr_me', false)).toBe(
            false
        );
        expect(canManageInstance({ ownerId: 'usr_me' }, 'usr_me', true)).toBe(
            true
        );
        expect(
            canManageInstance({ ownerId: 'usr_other' }, 'usr_me', true)
        ).toBe(false);
        expect(
            canManageInstance({ ownerId: 'grp_a' }, 'usr_me', false, {
                myMember: { permissions: ['group-instance-moderate'] }
            })
        ).toBe(false);
        expect(
            canManageInstance({ ownerId: 'grp_a' }, 'usr_me', false, {
                myMember: { permissions: ['group-instance-manage'] }
            })
        ).toBe(true);
    });
    it('only offers events within six hours of the current time', () => {
        const now = Date.parse('2026-10-19T12:00:00Z');
        const event = {
            id: 'evt_1',
            startsAt: '2026-10-19T13:00:00Z',
            endsAt: '2026-10-19T14:00:00Z'
        };
        expect(
            getLinkableInstanceEvents(
                [
                    event,
                    {
                        ...event,
                        id: 'future',
                        startsAt: '2026-10-20T12:00:00Z'
                    },
                    { ...event, id: 'bad', endsAt: 'invalid' }
                ],
                now
            )
        ).toEqual([event]);
    });
    it('only hides instances actually marked closed', () => {
        expect(
            isClosedInstance({ ref: { closedAt: null, active: false } })
        ).toBe(false);
        expect(isClosedInstance({ ref: { closedAt: '2026-10-19' } })).toBe(
            true
        );
    });
});
