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
        .toLowerCase();
}

describe('BetterVRCX stylesheet contract', () => {
    test('defines every approved semantic token', () => {
        const stylesheet = readFileSync(stylesheetPath, 'utf8');
        const tokenNames = [
            '--bv-bg-base',
            '--bv-bg-rail',
            '--bv-bg-surface',
            '--bv-bg-control',
            '--bv-bg-hover',
            '--bv-border',
            '--bv-accent',
            '--bv-accent-soft',
            '--bv-info',
            '--bv-success',
            '--bv-warning',
            '--bv-danger',
            '--bv-text-strong',
            '--bv-text-muted',
            '--bv-text-quiet',
            '--bv-offline'
        ];

        for (const tokenName of tokenNames) {
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

    test('provides the shared surface and state primitives', () => {
        const stylesheet = readFileSync(stylesheetPath, 'utf8');
        const selectors = [
            '.bv-surface',
            '.bv-surface-raised',
            '.bv-eyebrow',
            '.bv-status-dot',
            '.bv-badge',
            '.bv-focus-ring',
            '.bv-skeleton',
            '.bv-empty-state',
            '.bv-danger-zone'
        ];

        for (const selector of selectors) {
            expect(stylesheet).toContain(selector);
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
