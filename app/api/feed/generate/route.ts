import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, userInterests, userLocations, feedCache } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { orchestrateQueries } from "@/lib/ai/orchestrator";
import { fetchGDELTNews } from "@/lib/apis/gdelt";
import { fetchRedditPosts } from "@/lib/apis/reddit";
import { fetchNewsAPI, fetchLocalNews } from "@/lib/apis/newsapi";
import { fetchWikipediaForInterests } from "@/lib/apis/wikipedia";
import { searchEvents, searchTournaments, searchConcerts } from "@/lib/apis/google_search";
import crypto from "crypto";

interface ContentItem {
    id: string;
    title: string;
    description: string;
    url: string;
    source: string;
    publishedAt: string;
    location?: {
        city: string;
        distance: number;
    };
    relevanceScore: number;
    category: string;
    imageUrl?: string;
}

export async function GET() {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        // 1. Obtener usuario completo de la DB
        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, clerkId),
            with: {
                interests: true,
                locations: {
                    where: (locations, { eq }) => eq(locations.isCurrent, true),
                    limit: 1,
                },
                settings: true,
            },
        });

        if (!user || !user.interests.length || !user.locations.length) {
            return NextResponse.json(
                { error: "Complete el onboarding primero" },
                { status: 400 }
            );
        }

        // 2. Verificar cache
        const cacheKey = generateCacheKey(user.id, user.interests.map(i => i.topic));
        const existingCache = await db.query.feedCache.findFirst({
            where: eq(feedCache.cacheKey, cacheKey),
        });

        if (existingCache && existingCache.expiresAt > new Date()) {
            console.log('Returning cached feed');
            return NextResponse.json({
                items: existingCache.contentItems,
                generatedAt: existingCache.generatedAt?.toISOString() || new Date().toISOString(),
                userLocation: user.locations[0].city,
                totalSources: 5, // Múltiples fuentes
                cached: true,
            });
        }

        // 3. Preparar datos del usuario
        console.log('Generating new feed with multiple APIs...');
        const interests = user.interests.map(i => i.topic);
        const location = {
            city: user.locations[0].city || "España",
            country: user.locations[0].countryCode || "ES"
        };

        // 4. Buscar contenido en TODAS las APIs en paralelo
        const allResults: any[] = [];

        // API 1: Orchestración con Gemini (GDELT + Reddit) - Existente
        try {
            const orchestration = await orchestrateQueries(interests, location, "es");
            const orchestratedContent = await executeOrchestration(orchestration, interests);
            allResults.push(...orchestratedContent);
        } catch (error) {
            console.error('Orchestration error:', error);
        }

        // API 2: NewsAPI (100 req/día gratis para siempre)
        try {
            const newsApiResults = await Promise.allSettled([
                fetchLocalNews(location.city, interests, 10), // Noticias locales
                ...interests.slice(0, 3).map(interest => fetchNewsAPI(interest, 'es', 5)) // Noticias por interés
            ]);
            newsApiResults.forEach(result => {
                if (result.status === 'fulfilled') {
                    allResults.push(...normalizeArticles(result.value, 'news', interests, 60));
                }
            });
        } catch (error) {
            console.error('NewsAPI error:', error);
        }

        // API 3: Wikipedia (100% gratis, ilimitado)
        try {
            const wikiContent = await fetchWikipediaForInterests(interests, 'es');
            allResults.push(...normalizeArticles(wikiContent, 'wiki', interests, 40));
        } catch (error) {
            console.error('Wikipedia error:', error);
        }

        // API 4: Google Search (preparado, desactivado por default)
        try {
            const googleResults = await Promise.allSettled([
                searchEvents(interests[0] || '', location.city),
                searchTournaments(interests[0] || '', location.country),
                ...interests.filter(i => isPotentialArtist(i)).map(artist => searchConcerts(artist, location.city))
            ]);
            googleResults.forEach(result => {
                if (result.status === 'fulfilled') {
                    allResults.push(...normalizeArticles(result.value, 'events', interests, 80));
                }
            });
        } catch (error) {
            console.error('Google Search error:', error);
        }

        // 5. DEDUPLICACIÓN por URL
        const uniqueContent = deduplicateByUrl(allResults);

        // 6. Ranking por relevancia + diversidad
        const rankedContent = diversifyAndRank(uniqueContent, interests).slice(0, 50); // Top 50

        // 7. Guardar en cache
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        // Eliminar cache antiguo
        await db.delete(feedCache).where(eq(feedCache.cacheKey, cacheKey));

        // Insertar nuevo cache
        await db.insert(feedCache).values({
            userId: user.id,
            contentItems: rankedContent,
            cacheKey: cacheKey,
            expiresAt: expiresAt,
            apiVersion: 1,
        });

        // 8. Retornar feed
        return NextResponse.json({
            items: rankedContent,
            generatedAt: new Date().toISOString(),
            userLocation: location.city,
            totalSources: 5,
            cached: false,
        });

    } catch (error) {
        console.error('Error generating feed:', error);
        return NextResponse.json(
            { error: "Error al generar el feed" },
            { status: 500 }
        );
    }
}

