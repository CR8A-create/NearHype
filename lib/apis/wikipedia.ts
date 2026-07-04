// lib/apis/wikipedia.ts - Wikipedia API (100% gratis, ilimitado)

import type { ExternalArticle } from './types';

export async function searchWikipedia(query: string, language: string = 'es'): Promise<ExternalArticle[]> {
    try {
        const url = `https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;

        const res = await fetch(url, {
            headers: {
                'User-Agent': 'NearHype/1.0',
            },
        });

        if (!res.ok) {
            return [];
        }

        const data = await res.json();

        if (data.type === 'standard') {
            return [{
                title: data.title,
                description: data.extract,
                url: data.content_urls.desktop.page,
                source: 'Wikipedia',
                publishedAt: new Date().toISOString(),
                socialimage: data.thumbnail?.source,
            }];
        }

        return [];
    } catch (error) {
        console.error('Error fetching Wikipedia:', error);
        return [];
    }
}

// Buscar artículo de Wikipedia para cada interés
export async function fetchWikipediaForInterests(interests: string[], language: string = 'es'): Promise<ExternalArticle[]> {
    const results = await Promise.allSettled(
        interests.slice(0, 5).map(interest => searchWikipedia(interest, language))
    );

    const articles: ExternalArticle[] = [];
    results.forEach(result => {
        if (result.status === 'fulfilled') {
            articles.push(...result.value);
        }
    });

    return articles;
}
