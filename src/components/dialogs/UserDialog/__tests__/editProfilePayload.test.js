import { describe, expect, test } from 'vitest';
import { getProfileIconUpdate } from '../editProfilePayload';

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
