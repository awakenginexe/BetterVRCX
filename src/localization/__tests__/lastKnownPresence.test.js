import { describe, expect, test } from 'vitest';

import { languageCodes } from '../locales';
import cs from '../cs.json';
import en from '../en.json';
import es from '../es.json';
import fr from '../fr.json';
import hu from '../hu.json';
import ja from '../ja.json';
import ko from '../ko.json';
import pl from '../pl.json';
import pt from '../pt.json';
import ru from '../ru.json';
import th from '../th.json';
import vi from '../vi.json';
import zhCN from '../zh-CN.json';
import zhTW from '../zh-TW.json';

const messages = {
    cs,
    en,
    es,
    fr,
    hu,
    ja,
    ko,
    pl,
    pt,
    ru,
    th,
    vi,
    'zh-CN': zhCN,
    'zh-TW': zhTW
};
const keys = [
    'title',
    'description',
    'last_seen',
    'last_seen_here',
    'might_be_here',
    'last_known_instance',
    'last_seen_friends',
    'uncertain',
    'empty',
    'instance',
    'last_seen_count'
];

describe('last known presence localization', () => {
    test('provides every key and matching placeholders in all supported locales', () => {
        const english = messages.en.last_known_presence;

        for (const locale of languageCodes) {
            const section = messages[locale].last_known_presence;
            expect(section, locale).toBeDefined();
            expect(Object.keys(section).sort(), locale).toEqual(
                [...keys].sort()
            );

            for (const key of keys) {
                expect(section[key], `${locale}.${key}`).toEqual(
                    expect.any(String)
                );
                expect(section[key], `${locale}.${key}`).not.toBe('');
                expect(
                    section[key].match(/\{[^}]+\}/g) ?? [],
                    `${locale}.${key}`
                ).toEqual(english[key].match(/\{[^}]+\}/g) ?? []);
            }
        }
    });

    test('documents session-only uncertainty in the English copy', () => {
        expect(en.last_known_presence.description).toBe(
            'Temporarily remembers the last known location of friends whose VRChat location becomes private while using Ask Me or Do Not Disturb. Information is stored in memory only and is cleared when BetterVRCX closes. A last-known location does not confirm that the friend is still there.'
        );
        expect(en.last_known_presence.uncertain).toBe(
            'Last known location during this BetterVRCX session. The user may no longer be here.'
        );
        expect(en.last_known_presence.last_seen_friends).toBe(
            'Last seen friends'
        );
        expect(en.last_known_presence.last_seen_count).toBe(
            '{count} last seen'
        );
    });
});
