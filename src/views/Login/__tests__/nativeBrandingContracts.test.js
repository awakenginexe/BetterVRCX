import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, test } from 'vitest';

const sourceRoot = resolve(import.meta.dirname, '..', '..', '..');
const workspaceRoot = resolve(sourceRoot, '..');

function readSource(...segments) {
    return readFileSync(resolve(sourceRoot, ...segments), 'utf8');
}

describe('Task 9 native and BetterVRCX branding contracts', () => {
    test('renders the BetterVRCX login frame without replacing auth actions', () => {
        const source = readSource('views', 'Login', 'Login.vue');

        expect(source).toContain('bv-login-frame');
        expect(source).toContain('BetterVRCX');
        expect(source).toContain('@submit.prevent="onSubmit"');
        expect(source).toContain('@click="clickSavedLogin(user)"');
        expect(source).toContain('router.replace(postLoginRedirect())');
        expect(source).toContain('showVRCXUpdateDialog');
    });

    test('keeps the separately-built VR entry and overlay update queue', () => {
        const viteSource = readSource('vite.config.js');
        const vrEntry = readSource('vr.html');
        const vrSource = readSource('vr', 'Vr.vue');

        expect(viteSource).toContain(
            "vr: resolve(import.meta.dirname, './vr.html')"
        );
        expect(vrEntry).toContain(
            '<script type="module" src="./vr/vr.js"></script>'
        );
        expect(vrSource).toContain('window.$vr.configUpdate = configUpdate');
        expect(vrSource).toContain(
            'AppApiVr.GetExecuteVrOverlayFunctionQueue()'
        );
        expect(vrSource).toContain(
            'workerTimers.setTimeout(() => updateVrElectronLoop(), 500)'
        );
    });

    test('constrains both overlay frames without changing their native dimensions', () => {
        const stylesheet = readSource('vr', 'vr.css');

        expect(stylesheet).toContain('.bv-vr-overlay-frame');
        expect(stylesheet).toMatch(/\.wrist\s*\{[\s\S]*?width:\s*512px/);
        expect(stylesheet).toMatch(/\.hmd\s*\{[\s\S]*?width:\s*1024px/);
    });

    test('preserves Electron and metadata compatibility identifiers', () => {
        const packageJson = readFileSync(
            resolve(workspaceRoot, 'package.json'),
            'utf8'
        );
        const mainSource = readFileSync(
            resolve(workspaceRoot, 'src-electron', 'main.js'),
            'utf8'
        );
        const preloadSource = readFileSync(
            resolve(workspaceRoot, 'src-electron', 'preload.js'),
            'utf8'
        );

        expect(packageJson).toContain('"name": "VRCX"');
        expect(packageJson).toContain('"appId": "app.vrcx"');
        expect(mainSource).toContain("const VRCX_URI_PREFIX = 'vrcx'");
        expect(mainSource).toMatch(/ipcMain\.handle\(\s*'app:updateVr'/);
        expect(mainSource).toContain("ipcMain.handle('app:getOverlayWindow'");
        expect(preloadSource).toMatch(/ipcRenderer\.invoke\(\s*'app:updateVr'/);
        expect(preloadSource).toContain(
            "ipcRenderer.invoke('app:getOverlayWindow')"
        );
    });
});
