import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, userInterests, userLocations, feedCache } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { orchestrateQueries } from "@/lib/ai/orchestrator";
import { fetchGDELTNews } from "@/lib/apis/gdelt";
import { fetchRedditPosts, getSubredditsForInterests } from "@/lib/apis/reddit";
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
                totalSources: 2, // GDELT + Reddit
                cached: true,
            });
        }

        // 3. Orquestar queries con Gemini
        console.log('Generating new feed with AI...');
        const interests = user.interests.map(i => i.topic);
        const location = {
            city: user.locations[0].city || "España",
            country: user.locations[0].countryCode || "ES"
        };

        const orchestration = await orchestrateQueries(interests, location, "es");

        // 4. Ejecutar queries en paralelo
        const contentPromises = orchestration.queries.map(async (query) => {
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

        //4. Procesar y normalizar resultados
        const allContent: ContentItem[] = [];

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const query = orchestration.queries[index];
                const items = result.value;

                if (query.source === 'gdelt') {
                    // Normalizar artículos de GDELT
                    items.forEach((article: any) => {
                        // Extraer ubicación del artículo si está disponible
                        const articleLocation = extractLocationFromGDELT(article, location);

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
                            location: articleLocation,
                        });
                    });
                } else if (query.source === 'reddit') {
                    // Normalizar posts de Reddit
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
                            // Reddit posts don't have location unless explicitly mentioned
                        });
                    });
                }
            }
        });

        // 6. Ranking por relevancia + diversidad
        const rankedContent = diversifyAndRank(allContent, interests).slice(0, 50); // Top 50

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
            totalSources: orchestration.metadata.total_queries,
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

// Generar cache key único
function generateCacheKey(userId: string, interests: string[]): string {
    const content = `${userId}-${interests.sort().join(',')}`;
    return crypto.createHash('md5').update(content).digest('hex');
}

// Calcular score de relevancia para posts de Reddit
function calculateRedditScore(post: any, interests: string[]): number {
    let score = 40; // Base score

    // Boost por upvotes
    if (post.score > 100) score += 20;
    else if (post.score > 50) score += 10;
    else if (post.score > 10) score += 5;

    // Boost por comments (engagement)
    if (post.num_comments > 50) score += 10;
    else if (post.num_comments > 20) score += 5;

    // Boost por recencia (últimas 24h)
    const hoursAgo = (Date.now() - (post.created * 1000)) / (1000 * 60 * 60);
    if (hoursAgo < 6) score += 15;
    else if (hoursAgo < 24) score += 10;
    else if (hoursAgo < 48) score += 5;

    // Boost si el título contiene algún interés
    const titleLower = post.title.toLowerCase();
    const matchedInterests = interests.filter(interest =>
        titleLower.includes(interest.toLowerCase())
    );
    score += matchedInterests.length * 5;

    return Math.min(score, 100); // Max 100
}

// Calcular score para artículos de GDELT
function calculateGDELTScore(article: any, interests: string[], priority: number): number {
    let score = 45; // Base score

    // Boost por prioridad de la query
    score += (4 - priority) * 15; // priority 1 = +45, priority 2 = +30, priority 3 = +15

    // Boost por recencia
    if (article.publishedAt) {
        const hoursAgo = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60);
        if (hoursAgo < 3) score += 20;
        else if (hoursAgo < 12) score += 15;
        else if (hoursAgo < 24) score += 10;
        else if (hoursAgo < 48) score += 5;
    }

    // Boost si el título match con intereses
    const titleLower = (article.title || '').toLowerCase();
    const descLower = (article.description || '').toLowerCase();
    interests.forEach(interest => {
        const interestLower = interest.toLowerCase();
        if (titleLower.includes(interestLower)) score += 10;
        else if (descLower.includes(interestLower)) score += 5;
    });

    // Boost si tiene imagen
    if (article.socialimage) score += 5;

    return Math.min(score, 100);
}

// Extraer ubicación de artículo GDELT
function extractLocationFromGDELT(article: any, userLocation: { city: string; country: string }): { city: string; distance: number } | undefined {
    // GDELT puede tener campo "location" con datos geográficos
    if (article.location) {
        // Simplificado: detectar si menciona la ciudad del usuario
        const locationLower = article.location.toLowerCase();
        const cityLower = userLocation.city.toLowerCase();

        if (locationLower.includes(cityLower)) {
            return { city: userLocation.city, distance: 0 };
        }

        // Si menciona España pero no la ciudad
        if (locationLower.includes('spain') || locationLower.includes('españa')) {
            return { city: 'España', distance: 150 }; // Estimación
        }

        // Si menciona ciudades europeas cercanas
        const europeanCities = ['madrid', 'barcelona', 'lisboa', 'porto', 'paris', 'lyon'];
        for (const city of europeanCities) {
            if (locationLower.includes(city)) {
                return { city: city.charAt(0).toUpperCase() + city.slice(1), distance: 500 };
            }
        }
    }

    // Si no tiene ubicación explícita, intentar detectar del título/descripción
    const text = `${article.title} ${article.description}`.toLowerCase();

    // Lista de ciudades españolas comunes
    const spanishCities = ['madrid', 'barcelona', 'valencia', 'sevilla', 'bilbao', 'málaga', 'zaragoza'];
    for (const city of spanishCities) {
        if (text.includes(city)) {
            const distance = city === userLocation.city.toLowerCase() ? 0 : 300;
            return { city: city.charAt(0).toUpperCase() + city.slice(1), distance };
        }
    }

    return undefined; // No se pudo detectar ubicación
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

// Diversificar y rankear contenido para evitar que todo sea de un solo topic
function diversifyAndRank(items: ContentItem[], interests: string[]): ContentItem[] {
    // Paso 1: Ordenar por score
    const sorted = items.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Paso 2: Aplicar diversidad - no más de 5 items consecutivos de la misma categoría
    const diversified: ContentItem[] = [];
    const categoryCount: Record<string, number> = {};
    const MAX_CONSECUTIVE = 5;

    for (const item of sorted) {
        const cat = item.category;
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;

        // Resetear contador cada MAX_CONSECUTIVE items
        if (diversified.length > 0 && diversified.length % MAX_CONSECUTIVE === 0) {
            Object.keys(categoryCount).forEach(key => {
                categoryCount[key] = 0;
            });
        }

        diversified.push(item);
    }

    return diversified;
}
