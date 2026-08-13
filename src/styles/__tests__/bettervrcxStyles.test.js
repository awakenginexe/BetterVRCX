import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, test } from 'vitest';

import { BETTERVRCX_DESIGN_TOKENS } from '../../shared/constants/bettervrcxDesign';

const stylesheetPath = resolve(import.meta.dirname, '..', 'bettervrcx.css');
const globalsPath = resolve(import.meta.dirname, '..', 'globals.css');

function canonicalizeCssValue(value) {
    return value
        .replaceAll(/\s/g, '')
        .replaceAll(/(?<!\d)0\.(\d+)/g, '.$1')
        .replaceAll(/(\.\d*?)0+(?=[,\);%]|$)/g, '$1')
        .toLowerCase();
}

describe('BetterVRCX stylesheet contract', () => {
    test('defines every approved semantic token', () => {
        const stylesheet = readFileSync(stylesheetPath, 'utf8');

        for (const tokenName of Object.keys(BETTERVRCX_DESIGN_TOKENS)) {
            expect(stylesheet).toMatch(new RegExp(`${tokenName}\\s*:`));
        }
    });

    test('keeps stylesheet token values synchronized with the approved token module', () => {
        const stylesheet = canonicalizeCssValue(
            readFileSync(stylesheetPath, 'utf8')
        );

        for (const [tokenName, tokenValue] of Object.entries(
            BETTERVRCX_DESIGN_TOKENS
        )) {
            expect(stylesheet).toContain(
                canonicalizeCssValue(`${tokenName}:${tokenValue}`)
            );
        }
    });

    test('provides the shared surface hierarchy tiers', () => {
        const stylesheet = readFileSync(stylesheetPath, 'utf8');
        const selectors = [
            '.bv-surface',
            '.bv-surface-base',
            '.bv-surface-raised',
            '.bv-surface-floating',
            '.bv-surface-overlay'
        ];

        for (const selector of selectors) {
            expect(stylesheet).toContain(selector);
        }
    });

    test('provides typography hierarchy utilities', () => {
        const stylesheet = readFileSync(stylesheetPath, 'utf8');
        const typographyClasses = [
            '.bv-type-display',
            '.bv-type-h1',
            '.bv-type-h2',
            '.bv-type-h3',
            '.bv-type-body',
            '.bv-type-body-compact',
            '.bv-eyebrow',
            '.bv-type-caption',
            '.bv-type-mono'
        ];

        for (const cls of typographyClasses) {
            expect(stylesheet).toContain(cls);
        }
    });

    test('provides standard iconography helpers', () => {
        const stylesheet = readFileSync(stylesheetPath, 'utf8');
        const iconClasses = [
            '.bv-icon-xs',
            '.bv-icon-sm',
            '.bv-icon-md',
            '.bv-icon-lg'
        ];

        for (const cls of iconClasses) {
            expect(stylesheet).toContain(cls);
        }
    });

    test('provides orthogonal interactive state classes', () => {
        const stylesheet = readFileSync(stylesheetPath, 'utf8');
        const stateSelectors = [
            '.bv-interactive',
            '.bv-interactive--hover',
            '.bv-interactive--pressed',
            '.bv-interactive--selected',
            '.bv-interactive--expanded',
            '.bv-interactive--disabled',
            '.bv-focus-ring'
        ];

        for (const selector of stateSelectors) {
            expect(stylesheet).toContain(selector);
        }
    });

    test('provides motion transition classes for Vue transitions', () => {
        const stylesheet = readFileSync(stylesheetPath, 'utf8');
        const motionClasses = [
            '.bv-transition-fade-enter-active',
            '.bv-transition-fade-leave-active',
            '.bv-transition-scale-enter-active',
            '.bv-transition-scale-leave-active',
            '.bv-transition-slide-up-enter-active',
            '.bv-transition-slide-up-leave-active',
            '.bv-transition-slide-down-enter-active',
            '.bv-transition-slide-down-leave-active',
            '.bv-transition-dialog-enter-active',
            '.bv-transition-dialog-leave-active'
        ];

        for (const cls of motionClasses) {
            expect(stylesheet).toContain(cls);
        }
    });

    test('keeps accessibility and motion safeguards local to the primitives', () => {
        const stylesheet = readFileSync(stylesheetPath, 'utf8');

        expect(stylesheet).toContain(':focus-visible');
        expect(stylesheet).toContain('@media (prefers-reduced-motion: reduce)');
        expect(stylesheet).toContain('.bv-status-dot[data-status=');
    });

    test('documents labels and non-color cues for every status-dot state', () => {
        const stylesheet = readFileSync(stylesheetPath, 'utf8');

        // Consumers pair the primitive with visible status text or an aria-label.
        expect(stylesheet).toContain('aria-label');
        expect(stylesheet).toMatch(
            /\.bv-status-dot\s*\{[^}]*background-color:\s*transparent/
        );
        expect(stylesheet).toMatch(
            /\.bv-status-dot\[data-status='online'\][^{]*\{[^}]*border-radius:\s*999px/
        );
        const onlineRule = stylesheet.match(
            /\.bv-status-dot\[data-status='online'\]\s*,\s*\.bv-status-dot\[data-status='success'\]\s*\{([\s\S]*?)\}/
        );
        expect(onlineRule).not.toBeNull();
        expect(onlineRule[1]).toContain(
            'background-color: var(--bv-status-color)'
        );
        expect(onlineRule[1]).toContain('box-shadow: 0 0 0 2px');
        expect(stylesheet).toMatch(
            /\.bv-status-dot\[data-status='joinme'\][^{]*\{[^}]*transform:\s*rotate\(45deg\)/
        );
        expect(stylesheet).toMatch(
            /\.bv-status-dot\[data-status='askme'\][^{]*\{[^}]*repeating-linear-gradient/
        );
        expect(stylesheet).toMatch(
            /\.bv-status-dot\[data-status='busy'\][^{]*\{[^}]*border-radius:\s*2px/
        );
    });

    test('aliases the existing theme variables and is imported by globals', () => {
        const stylesheet = readFileSync(stylesheetPath, 'utf8');
        const globals = readFileSync(globalsPath, 'utf8');

        expect(stylesheet).toContain('--background: var(--bv-bg-base)');
        expect(stylesheet).toContain('--sidebar: var(--bv-bg-rail)');
        expect(globals).toContain("@import './bettervrcx.css';");
    });
});
