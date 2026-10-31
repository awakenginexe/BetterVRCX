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

test.skipIf(process.platform !== 'win32')(
    'generates numeric installer metadata and updater-compatible artifact names',
    () => {
        const root = mkdtempSync(join(tmpdir(), 'bettervrcx-version-'));
        try {
            mkdirSync(join(root, 'build-scripts'));
            mkdirSync(join(root, 'Installer'));
            copyFileSync(
                'build-scripts/write-version.ps1',
                join(root, 'build-scripts/write-version.ps1')
            );
            writeFileSync(join(root, 'Version'), 'v4.4.0 B 2026.10.31\n');
            const command = `& '${join(root, 'build-scripts/write-version.ps1').replaceAll("'", "''")}' | ConvertTo-Json -Compress`;
            const metadata = JSON.parse(
                execFileSync('pwsh', ['-NoProfile', '-Command', command], {
                    encoding: 'utf8'
                })
            );
            expect(metadata.SetupName).toBe('BetterVRCX_Setup_v4.4.0.exe');
            expect(metadata.ZipName).toBe('BetterVRCX_v4.4.0.zip');
            const definitions = readFileSync(
                join(root, 'Installer/version_define.nsh'),
                'utf8'
            );
            expect(definitions).toContain(
                'PRODUCT_VERSION_FROM_FILE "4.4.0.0"'
            );
            expect(definitions).toContain(
                'DISPLAY_VERSION_FROM_FILE "v4.4.0 B 2026.10.31"'
            );
            writeFileSync(join(root, 'Version'), '4.4.0');
            expect(() =>
                execFileSync('pwsh', ['-NoProfile', '-Command', command], {
                    stdio: 'pipe'
                })
            ).toThrow();
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    },
    30000
);
