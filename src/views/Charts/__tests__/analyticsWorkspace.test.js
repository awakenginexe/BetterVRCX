import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, test } from 'vitest';

const componentsRoot = resolve(import.meta.dirname, '..', 'components');

function readComponent(name) {
    return readFileSync(resolve(componentsRoot, name), 'utf8');
}

describe('analytics workspace contracts', () => {
    test('groups Instance Activity date and filter controls in an accessible analytics toolbar', () => {
        const instanceActivity = readComponent('InstanceActivity.vue');

        expect(instanceActivity).toContain(
            'data-testid="instance-activity-toolbar"'
        );
        expect(instanceActivity).toContain(
            'data-testid="instance-activity-date-controls"'
        );
        expect(instanceActivity).toContain('analytics-workspace__filters');
        expect(instanceActivity).toContain('handleCalendarModelUpdate');
    });

    test('keeps Mutual Friends cancellation explicit while fetch progress is active', () => {
        const mutualFriends = readComponent('MutualFriends.vue');

        expect(mutualFriends).toContain('data-testid="mutual-friends-cancel"');
        expect(mutualFriends).toContain('aria-live="polite"');
        expect(mutualFriends).toContain(
            'chartsStore.requestMutualGraphCancel()'
        );
    });

    test('makes Hot Worlds detail activation a first-class analytics action', () => {
        const hotWorlds = readComponent('HotWorlds.vue');

        expect(hotWorlds).toContain('data-testid="hot-worlds-ranking"');
        expect(hotWorlds).toContain('data-testid="hot-worlds-open-detail"');
        expect(hotWorlds).toContain('@click="openDetail(world)"');
    });
});
