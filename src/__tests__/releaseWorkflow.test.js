import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

const workflow = readFileSync('.github/workflows/github_actions.yml', 'utf8');
const releaseJob = workflow.slice(workflow.indexOf('\n  release:'));

describe('release workflow', () => {
    test('repairs release assets without deleting successful uploads', () => {
        expect(releaseJob).toContain('name: Upload release assets safely');
        expect(releaseJob).toContain('gh release upload');
        expect(releaseJob).toContain('existing_assets');
        expect(releaseJob).toContain('for attempt in 1 2 3');
        expect(releaseJob).not.toContain('files: |');
        expect(releaseJob).not.toContain('generate_release_notes: true');
    });
});
