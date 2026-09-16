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
    'description',
    'recent',
    'updated',
    'library',
    'refresh',
    'unavailable',
    'loading',
    'empty_recent',
    'empty_updated',
    'empty_library',
    'visits',
    'hours',
    'last_visit'
];

describe('world hub localization', () => {
    test('provides every key and matching placeholders in all supported locales', () => {
        const english = messages.en.world_hub;

        for (const locale of languageCodes) {
            const localeMessages = messages[locale];
            expect(
                localeMessages.nav_tooltip.world,
                `${locale}.nav_tooltip.world`
            ).toEqual(expect.any(String));
            expect(
                localeMessages.nav_desc.world,
                `${locale}.nav_desc.world`
            ).toEqual(expect.any(String));

            const section = localeMessages.world_hub;
            expect(section, locale).toBeDefined();
            expect(Object.keys(section).sort(), locale).toEqual(
                [...keys].sort()
            );

            for (const key of keys) {
                expect(section[key], `${locale}.world_hub.${key}`).toEqual(
                    expect.any(String)
                );
                expect(section[key], `${locale}.world_hub.${key}`).not.toBe('');
                expect(
                    section[key].match(/\{[^}]+\}/g) ?? [],
                    `${locale}.world_hub.${key}`
                ).toEqual(english[key].match(/\{[^}]+\}/g) ?? []);
            }
        }
    });

    test('keeps the English World Hub copy exact', () => {
        expect(en.nav_tooltip.world).toBe('World');
        expect(en.nav_desc.world).toBe(
            'Personal worlds, history, and favorites'
        );
        expect(en.world_hub).toEqual({
            description: 'Your personal world history and favorites.',
            recent: 'Recently Visited',
            updated: 'Updated Favorites',
            library: 'Favorites / Library',
            refresh: 'Refresh',
            unavailable:
                'Some information could not be refreshed. Cached information remains available.',
            loading: 'Loading…',
            empty_recent: 'No recently visited worlds.',
            empty_updated:
                'No favorite updates detected. Initial metadata establishes a baseline.',
            empty_library: 'No favorite worlds yet.',
            visits: '{count} visits',
            hours: '{count} h',
            last_visit: 'Last visit:'
        });
    });
});
