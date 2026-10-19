import { expect, it } from 'vitest';
import { normalizeInfoPush, safeInfoPushUrl } from '../infoPushPresentation';

it('supports known payload fields as text, dated image articles and allowed links', () => {
    const [item] = normalizeInfoPush([
        {
            id: 'a',
            tags: ['help-article'],
            startDate: '2026-10-01T00:00:00Z',
            data: {
                name: { fallback: 'News' },
                description: { fallback: 'Details' },
                imageUrl: 'https://example.com/news.png',
                article: {
                    content: [
                        { text: '<b>Hello</b><br>World' },
                        { imageUrl: 'https://example.com/a.png' },
                        { videoUrl: 'https://example.com/video' }
                    ],
                    moreInfoLinks: [
                        {
                            command: 'OpenURL',
                            parameters: ['https://example.com'],
                            name: 'Read'
                        }
                    ],
                    embeddedLinkData: [
                        {
                            command: 'OpenURL',
                            parameters: ['https://example.com'],
                            name: 'Duplicate'
                        },
                        { command: 'OpenHelpArticle', parameters: ['b'] }
                    ]
                }
            }
        }
    ]);
    expect(item).toMatchObject({
        id: 'a',
        name: 'News',
        description: 'Details',
        category: 'help-article',
        date: '2026-10-01T00:00:00Z'
    });
    expect(item.blocks).toEqual([
        { type: 'text', value: 'Hello\nWorld' },
        { type: 'image', value: 'https://example.com/a.png' },
        { type: 'video', value: 'https://example.com/video' }
    ]);
    expect(item.links).toEqual([
        { command: 'OpenURL', target: 'https://example.com', name: 'Read' },
        { command: 'OpenHelpArticle', target: 'b', name: '' }
    ]);
});

it('rejects executable protocols and malformed remote data without rendering HTML', () => {
    for (const value of [
        'javascript:alert(1)',
        'file:///C:/x',
        'data:text/html,hello',
        '//example.com',
        {},
        null
    ])
        expect(safeInfoPushUrl(value)).toBe('');
    expect(normalizeInfoPush({ data: [] })).toEqual([]);
    expect(
        normalizeInfoPush([
            null,
            {},
            {
                id: 'a',
                tags: {},
                data: {
                    name: {},
                    article: { content: {}, moreInfoLinks: {} },
                    onPressed: { command: 'DeleteEverything' }
                }
            }
        ])
    ).toEqual([
        expect.objectContaining({
            id: 'a',
            name: 'a',
            category: 'other',
            imageUrl: '',
            blocks: [],
            links: [],
            date: ''
        })
    ]);
});
