import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Session 6 UI & Performance Contracts', () => {
    const session6Files = [
        'src/views/Tools/Tools.vue',
        'src/views/Tools/components/ToolItem.vue',
        'src/views/Tools/ScreenshotMetadata.vue',
        'src/views/Tools/Gallery.vue',
        'src/views/Settings/Settings.vue',
        'src/views/Settings/components/SettingsGroup.vue',
        'src/views/Settings/components/SettingsItem.vue',
        'src/views/Settings/components/WristOverlaySettings.vue',
        'src/views/Settings/components/Tabs/SystemTab.vue',
        'src/views/Settings/components/Tabs/InterfaceTab.vue',
        'src/views/Settings/components/Tabs/SocialTab.vue',
        'src/views/Settings/components/Tabs/NotificationsTab.vue',
        'src/views/Settings/components/Tabs/VrTab.vue',
        'src/views/Settings/components/Tabs/MediaTab.vue',
        'src/views/Settings/components/Tabs/IntegrationsTab.vue',
        'src/views/Settings/components/Tabs/AdvancedTab.vue',
        'src/views/Login/Login.vue',
        'src/views/Login/Dialog/LoginSettingsDialog.vue',
        'src/components/onboarding/WhatsNewDialog.vue',
        'src/components/onboarding/SpotlightDialog.vue'
    ];

    it('enforces zero transition-all in all touched Session 6 files', () => {
        for (const relPath of session6Files) {
            const fullPath = path.resolve(process.cwd(), relPath);
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                expect(content).not.toMatch(/transition-all/);
                expect(content).not.toMatch(/transition:\s*all/);
            }
        }
    });

    it('enforces zero hover translateY bounce in all touched Session 6 files', () => {
        for (const relPath of session6Files) {
            const fullPath = path.resolve(process.cwd(), relPath);
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                expect(content).not.toMatch(/hover:-translate/);
                expect(content).not.toMatch(/hover\s*\{[^}]*translateY/);
                expect(content).not.toMatch(/:hover[^{]*\{[^}]*translateY\(-/);
                expect(content).not.toMatch(/:hover[^{]*\{[^}]*scale\(/);
            }
        }
    });

    it('preserves all 8 Settings tab components in Settings.vue', () => {
        const settingsPath = path.resolve(
            process.cwd(),
            'src/views/Settings/Settings.vue'
        );
        const content = fs.readFileSync(settingsPath, 'utf8');

        expect(content).toContain("key: 'system'");
        expect(content).toContain("key: 'interface'");
        expect(content).toContain("key: 'social'");
        expect(content).toContain("key: 'notifications'");
        expect(content).toContain("key: 'vr'");
        expect(content).toContain("key: 'media'");
        expect(content).toContain("key: 'integrations'");
        expect(content).toContain("key: 'advanced'");
    });

    it('ensures SettingsItem intent validation supports all semantic intents', () => {
        const itemPath = path.resolve(
            process.cwd(),
            'src/views/Settings/components/SettingsItem.vue'
        );
        const content = fs.readFileSync(itemPath, 'utf8');

        expect(content).toContain("'immediate'");
        expect(content).toContain("'restart'");
        expect(content).toContain("'platform'");
        expect(content).toContain("'credential'");
        expect(content).toContain("'destructive'");
    });

    it('ensures SettingsGroup tone validation supports all semantic tones', () => {
        const groupPath = path.resolve(
            process.cwd(),
            'src/views/Settings/components/SettingsGroup.vue'
        );
        const content = fs.readFileSync(groupPath, 'utf8');

        expect(content).toContain("'default'");
        expect(content).toContain("'warning'");
        expect(content).toContain("'danger'");
        expect(content).toContain("'credential'");
        expect(content).toContain("'platform'");
    });

    it('ensures Login.vue preserves authentication form and saved account bindings', () => {
        const loginPath = path.resolve(
            process.cwd(),
            'src/views/Login/Login.vue'
        );
        const content = fs.readFileSync(loginPath, 'utf8');

        expect(content).toContain('name="username"');
        expect(content).toContain('name="password"');
        expect(content).toContain('v-model="loginForm.saveCredentials"');
        expect(content).toContain('clickSavedLogin');
        expect(content).toContain('clickDeleteSavedLogin');
        expect(content).toContain('onSubmit');
        expect(content).toContain('detectAndPromptLanguage');
    });
});