// FUNCIÓN DE DEDUPLICACIÓN - Evita duplicados por URL
function deduplicateByUrl(items: ContentItem[]): ContentItem[] {
    const seen = new Set<string>();
    const unique: ContentItem[] = [];

    for (const item of items) {
        // Normalizar URL para comparación
        const normalizedUrl = item.url.toLowerCase().replace(/\/$/, '');

        if (!seen.has(normalizedUrl)) {
            seen.add(normalizedUrl);
            unique.push(item);
        }
    }

    console.log(`Deduplication: ${items.length} items -> ${unique.length} unique items`);
    return unique;
}

// Normalizar artículos de cualquier fuente
function normalizeArticles(articles: any[], category: string, interests: string[], baseScore: number): ContentItem[] {
    return articles.map(article => ({
        id: crypto.randomUUID(),
        title: article.title || '',
        description: article.description || article.title?.substring(0, 200) || '',
        url: article.url || '',
        source: article.source || 'Unknown',
        publishedAt: article.publishedAt || new Date().toISOString(),
        relevanceScore: calculateBasicScore(article, interests, baseScore),
        category: category,
        imageUrl: article.socialimage || article.thumbnail?.source || undefined,
    }));
}

// Ejecutar orquestación de Gemini (GDELT + Reddit)
async function executeOrchestration(orchestration: any, interests: string[]): Promise<ContentItem[]> {
    const contentPromises = orchestration.queries.map(async (query: any) => {
        switch (query.source) {
            case 'gdelt':
                return await fetchGDELTNews(
                    query.params.keywords,
                    query.params.language,
                    query.params.maxResults
                );
            case 'reddit':
                return await fetchRedditPosts(
                    query.params.subreddits,
                    query.params.limit
                );
            default:
                return [];
        }
    });

    const results = await Promise.allSettled(contentPromises);
    const allContent: ContentItem[] = [];

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            const query = orchestration.queries[index];
            const items = result.value;

            if (query.source === 'gdelt') {
                items.forEach((article: any) => {
                    allContent.push({
                        id: crypto.randomUUID(),
                        title: article.title,
                        description: article.description || article.title.substring(0, 200),
                        url: article.url,
                        source: article.source || 'GDELT',
                        publishedAt: article.publishedAt,
                        relevanceScore: calculateGDELTScore(article, interests, query.priority),
                        category: mapInterestToCategory((query as any).interest_category || 'news'),
                        imageUrl: article.socialimage || undefined,
                    });
                });
            } else if (query.source === 'reddit') {
                items.forEach((post: any) => {
                    allContent.push({
                        id: crypto.randomUUID(),
                        title: post.title,
                        description: post.selftext?.substring(0, 200) || post.title,
                        url: `https://reddit.com${post.permalink}`,
                        source: `r/${post.subreddit}`,
                        publishedAt: new Date(post.created * 1000).toISOString(),
                        relevanceScore: calculateRedditScore(post, interests),
                        category: 'community',
                    });
                });
            }
        }
    });

    return allContent;
}

