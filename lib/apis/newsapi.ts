// lib/apis/newsapi.ts - NewsAPI.org (100 requests/día gratis para siempre)

const NEWS_API_KEY = process.env.NEWSAPI_KEY || '';
const ENABLE_NEWSAPI = process.env.ENABLE_NEWSAPI === 'true';

interface NewsAPIArticle {
    source: { name: string };
    author: string | null;
    title: string;
    description: string | null;
    url: string;
    urlToImage: string | null;
    publishedAt: string;
    content: string | null;
}

export async function fetchNewsAPI(query: string, language: string = 'es', pageSize: number = 20): Promise<any[]> {
    if (!ENABLE_NEWSAPI || !NEWS_API_KEY) {
        console.log('NewsAPI disabled or no API key');
        return [];
    }

    try {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=${language}&pageSize=${pageSize}&sortBy=publishedAt&apiKey=${NEWS_API_KEY}`;

        const res = await fetch(url);
        if (!res.ok) {
            console.error('NewsAPI error:', res.status);
            return [];
        }

        const data = await res.json();

        return (data.articles || []).map((article: NewsAPIArticle) => ({
            title: article.title,
            description: article.description || '',
            url: article.url,
            source: article.source.name,
            publishedAt: article.publishedAt,
            socialimage: article.urlToImage,
        }));
    } catch (error) {
        console.error('Error fetching NewsAPI:', error);
        return [];
    }
}

// Buscar noticias locales (eventos, noticias de una ciudad)
export async function fetchLocalNews(city: string, interests: string[], limit: number = 10): Promise<any[]> {
    if (!ENABLE_NEWSAPI) return [];

    const query = `${city} (${interests.slice(0, 3).join(' OR ')})`;
    return await fetchNewsAPI(query, 'es', limit);
}

// Buscar noticias globales por intereses (en Inglés para más volumen, como pidió el usuario)
export async function fetchInterestNews(interests: string[], limit: number = 20): Promise<any[]> {
    if (!ENABLE_NEWSAPI) return [];

    // Query simple: "gaming OR tech OR music"
    const query = interests.slice(0, 3).join(' OR ');
    return await fetchNewsAPI(query, 'en', limit);
}
