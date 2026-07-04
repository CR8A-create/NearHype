/**
 * GDELT API Client
 * Free, unlimited access to global news
 */

export interface GDELTArticle {
    title: string;
    url: string;
    source: string;
    publishedAt: string;
    description: string;
    location?: string;
}

// Forma cruda de un artículo en la respuesta del Doc 2.0 API
interface GDELTRawArticle {
    title?: string;
    url: string;
    domain?: string;
    seendate?: string;
    socialimage?: string;
    location?: string;
}

export async function fetchGDELTNews(
    keywords: string[],
    language: string = "spanish",
    maxResults: number = 20
): Promise<GDELTArticle[]> {
    try {
        // GDELT Doc 2.0 API
        const query = keywords.join(" OR ");
        const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=${maxResults}&format=json&sourcelang=${language}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'NearHype/1.0'
            }
        });

        if (!response.ok) {
            console.error('GDELT API error:', response.status);
            return [];
        }

        const data = await response.json();

        // GDELT returns articles in 'articles' array
        if (!data.articles || !Array.isArray(data.articles)) {
            return [];
        }

        return data.articles.slice(0, maxResults).map((article: GDELTRawArticle) => ({
            title: article.title || 'Sin título',
            url: article.url,
            source: article.domain || 'Desconocido',
            publishedAt: article.seendate || new Date().toISOString(),
            description: article.socialimage || article.title || '',
            location: article.location || undefined,
        }));
    } catch (error) {
        console.error('Error fetching GDELT news:', error);
        return [];
    }
}
