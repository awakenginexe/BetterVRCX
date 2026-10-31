import { readFileSync, readdirSync } from 'node:fs';
import { expect, test } from 'vitest';
import { getWhatsNewRelease } from '../shared/constants/whatsNewReleases';

test('4.4.0 metadata and date-keyed release highlights agree across all locales', () => {
    const version = readFileSync('Version', 'utf8').trim();
    expect(version).toMatch(/^v4\.4\.0 B \d{4}\.\d{2}\.\d{2}$/);
    expect(JSON.parse(readFileSync('package.json', 'utf8')).version).toBe(
        '4.4.0'
    );
    const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
    expect(lock.version).toBe('4.4.0');
    expect(lock.packages[''].version).toBe('4.4.0');
    expect(readFileSync('Dotnet/Program.cs', 'utf8')).toContain(
        `BetterVRCX ${version}`
    );
    expect(
        readFileSync('CHANGELOG.md', 'utf8').replaceAll('\r\n', '\n')
    ).toContain('\n## 4.4.0\n');
    const release = getWhatsNewRelease(`BetterVRCX ${version}`);
    expect(release?.items.length).toBeGreaterThan(0);
    for (const locale of readdirSync('src/localization').filter((name) =>
        name.endsWith('.json')
    )) {
        const data = JSON.parse(
            readFileSync(`src/localization/${locale}`, 'utf8')
        );
        for (const key of [
            release.titleKey,
            release.subtitleKey,
            ...release.items.flatMap((item) => [
                item.titleKey,
                item.descriptionKey
            ])
        ]) {
            expect(
                key.split('.').reduce((object, part) => object?.[part], data),
                `${locale}: ${key}`
            ).toBeTruthy();
        }
    }
});
