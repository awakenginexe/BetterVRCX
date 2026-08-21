import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const mainFormPath = resolve(
    import.meta.dirname,
    '../../..',
    'Dotnet/Cef/MainForm.cs'
);
const designerPath = resolve(
    import.meta.dirname,
    '../../..',
    'Dotnet/Cef/MainForm.Designer.cs'
);
const appApiPath = resolve(
    import.meta.dirname,
    '../../..',
    'Dotnet/AppApi/Cef/AppApiCef.cs'
);
const appPath = resolve(import.meta.dirname, '../../..', 'src/App.vue');
const statusBarPath = resolve(
    import.meta.dirname,
    '../../..',
    'src/components/StatusBar.vue'
);

describe('native CEF title-bar contracts', () => {
    test('uses a borderless WinForms surface for the Vue title bar', () => {
        const designer = readFileSync(designerPath, 'utf8');

        expect(designer).toContain(
            'this.FormBorderStyle = FormBorderStyle.None;'
        );
    });

    test('retains native resize styles after removing the caption', () => {
        const mainForm = readFileSync(mainFormPath, 'utf8');

        expect(mainForm).toContain('WS_THICKFRAME');
        expect(mainForm).toContain(
            'protected override CreateParams CreateParams'
        );
    });

    test('exposes window actions through AppApiCef', () => {
        const appApi = readFileSync(appApiPath, 'utf8');
        const mainForm = readFileSync(mainFormPath, 'utf8');

        for (const method of [
            'BeginWindowDrag',
            'CloseWindow',
            'IsWindowMaximized',
            'MinimizeWindow',
            'ToggleMaximizeWindow'
        ]) {
            expect(appApi).toContain(`${method}()`);
            expect(mainForm).toContain(`${method}()`);
        }
    });

    test('embeds CEF status content in the title row and removes its standalone row', () => {
        const app = readFileSync(appPath, 'utf8');

        expect(app).toMatch(
            /<AppTitleBar[\s\S]*?<template #status>[\s\S]*?<StatusBar :embedded="true" \/>[\s\S]*?<\/template>[\s\S]*?<\/AppTitleBar>/
        );
        expect(app).toContain('v-if="!isMacOS && !isCefWindows"');
    });

    test('allows StatusBar to omit the duplicate product label when embedded', () => {
        const statusBar = readFileSync(statusBarPath, 'utf8');

        expect(statusBar).toContain('const props = defineProps');
        expect(statusBar).toContain('v-if="!props.embedded"');
    });
});
