import { describe, expect, test } from 'vitest';
import {
    getProfileIconUpdate,
    getProfileCosmeticUpdate,
    getOwnedCosmetics
} from '../editProfilePayload';

describe('getProfileIconUpdate', () => {
    test('maps a changed iconUrl back to the userIcon update payload field', () => {
        expect(
            getProfileIconUpdate('https://example.com/new-icon.png', {
                iconUrl: 'https://example.com/old-icon.png'
            })
        ).toEqual({ userIcon: 'https://example.com/new-icon.png' });
    });

    test('omits userIcon when iconUrl is unchanged', () => {
        expect(
            getProfileIconUpdate('https://example.com/icon.png', {
                iconUrl: 'https://example.com/icon.png'
            })
        ).toEqual({});
    });
});

describe('owned profile cosmetics', () => {
    const inventory = [
        {
            id: 'inv_profile',
            itemType: 'profileEffect',
            templateId: 'cos_profile'
        },
        { id: 'inv_frame', itemType: 'iconFrame', templateId: 'cos_frame' },
        {
            id: 'inv_nameplate',
            itemType: 'nameplateEffect',
            templateId: 'cos_nameplate'
        }
    ];
    test('saves owned selections and removes an existing effect', () => {
        expect(
            getProfileCosmeticUpdate(
                {
                    profileEffect: 'cos_profile',
                    nameplateEffect: '',
                    iconFrame: 'cos_frame',
                    selfProfileRef: { nameplateEffect: 'cos_old' }
                },
                inventory
            )
        ).toEqual({
            profileEffect: 'cos_profile',
            nameplateEffect: '',
            iconFrame: 'cos_frame'
        });
    });
    test('leaves unchanged effects out of the update', () => {
        expect(
            getProfileCosmeticUpdate(
                {
                    profileEffect: 'cos_existing',
                    selfProfileRef: { profileEffect: 'cos_existing' }
                },
                []
            )
        ).toEqual({});
    });
    test('rejects a new effect that is not owned', () => {
        expect(() =>
            getProfileCosmeticUpdate(
                { iconFrame: 'cos_unowned', selfProfileRef: {} },
                inventory
            )
        ).toThrow();
    });
    test('lists each active owned template only once', () => {
        expect(
            getOwnedCosmetics(
                [
                    ...inventory,
                    inventory[0],
                    {
                        itemType: 'profileEffect',
                        templateId: 'cos_archived',
                        isArchived: true
                    }
                ],
                'profileEffect'
            )
        ).toEqual([inventory[0]]);
    });
});
