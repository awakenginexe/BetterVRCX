import { onMounted, ref } from 'vue';

const fallbackNews = [
    {
        id: 48800,
        title: 'Developer Update - 13 August 2026',
        date: 'AUG 13, 2026',
        excerpt:
            'Welcome to the Developer Update for August 13, 2026! Today’s featured world is 忘郷 by enoki_noko. Announcements: Big Things Coming: Moonchaser! On August 28, we will be hosting our own music event: Moonchaser!',
        image: 'https://global.discourse-cdn.com/vrchat/optimized/3X/4/b/4b9c0d9e92f75b2f7d7ccfd7b432fcd5d5140765_2_1024x576.jpeg',
        url: 'https://ask.vrchat.com/t/48800'
    },
    {
        id: 48750,
        title: 'Developer Update - 30 July 2026',
        date: 'JUL 30, 2026',
        excerpt:
            'Welcome to the Developer Update for July 30, 2026. Today’s featured world is Wistful by Lilly the cat. Announcements: Big Things Coming! Did you catch the teaser for our next major update?',
        image: 'https://global.discourse-cdn.com/vrchat/optimized/3X/c/c/cccde989c3184b6018ed8ca89c32960c5d5ba85d_2_1024x576.jpeg',
        url: 'https://ask.vrchat.com/t/48750'
    },
    {
        id: 48702,
        title: 'Developer Update - 16 July 2026',
        date: 'JUL 16, 2026',
        excerpt:
            'Welcome to the Developer Update for July 16, 2026. Today’s featured world is 繁星空想 by 元气克星花阳. Announcements: Celebrate Tanabata with custom world shaders and performance enhancements.',
        image: 'https://global.discourse-cdn.com/vrchat/optimized/3X/b/6/b605dd7fb18107e94cebdd30de9d48ef218f09a2_2_1024x576.webp',
        url: 'https://ask.vrchat.com/t/48702'
    }
];

function formatDate(dateString) {
    try {
        const d = new Date(dateString);
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }).toUpperCase();
    } catch {
        return 'RECENT';
    }
}

function cleanExcerpt(content) {
    if (!content) return '';
    return content
        .replace(/&hellip;/g, '...')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/<[^>]+>/g, '')
        .replace(/https?:\/\/[^\s]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function useHomeNews() {
    const newsList = ref([...fallbackNews]);
    const isLoading = ref(false);
    const error = ref(null);

    async function fetchNews() {
        isLoading.value = true;
        error.value = null;
        try {
            const res = await fetch('https://ask.vrchat.com/c/official/31.json');
            if (res.ok) {
                const data = await res.json();
                const topics = data?.topic_list?.topics;
                if (Array.isArray(topics) && topics.length > 0) {
                    newsList.value = topics.map((topic) => {
                        return {
                            id: topic.id,
                            title: topic.title,
                            date: formatDate(topic.created_at),
                            timestamp: new Date(topic.created_at).getTime(),
                            excerpt: cleanExcerpt(topic.excerpt),
                            image: topic.image_url || 'https://assets.vrchat.com/www/news/developer-update.png',
                            url: `https://ask.vrchat.com/t/${topic.slug || 'topic'}/${topic.id}`
                        };
                    });
                }
            }
        } catch (err) {
            console.warn('Could not fetch latest ask.vrchat.com official news, using cached fallback:', err);
            error.value = err;
        } finally {
            isLoading.value = false;
        }
    }

    async function fetchTopicDetail(topicId) {
        try {
            const res = await fetch(`https://ask.vrchat.com/t/${topicId}.json`);
            if (res.ok) {
                const data = await res.json();
                const firstPost = data?.post_stream?.posts?.[0];
                return {
                    title: data.title,
                    cooked: firstPost?.cooked || '',
                    raw: firstPost?.raw || ''
                };
            }
        } catch (err) {
            console.warn(`Could not fetch topic ${topicId} detail:`, err);
        }
        return null;
    }

    onMounted(() => {
        fetchNews();
    });

    return {
        newsList,
        isLoading,
        error,
        fetchNews,
        fetchTopicDetail
    };
}
