import { createRequire } from 'node:module';
import { expect, test, vi } from 'vitest';

const require = createRequire(import.meta.url);
const {
    registerSystemTheme
} = require('../../../../src-electron/system-theme.js');

test('validates theme IPC, reports the native value and cleans up listeners', () => {
    const handlers = new Map();
    const ipcMain = {
        handle: (name, fn) => handlers.set(name, fn),
        removeHandler: vi.fn()
    };
    const nativeTheme = {
        themeSource: 'system',
        shouldUseDarkColors: true,
        on: vi.fn(),
        removeListener: vi.fn()
    };
    const window = { isDestroyed: () => false, webContents: { send: vi.fn() } };
    const dispose = registerSystemTheme(ipcMain, nativeTheme, () => window);
    const setSource = handlers.get('app:setThemeSource');
    expect(setSource({}, 'invalid')).toBeUndefined();
    expect(nativeTheme.themeSource).toBe('system');
    expect(setSource({}, 'system')).toBe(true);
    expect(window.webContents.send).toHaveBeenCalledWith(
        'systemThemeChanged',
        true
    );
    window.webContents.send.mockClear();
    setSource({}, 'dark');
    nativeTheme.on.mock.calls[0][1]();
    expect(window.webContents.send).not.toHaveBeenCalled();
    dispose();
    expect(nativeTheme.removeListener).toHaveBeenCalledWith(
        'updated',
        nativeTheme.on.mock.calls[0][1]
    );
    expect(ipcMain.removeHandler).toHaveBeenCalledWith('app:setThemeSource');
});

test('ignores theme changes when the main window is closed', () => {
    const ipcMain = { handle: vi.fn(), removeHandler: vi.fn() };
    const nativeTheme = {
        themeSource: 'system',
        on: vi.fn(),
        removeListener: vi.fn()
    };
    const window = { isDestroyed: () => true, webContents: { send: vi.fn() } };
    registerSystemTheme(ipcMain, nativeTheme, () => window);
    nativeTheme.on.mock.calls[0][1]();
    expect(window.webContents.send).not.toHaveBeenCalled();
});
