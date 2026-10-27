import { expect, it } from 'vitest';
import {
    createBaseDefaultNavLayout,
    migrateAvatarNav
} from '../navLayoutDefaults';
const t = (key) => key;
it('groups default avatar destinations while retaining the old route key', () => {
    const layout = createBaseDefaultNavLayout(t);
    expect(
        layout.find((item) => item.id === 'default-folder-avatars').items
    ).toEqual(['my-avatars', 'found-avatars']);
});
it('replaces a standalone avatar entry in place without moving other customization', () => {
    const source = [
        { type: 'item', key: 'tools' },
        { type: 'item', key: 'my-avatars' },
        { type: 'item', key: 'feed' }
    ];
    const migrated = migrateAvatarNav(source, [], t);
    expect(migrated.layout.map((item) => item.key || item.id)).toEqual([
        'tools',
        'default-folder-avatars',
        'feed'
    ]);
    expect(migrated.layout[1].items).toEqual(['my-avatars', 'found-avatars']);
    expect(source[1].key).toBe('my-avatars');
    expect(migrateAvatarNav(migrated.layout, [], t)).toEqual(migrated);
});
it('keeps custom folders and honors hidden avatars', () => {
    const layout = [
        {
            type: 'folder',
            id: 'custom',
            name: 'Mine',
            items: ['feed', 'my-avatars', 'tools']
        }
    ];
    expect(migrateAvatarNav(layout, [], t).layout[0]).toMatchObject({
        id: 'custom',
        name: 'Mine',
        items: ['feed', 'my-avatars', 'found-avatars', 'tools']
    });
    expect(migrateAvatarNav([], ['my-avatars'], t)).toEqual({
        layout: [],
        hiddenKeys: ['my-avatars', 'found-avatars']
    });
});
