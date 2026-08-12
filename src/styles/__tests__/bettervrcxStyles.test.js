import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, test } from 'vitest';

const stylesheetPath = resolve(import.meta.dirname, '..', 'bettervrcx.css');
const globalsPath = resolve(import.meta.dirname, '..', 'globals.css');

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

    test('aliases the existing theme variables and is imported by globals', () => {
        const stylesheet = readFileSync(stylesheetPath, 'utf8');
        const globals = readFileSync(globalsPath, 'utf8');

        expect(stylesheet).toContain('--background: var(--bv-bg-base)');
        expect(stylesheet).toContain('--sidebar: var(--bv-bg-rail)');
        expect(globals).toContain("@import './bettervrcx.css';");
    });
});
