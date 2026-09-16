import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { navDefinitions } from '../../../shared/constants/ui';
import { createBaseDefaultNavLayout } from '../../../components/nav-menu/navLayoutDefaults';
import { sanitizeLayout } from '../../../components/nav-menu/navMenuUtils';
import { triggerNavEntryAction } from '../../../components/nav-menu/navActionUtils';
const keys = ['world-recent', 'world-updated', 'world-library'];
const map = new Map(navDefinitions.map((d) => [d.key, d]));
it('World folder offers three independent pages and keeps Favorite Worlds', () => {
    expect(
        createBaseDefaultNavLayout((k) => k).find(
            (e) => e.id === 'default-folder-world'
        )
    ).toMatchObject({ type: 'folder', items: keys });
    for (const key of keys) {
        const router = { push: vi.fn() };
        triggerNavEntryAction(
            navDefinitions.find((d) => d.key === key),
            { router, directAccessPaste: vi.fn() }
        );
        expect(router.push).toHaveBeenCalledWith({ name: key });
    }
    const source = readFileSync('src/plugins/router.js', 'utf8');
    for (const key of keys) expect(source).toContain(`name: '${key}'`);
    expect(source).toContain("name: 'favorite-worlds'");
});
it('migrates the saved single World entry to a folder in place', () => {
    const layout = sanitizeLayout(
        [
            { type: 'item', key: 'feed' },
            { type: 'item', key: 'world' }
        ],
        [],
        map,
        navDefinitions,
        (k) => k,
        () => 'id'
    );
    expect(layout[1]).toMatchObject({
        id: 'default-folder-world',
        items: keys
    });
});
it('adds the World folder to older layouts while respecting custom child placement', () => {
    const layout = sanitizeLayout(
        [{ type: 'item', key: 'feed' }],
        [],
        map,
        navDefinitions,
        (k) => k,
        () => 'id'
    );
    expect(layout.find((e) => e.id === 'default-folder-world')).toMatchObject({
        items: keys
    });
    const custom = sanitizeLayout(
        [{ type: 'folder', id: 'mine', items: keys }],
        [],
        map,
        navDefinitions,
        (k) => k,
        () => 'id'
    );
    expect(
        custom
            .filter((e) => e.type === 'folder')
            .flatMap((e) => e.items)
            .filter((k) => keys.includes(k))
    ).toEqual(keys);
});
it('preserves the old hidden World preference', () => {
    const layout = sanitizeLayout(
        [],
        ['world'],
        map,
        navDefinitions,
        (k) => k,
        () => 'id'
    );
    expect(
        layout
            .flatMap((e) => e.items || [e.key])
            .filter((k) => keys.includes(k))
    ).toEqual([]);
});

it('places World immediately below Social by default', () => {
    const layout = createBaseDefaultNavLayout((k) => k);
    const social = layout.findIndex((e) => e.id === 'default-folder-social');
    expect(layout[social + 1].id).toBe('default-folder-world');
});

it('does not offer the removed Discovery page', () => {
    expect(navDefinitions.some((d) => d.key === 'world-discovery')).toBe(false);
});
