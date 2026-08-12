import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, test } from 'vitest';

const dashboardPath = resolve(import.meta.dirname, '..', 'Dashboard.vue');
const rowPath = resolve(
    import.meta.dirname,
    '..',
    'components',
    'DashboardRow.vue'
);
const selectorPath = resolve(
    import.meta.dirname,
    '..',
    'components',
    'PanelSelector.vue'
);

function read(path) {
    return readFileSync(path, 'utf8');
}

describe('dashboard workspace contracts', () => {
    test('keeps edit save and cancel actions inside a distinct builder canvas', () => {
        const dashboard = read(dashboardPath);

        expect(dashboard).toContain('data-testid="dashboard-builder"');
        expect(dashboard).toContain('handleSave');
        expect(dashboard).toContain('handleCancelEdit');
        expect(dashboard).toContain('cloneRows(dashboard.value.rows)');
    });

    test('keeps panel selection discoverable in the builder canvas', () => {
        const selector = read(selectorPath);

        expect(selector).toContain('data-testid="dashboard-panel-selector"');
        expect(selector).toContain('data-panel-key="option.key"');
        expect(selector).toContain("emit('select', option.key)");
    });

    test('exposes one and two panel split direction as a row layout contract', () => {
        const row = read(rowPath);

        expect(row).toContain('data-testid="dashboard-row"');
        expect(row).toContain(':data-direction="row.direction"');
        expect(row).toContain(
            ":direction=\"isVertical ? 'vertical' : 'horizontal'\""
        );
    });
});
