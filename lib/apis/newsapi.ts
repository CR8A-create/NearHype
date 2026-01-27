/**
 * NewsAPI Client
 * Free tier: 100 requests/day, good for development
 * For production: consider upgrading or using GDELT as primary
 */

export interface NewsAPIArticle {
    title: string;
    description: string;
    url: string;
    urlToImage?: string;
    publishedAt: string;
    source: {
        name: string;
    };
    content?: string;
}

export async function fetchNewsAPI(
    keywords: string[],
    language: string = "es",
    pageSize: number = 10
): Promise<NewsAPIArticle[]> {
    // Note: NewsAPI requires an API key
    // For MVP, we'll use GDELT as primary. NewsAPI is optional enhancement.
    const apiKey = process.env.NEWSAPI_KEY;

    if (!apiKey) {
        console.warn('NewsAPI key not configured, skipping NewsAPI source');
        return [];
    }

    try {
        const query = keywords.join(" OR ");
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=${language}&pageSize=${pageSize}&sortBy=publishedAt&apiKey=${apiKey}`;

        const response = await fetch(url);

        if (!response.ok) {
            console.error('NewsAPI error:', response.status);
            return [];
        }

        const data = await response.json();

        if (data.status !== 'ok' || !data.articles) {
            return [];
        }

        return data.articles;
    } catch (error) {
        console.error('Error fetching NewsAPI:', error);
        return [];
    }
}

/**
 * Get Spanish/European news sources for better localization
 */
export async function fetchLocalNews(
    keywords: string[],
    country: string = "es", // ISO code
    pageSize: number = 10
): Promise<NewsAPIArticle[]> {
    const apiKey = process.env.NEWSAPI_KEY;

    if (!apiKey) {
        return [];
    }

    try {
        const query = keywords.join(" OR ");
        const url = `https://newsapi.org/v2/top-headlines?q=${encodeURIComponent(query)}&country=${country}&pageSize=${pageSize}&apiKey=${apiKey}`;

        const response = await fetch(url);

        if (!response.ok) {
            return [];
        }

        const data = await response.json();

        if (data.status !== 'ok' || !data.articles) {
            return [];
        }

        return data.articles;
    } catch (error) {
        console.error('Error fetching local news:', error);
        return [];
    }
}
