import { execFileSync } from 'node:child_process';
import {
    copyFileSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';

test('a missing VirusTotal key never writes a scan badge or changes release claims', () => {
    const root = mkdtempSync(join(tmpdir(), 'bettervrcx-vt-'));
    try {
        mkdirSync(join(root, 'build-scripts'));
        mkdirSync(join(root, 'README'));
        copyFileSync(
            'build-scripts/virustotal-scan.mjs',
            join(root, 'build-scripts/virustotal-scan.mjs')
        );
        writeFileSync(join(root, 'fixture.exe'), 'scan fixture');
        writeFileSync(join(root, 'README.md'), 'existing release claims');
        const output = execFileSync(
            process.execPath,
            [
                join(root, 'build-scripts/virustotal-scan.mjs'),
                '--file=fixture.exe'
            ],
            {
                encoding: 'utf8',
                env: { ...process.env, VIRUSTOTAL_API_KEY: '', VT_API_KEY: '' }
            }
        );
        expect(output).toMatch(/not scanned|no verified scan/i);
        expect(existsSync(join(root, 'README/VirusTotal-BetterVRCX.svg'))).toBe(
            false
        );
        expect(readFileSync(join(root, 'README.md'), 'utf8')).toBe(
            'existing release claims'
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
