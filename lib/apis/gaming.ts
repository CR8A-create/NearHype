// lib/apis/gaming.ts
// Fetches gaming content from RAWG API (free, 20k requests/month)
// RAWG API key is free: https://rawg.io/apidocs

// Forma cruda de un juego en la respuesta del API de RAWG
interface RAWGRawGame {
    id: number;
    name: string;
    slug: string;
    short_description?: string;
    background_image?: string;
    rating?: number;
    released?: string;
    genres?: Array<{ name: string }>;
    platforms?: Array<{ platform?: { name?: string } }>;
    metacritic: number | null;
}

interface GameItem {
    id: number;
    name: string;
    description: string;
    backgroundImage: string;
    rating: number;
    released: string;
    genres: string[];
    platforms: string[];
    metacritic: number | null;
    url: string;
}

/**
 * Search for games related to user interests
 * Uses RAWG API (free tier: 20,000 requests/month)
 * Requires RAWG_API_KEY env var — get one free at https://rawg.io/apidocs
 */
export async function searchGames(query: string, maxResults: number = 5): Promise<GameItem[]> {
    const apiKey = process.env.RAWG_API_KEY;
    if (!apiKey) {
        console.warn('⚠️ RAWG_API_KEY not set — skipping RAWG API, using fallback');
        return searchGamesAlternative(query, maxResults);
    }

    try {
        const res = await fetch(
            `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(query)}&page_size=${maxResults}&ordering=-rating`,
            { signal: AbortSignal.timeout(5000) }
        );

        if (!res.ok) {
            console.error('RAWG API error:', res.status);
            return await searchGamesAlternative(query, maxResults);
        }

        const data = await res.json();
        return (data.results || []).map((game: RAWGRawGame) => ({
            id: game.id,
            name: game.name,
            description: game.short_description || `${game.name} - Rating: ${game.rating}/5`,
            backgroundImage: game.background_image || '',
            rating: game.rating || 0,
            released: game.released || '',
            genres: (game.genres || []).map(g => g.name),
            platforms: (game.platforms || []).map(p => p.platform?.name).filter((n): n is string => Boolean(n)),
            metacritic: game.metacritic,
            url: `https://rawg.io/games/${game.slug}`,
        }));
    } catch (error) {
        console.error('RAWG API error:', error);
        return searchGamesAlternative(query, maxResults);
    }
}

/**
 * Alternative: Use free gaming news from RSS
 */
async function searchGamesAlternative(query: string, maxResults: number): Promise<GameItem[]> {
    try {
        // Use DuckDuckGo for gaming content as fallback
        const { searchDuckDuckGo } = await import('./free_search');
        const results = await searchDuckDuckGo(`${query} game review 2024`, 'en-us', maxResults);

        return results.map((item, i) => ({
            id: i,
            name: item.title,
            description: item.description,
            backgroundImage: '',
            rating: 0,
            released: '',
            genres: [query],
            platforms: [],
            metacritic: null,
            url: item.url,
        }));
    } catch {
        return [];
    }
}

/**
 * Get popular/trending games
 */
export async function getTrendingGames(maxResults: number = 5): Promise<GameItem[]> {
    return searchGames('popular 2024', maxResults);
}

/**
 * Get games by genre matching user interests
 */
export async function getGamesByInterests(interests: string[], maxResults: number = 8): Promise<GameItem[]> {
    const gamingInterests = interests.filter(i =>
        ['gaming', 'videojuegos', 'juegos', 'esports', 'game', 'ps5', 'xbox', 'nintendo', 'pc gaming'].some(
            g => i.toLowerCase().includes(g)
        )
    );

    if (gamingInterests.length === 0) {
        // Not a gamer, return just trending
        return getTrendingGames(3);
    }

    const allGames: GameItem[] = [];
    for (const interest of gamingInterests.slice(0, 3)) {
        const games = await searchGames(interest, Math.ceil(maxResults / gamingInterests.length));
        allGames.push(...games);
        await new Promise(r => setTimeout(r, 300));
    }

    return allGames.slice(0, maxResults);
}
