import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

const workflow = readFileSync('.github/workflows/github_actions.yml', 'utf8');
const releaseJob = workflow.slice(workflow.indexOf('\n  release:'));

describe('release workflow', () => {
    test('reserves all 4.4.0 release mutations for the approved local publisher', () => {
        const jobHeader = releaseJob.slice(
            0,
            releaseJob.indexOf('\n    steps:')
        );
        expect(jobHeader).toContain(
            "needs.set_version.outputs.tag != 'v4.4.0'"
        );
        expect(jobHeader).toContain('&& (');
    });
    test('repairs release assets without deleting successful uploads', () => {
        expect(releaseJob).toContain('name: Upload release assets safely');
        expect(releaseJob).toContain('gh release upload');
        expect(releaseJob).toContain('existing_assets');
        expect(releaseJob).toContain('for attempt in 1 2 3');
        expect(releaseJob).not.toContain('files: |');
        expect(releaseJob).not.toContain('generate_release_notes: true');
    });
});
