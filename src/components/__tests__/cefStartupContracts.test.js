import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const startupArgsPath = resolve(
    import.meta.dirname,
    '../../..',
    'Dotnet/StartupArgs.cs'
);
const launchConfigPath = resolve(
    import.meta.dirname,
    '../../..',
    '.vscode/launch.json'
);

describe('CEF startup contracts', () => {
    test('only enables debug mode when the explicit debug argument is supplied', () => {
        const startupArgs = readFileSync(startupArgsPath, 'utf8');

        expect(startupArgs).not.toContain(
            'Debug.Assert(Program.LaunchDebug = true)'
        );
        expect(startupArgs).toContain('if (LaunchArguments.IsDebug)');
    });

    test('recognizes the BetterVRCX process for duplicate-instance detection', () => {
        const startupArgs = readFileSync(startupArgsPath, 'utf8');

        expect(startupArgs).toContain(
            'Process.GetProcessesByName("BetterVRCX")'
        );
    });

    test('does not pass the unsupported no-sandbox flag to Electron debug', () => {
        const launchConfig = readFileSync(launchConfigPath, 'utf8');

        expect(launchConfig).not.toContain('"--no-sandbox"');
    });
});
