import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const commonApiPath = resolve(root, 'Dotnet/AppApi/Common/AppApiCommon.cs');
const cefApiPath = resolve(root, 'Dotnet/AppApi/Cef/AppApiCef.cs');
const mainFormPath = resolve(root, 'Dotnet/Cef/MainForm.cs');
const electronMainPath = resolve(root, 'src-electron/main.js');

describe('app usage native lifecycle contracts', () => {
    test('exposes one process-scoped anonymous usage session without account or hardware fields', () => {
        const commonApi = readFileSync(commonApiPath, 'utf8');

        expect(commonApi).toContain('GetAppUsageSession()');
        expect(commonApi).toContain('Guid.NewGuid()');
        expect(commonApi).toContain('ToUnixTimeMilliseconds()');
        expect(commonApi).toMatch(/new\s*\{\s*sessionId\s*=/);
        expect(commonApi).toContain('startedAt =');
        expect(commonApi).toContain('platform =');
        expect(commonApi).not.toMatch(
            /GetAppUsageSession[\s\S]*?(username|account|hardware)/i
        );
    });

    test('asks the CEF renderer to flush only for a real close, with a bounded wait', () => {
        const mainForm = readFileSync(mainFormPath, 'utf8');
        const cefApi = readFileSync(cefApiPath, 'utf8');

        expect(mainForm).toContain('EvaluateScriptAsPromiseAsync');
        expect(mainForm).toContain(
            'return window.betterVrcxAppUsageClosing?.();'
        );
        expect(mainForm).toContain('TimeSpan.FromSeconds(1)');
        expect(mainForm).toContain('e.Cancel = true');
        expect(cefApi).toContain('FlushAppUsageClosing()');
    });

    test('flushes Electron main-window analytics during before-quit without touching the overlay', () => {
        const electronMain = readFileSync(electronMainPath, 'utf8');
        const beforeQuit = electronMain.slice(
            electronMain.indexOf("app.on('before-quit'")
        );

        expect(beforeQuit).toContain(
            'mainWindow.webContents.executeJavaScript'
        );
        expect(beforeQuit).toContain('betterVrcxAppUsageClosing?.()');
        expect(beforeQuit).toContain('setTimeout');
        expect(beforeQuit).not.toContain(
            'overlayWindow.webContents.executeJavaScript'
        );
    });
});
