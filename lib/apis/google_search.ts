// lib/apis/google_search.ts - Google Custom Search API (100 búsquedas/día gratis)
// PREPARADO PERO DESACTIVADO POR DEFAULT

import type { ExternalArticle } from './types';

const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY || '';
const GOOGLE_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID || '';
const ENABLE_GOOGLE = process.env.ENABLE_GOOGLE_SEARCH === 'true';

interface GoogleSearchResult {
    title: string;
    link: string;
    snippet: string;
    pagemap?: {
        metatags?: Array<{ [key: string]: string }>;
        cse_image?: Array<{ src: string }>;
    };
}

export async function searchGoogle(query: string, limit: number = 10): Promise<ExternalArticle[]> {
    if (!ENABLE_GOOGLE || !GOOGLE_API_KEY || !GOOGLE_ENGINE_ID) {
        console.log('Google Search disabled or not configured');
        return [];
    }

    try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_ENGINE_ID}&q=${encodeURIComponent(query)}&num=${limit}`;

        const res = await fetch(url);

        if (!res.ok) {
            console.error('Google Search API error:', res.status);
            return [];
        }

        const data = await res.json();

        return (data.items || []).map((item: GoogleSearchResult) => {
            const image = item.pagemap?.cse_image?.[0]?.src ||
                item.pagemap?.metatags?.[0]?.['og:image'];

            return {
                title: item.title,
                description: item.snippet,
                url: item.link,
                source: 'Google',
                publishedAt: new Date().toISOString(),
                socialimage: image,
            };
        });
    } catch (error) {
        console.error('Error fetching Google Search:', error);
        return [];
    }
}

// Buscar eventos para un interés + ciudad
export async function searchEvents(interest: string, city: string): Promise<ExternalArticle[]> {
    if (!ENABLE_GOOGLE) return [];

    const query = `${interest} evento ${city}`;
    return await searchGoogle(query, 5);
}

// Buscar torneos/competiciones
export async function searchTournaments(interest: string, country: string = 'España'): Promise<ExternalArticle[]> {
    if (!ENABLE_GOOGLE) return [];

    const query = `${interest} torneo competición ${country}`;
    return await searchGoogle(query, 5);
}

// Buscar conciertos de bandas/artistas
export async function searchConcerts(artist: string, city: string): Promise<ExternalArticle[]> {
    if (!ENABLE_GOOGLE) return [];

    const query = `${artist} concierto ${city}`;
    return await searchGoogle(query, 5);
}
