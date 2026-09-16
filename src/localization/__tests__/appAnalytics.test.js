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
const keys = ['title', 'description'];

describe('app analytics localization', () => {
    test('provides matching title, description, and placeholders in all locales', () => {
        const english = messages.en.app_analytics;
        for (const locale of languageCodes) {
            const section = messages[locale].app_analytics;
            expect(section, locale).toBeDefined();
            expect(Object.keys(section).sort(), locale).toEqual(
                [...keys].sort()
            );
            for (const key of keys) {
                expect(section[key], `${locale}.app_analytics.${key}`).toEqual(
                    expect.any(String)
                );
                expect(section[key], `${locale}.app_analytics.${key}`).not.toBe(
                    ''
                );
                expect(
                    section[key].match(/\{[^}]+\}/g) ?? [],
                    `${locale}.${key}`
                ).toEqual(english[key].match(/\{[^}]+\}/g) ?? []);
            }
        }
    });

    test('keeps the English analytics disclosure exact', () => {
        expect(en.app_analytics).toEqual({
            title: 'App usage analytics',
            description:
                'Sends app starts, a heartbeat every 10 minutes, and session duration to Amplitude (EU), using a random installation ID. Does not send your VRChat account, friends, locations, messages, or screen contents. Turn off to stop sending usage events.'
        });
    });
});