// Detectar si un interés es potencialmente un artista/banda
function isPotentialArtist(interest: string): boolean {
    const lower = interest.toLowerCase();
    // Heurística simple: si contiene palabras clave de música o es una banda conocida
    const musicKeywords = ['band', 'música', 'music', 'singer', 'cantante', 'artista'];
    return musicKeywords.some(keyword => lower.includes(keyword));
}

// Calcular score básico
function calculateBasicScore(article: any, interests: string[], baseScore: number): number {
    let score = baseScore;

    const titleLower = (article.title || '').toLowerCase();
    interests.forEach(interest => {
        if (titleLower.includes(interest.toLowerCase())) {
            score += 10;
        }
    });

    if (article.socialimage || article.thumbnail) score += 5;

    return Math.min(score, 100);
}

// Generar cache key único
function generateCacheKey(userId: string, interests: string[]): string {
    const content = `${userId}-${interests.sort().join(',')}`;
    return crypto.createHash('md5').update(content).digest('hex');
}

// Calcular score de relevancia para posts de Reddit
function calculateRedditScore(post: any, interests: string[]): number {
    let score = 40; // Base score

    if (post.score > 100) score += 20;
    else if (post.score > 50) score += 10;
    else if (post.score > 10) score += 5;

    if (post.num_comments > 50) score += 10;
    else if (post.num_comments > 20) score += 5;

    const hoursAgo = (Date.now() - (post.created * 1000)) / (1000 * 60 * 60);
    if (hoursAgo < 6) score += 15;
    else if (hoursAgo < 24) score += 10;
    else if (hoursAgo < 48) score += 5;

    const titleLower = post.title.toLowerCase();
    const matchedInterests = interests.filter(interest =>
        titleLower.includes(interest.toLowerCase())
    );
    score += matchedInterests.length * 5;

    return Math.min(score, 100);
}

// Calcular score para artículos de GDELT
function calculateGDELTScore(article: any, interests: string[], priority: number): number {
    let score = 45; // Base score

    score += (4 - priority) * 15;

    if (article.publishedAt) {
        const hoursAgo = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60);
        if (hoursAgo < 3) score += 20;
        else if (hoursAgo < 12) score += 15;
        else if (hoursAgo < 24) score += 10;
        else if (hoursAgo < 48) score += 5;
    }

    const titleLower = (article.title || '').toLowerCase();
    const descLower = (article.description || '').toLowerCase();
    interests.forEach(interest => {
        const interestLower = interest.toLowerCase();
        if (titleLower.includes(interestLower)) score += 10;
        else if (descLower.includes(interestLower)) score += 5;
    });

    if (article.socialimage) score += 5;

    return Math.min(score, 100);
}

// Mapear interés a categoría visual
function mapInterestToCategory(interest: string): string {
    const mapping: Record<string, string> = {
        'gaming': 'gaming',
        'videojuegos': 'gaming',
        'games': 'gaming',
        'música': 'music',
        'music': 'music',
        'conciertos': 'events',
        'tecnología': 'tech',
        'tech': 'tech',
        'technology': 'tech',
        'deportes': 'sports',
        'sports': 'sports',
        'gastronomía': 'food',
        'food': 'food',
        'cine': 'movies',
        'cultura': 'culture',
    };

    return mapping[interest.toLowerCase()] || 'news';
}

// Diversificar y rankear contenido
function diversifyAndRank(items: ContentItem[], interests: string[]): ContentItem[] {
    const sorted = items.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const diversified: ContentItem[] = [];
    const categoryCount: Record<string, number> = {};
    const MAX_CONSECUTIVE = 5;

    for (const item of sorted) {
        const cat = item.category;
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;

        if (diversified.length > 0 && diversified.length % MAX_CONSECUTIVE === 0) {
            Object.keys(categoryCount).forEach(key => {
                categoryCount[key] = 0;
            });
        }

        diversified.push(item);
    }

    return diversified;
}
