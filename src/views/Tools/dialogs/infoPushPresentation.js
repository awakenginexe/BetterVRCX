const CATEGORIES = [
    'help-article',
    'quick-menu-banner',
    'loading-screen-banners'
];
const text = (value) =>
    typeof value === 'string'
        ? value
        : typeof value?.fallback === 'string'
          ? value.fallback
          : '';
const list = (value) => (Array.isArray(value) ? value : []);

export function safeInfoPushUrl(value) {
    if (typeof value !== 'string') return '';
    try {
        const url = new URL(value);
        return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch {
        return '';
    }
}

export function normalizeInfoPush(response) {
    const items = new Map();
    for (const item of list(response)) {
        if (
            !item ||
            typeof item.id !== 'string' ||
            !item.id ||
            items.has(item.id)
        )
            continue;
        const data = item.data ?? {};
        const blocks = [];
        for (const content of list(data.article?.content)) {
            if (!content) continue;
            if (safeInfoPushUrl(content.imageUrl))
                blocks.push({
                    type: 'image',
                    value: safeInfoPushUrl(content.imageUrl)
                });
            else if (safeInfoPushUrl(content.videoUrl))
                blocks.push({
                    type: 'video',
                    value: safeInfoPushUrl(content.videoUrl)
                });
            else if (text(content.text))
                blocks.push({
                    type: 'text',
                    value: text(content.text)
                        .replace(/<br\s*\/?>/gi, '\n')
                        .replace(/<[^>]+>/g, '')
                        .replace(/&nbsp;/g, ' ')
                        .trim()
                });
        }
        const links = new Map();
        for (const source of [
            data.onPressed,
            ...list(data.article?.moreInfoLinks),
            ...list(data.article?.embeddedLinkData)
        ]) {
            if (!source) continue;
            const target = text(list(source.parameters)[0]);
            if (
                source.command === 'OpenURL'
                    ? !safeInfoPushUrl(target)
                    : source.command !== 'OpenHelpArticle' || !target
            )
                continue;
            const key = `${source.command}:${target}`;
            if (!links.has(key))
                links.set(key, {
                    command: source.command,
                    target,
                    name: text(source.name)
                });
        }
        const date = item.startDate ?? item.createdAt;
        items.set(item.id, {
            id: item.id,
            name:
                text(data.name) ||
                text(data.title) ||
                text(data.contentList?.name) ||
                text(data.finalName) ||
                item.id,
            description:
                text(data.description) ||
                text(data.subtitle) ||
                text(data.tooltipDescription) ||
                text(data.body),
            category:
                list(item.tags).find((tag) => CATEGORIES.includes(tag)) ??
                'other',
            imageUrl: safeInfoPushUrl(
                data.imageUrl ||
                    data.thumbnailImageUrl ||
                    data.bannerImageUrl ||
                    data.iconImageUrl
            ),
            date:
                typeof date === 'string' && Number.isFinite(Date.parse(date))
                    ? date
                    : '',
            endDate:
                typeof item.endDate === 'string' &&
                Number.isFinite(Date.parse(item.endDate))
                    ? item.endDate
                    : '',
            blocks,
            links: [...links.values()]
        });
    }
    return [...items.values()].sort(
        (a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0)
    );
}
