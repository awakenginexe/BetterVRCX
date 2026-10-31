import { execFileSync } from 'node:child_process';
import {
    copyFileSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';

test.each(['expression', 'file'])(
    'packages NuGet license metadata with a %s attribute',
    (type) => {
        const root = mkdtempSync(join(tmpdir(), 'bettervrcx-licenses-'));
        try {
            for (const directory of [
                'build-scripts/licenses',
                'Dotnet',
                'cache/fixture.package/1.0.0'
            ])
                mkdirSync(join(root, directory), { recursive: true });
            copyFileSync(
                'build-scripts/generate-third-party-licenses.js',
                join(root, 'build-scripts/generate-third-party-licenses.js')
            );
            writeFileSync(
                join(root, 'build-scripts/licenses/nuget-overrides.json'),
                '{}'
            );
            writeFileSync(
                join(root, 'Dotnet/Test.csproj'),
                '<Project><ItemGroup><PackageReference Include="Fixture.Package" Version="1.0.0" /></ItemGroup></Project>'
            );
            writeFileSync(
                join(
                    root,
                    'cache/fixture.package/1.0.0/fixture.package.nuspec'
                ),
                `<package><metadata><license type="${type}">${type === 'expression' ? 'MIT' : 'terms.txt'}</license></metadata></package>`
            );
            writeFileSync(
                join(root, 'cache/fixture.package/1.0.0/terms.txt'),
                'Fixture package license notice'
            );
            execFileSync(
                process.execPath,
                [join(root, 'build-scripts/generate-third-party-licenses.js')],
                {
                    env: {
                        ...process.env,
                        NUGET_PACKAGES: join(root, 'cache')
                    },
                    stdio: 'pipe'
                }
            );
            const manifest = JSON.parse(
                readFileSync(
                    join(root, 'build/html/licenses/third-party-licenses.json'),
                    'utf8'
                )
            );
            const entry = manifest.entries.find(
                (item) => item.name === 'Fixture.Package'
            );
            expect(entry.needsReview).toBe(false);
            if (type === 'expression') expect(entry.license).toBe('MIT');
            else
                expect(
                    readFileSync(
                        join(
                            root,
                            'build/html/licenses/THIRD_PARTY_NOTICES.txt'
                        ),
                        'utf8'
                    )
                ).toContain('Fixture package license notice');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    }
);
