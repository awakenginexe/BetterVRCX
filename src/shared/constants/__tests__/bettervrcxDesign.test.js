import { describe, expect, test } from 'vitest';

import { BETTERVRCX_DESIGN_TOKENS } from '../bettervrcxDesign';

const APPROVED_TOKENS = {
    '--bv-accent-h': '228',
    '--bv-accent-s': '100%',
    '--bv-accent-l': '68%',
    '--bv-accent-primary':
        'hsl(var(--bv-accent-h), var(--bv-accent-s), var(--bv-accent-l))',
    '--bv-accent-hover':
        'hsl(var(--bv-accent-h), var(--bv-accent-s), calc(var(--bv-accent-l) + 6%))',
    '--bv-accent-active':
        'hsl(var(--bv-accent-h), var(--bv-accent-s), calc(var(--bv-accent-l) - 6%))',
    '--bv-accent-muted': 'hsl(var(--bv-accent-h), 40%, 65%)',
    '--bv-accent-soft':
        'hsla(var(--bv-accent-h), var(--bv-accent-s), var(--bv-accent-l), 0.14)',
    '--bv-accent-subtle':
        'hsla(var(--bv-accent-h), var(--bv-accent-s), var(--bv-accent-l), 0.08)',
    '--bv-accent-glow':
        '0 0 16px hsla(var(--bv-accent-h), var(--bv-accent-s), var(--bv-accent-l), 0.28)',

    '--bv-bg-base': '#07080a',
    '--bv-bg-rail': '#0c0e12',
    '--bv-bg-surface-base': '#0d0f14',
    '--bv-bg-surface-raised': '#14171f',
    '--bv-bg-surface-floating': '#181c26',
    '--bv-bg-surface-overlay': '#1c212e',
    '--bv-bg-control': '#12151c',
    '--bv-bg-control-hover': '#1b202a',
    '--bv-bg-control-active': '#232a38',

    '--bv-text-strong': '#f1f5f9',
    '--bv-text-regular': '#cbd5e1',
    '--bv-text-muted': '#94a3b8',
    '--bv-text-quiet': '#64748b',

    '--bv-border-subtle': 'rgba(255, 255, 255, 0.05)',
    '--bv-border-default': 'rgba(255, 255, 255, 0.09)',
    '--bv-border-strong': 'rgba(255, 255, 255, 0.16)',

    '--bv-status-online': '#2dd48c',
    '--bv-status-joinme': '#38bdf8',
    '--bv-status-askme': '#fbbf24',
    '--bv-status-busy': '#f43f5e',
    '--bv-status-offline': '#64748b',

    '--bv-radius-xs': '4px',
    '--bv-radius-sm': '6px',
    '--bv-radius-md': '8px',
    '--bv-radius-lg': '12px',
    '--bv-radius-xl': '16px',
    '--bv-radius-full': '9999px',

    '--bv-shadow-sm': '0 2px 8px rgba(0, 0, 0, 0.25)',
    '--bv-shadow-md': '0 4px 16px rgba(0, 0, 0, 0.32)',
    '--bv-shadow-lg': '0 8px 24px rgba(0, 0, 0, 0.4)',
    '--bv-shadow-overlay': '0 24px 64px rgba(0, 0, 0, 0.65)',

    '--bv-blur-sm': '8px',
    '--bv-blur-md': '12px',
    '--bv-blur-lg': '16px',
    '--bv-blur-xl': '20px',

    '--bv-space-1': '2px',
    '--bv-space-2': '4px',
    '--bv-space-3': '6px',
    '--bv-space-4': '8px',
    '--bv-space-5': '12px',
    '--bv-space-6': '16px',
    '--bv-space-7': '24px',
    '--bv-space-8': '32px',

    '--bv-row-height-high-velocity': '28px',
    '--bv-row-height-compact': '34px',
    '--bv-row-height-comfortable': '44px',

    '--bv-ease-spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
    '--bv-ease-out': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    '--bv-ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
    '--bv-duration-instant': '75ms',
    '--bv-duration-fast': '150ms',
    '--bv-duration-normal': '220ms',
    '--bv-duration-slow': '300ms'
};

describe('BETTERVRCX_DESIGN_TOKENS', () => {
    test('exports the approved semantic token names and values', () => {
        expect(BETTERVRCX_DESIGN_TOKENS).toEqual(APPROVED_TOKENS);
    });
});
