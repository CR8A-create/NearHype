import { getOrCreateUser } from "@/lib/getOrCreateUser";
import { db } from "@/lib/db";
import { users, userInterests, userLocations, feedCache } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { fetchNewsAPI, fetchLocalNews, fetchInterestNews } from "@/lib/apis/newsapi";
import { fetchWikipediaForInterests } from "@/lib/apis/wikipedia";
import crypto from "crypto";
import { searchDuckDuckGo, searchGoogleNewsRSS } from "@/lib/apis/free_search";

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
        const user = await getOrCreateUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        // 1. Obtener usuario completo de la DB con relaciones
        const fullUser = await db.query.users.findFirst({
            where: eq(users.clerkId, user.clerkId),
            with: {
                interests: true,
                locations: {
                    where: (locations, { eq }) => eq(locations.isCurrent, true),
                    limit: 1,
                },
                settings: true,
            },
        });

        if (!fullUser || !fullUser.interests.length || !fullUser.locations.length) {
            // Usuario no ha completado onboarding - devolver feed vacío con mensaje
            return NextResponse.json({
                items: [],
                message: "Completa el onboarding para ver tu feed personalizado",
                needsOnboarding: true,
            });
        }

        // 2. Verificar cache
        const cacheKey = generateCacheKey(fullUser.id, fullUser.interests.map((i: { topic: string }) => i.topic));
        const existingCache = await db.query.feedCache.findFirst({
            where: eq(feedCache.cacheKey, cacheKey),
        });

        // Versioning del cache para forzar updates cuando cambiamos lógica
        const CURRENT_API_VERSION = 3;

        if (existingCache && existingCache.expiresAt > new Date() && existingCache.feedData.length > 10 && existingCache.apiVersion === CURRENT_API_VERSION) {
            console.log('Returning cached feed');
            return NextResponse.json({
                items: existingCache.feedData,
                generatedAt: existingCache.generatedAt?.toISOString() || new Date().toISOString(),
                userLocation: fullUser.locations[0].city,
                totalSources: 5, // Múltiples fuentes
                cached: true,
            });
        }

        // 3. Preparar datos del usuario
        console.log('Generating new feed with multiple APIs...');
        const interests = fullUser.interests.map((i: { topic: string }) => i.topic);
        const location = {
            city: fullUser.locations[0].city || "España",
            country: fullUser.locations[0].countryCode || "ES"
        };

        // 4. ESTRATEGIA DE BÚSQUEDA POR ANILLOS (EXPANDING RINGS)
        // Ring 1: Local (Ciudad)
        // Ring 2: Nacional (País)
        // Ring 3: Global (Interés general)

        const allResults: ContentItem[] = [];

        // Seleccionar 3 intereses principales para evitar saturar
        const topInterests = interests.slice(0, 3);
        const mainLocation = location.city;
        const mainCountry = location.country;

        console.log(`Searching for interests: ${topInterests.join(', ')} in ${mainLocation}`);

        // 4A. ESTRATEGIA: Búsqueda Local Genérica (PRIORIDAD MÁXIMA)
        // Buscamos noticias generales de la ciudad independientemente de los intereses
        // Esto soluciona el problema de "no salen noticias locales" s los intereses son muy nicho
        try {
            console.log(`Fetching generic local news for: ${mainLocation}`);
            const localGeneralQuery = `Noticias ${mainLocation}`;
            const localGeneralItems = await searchGoogleNewsRSS(localGeneralQuery, 10); // Traemos 10 para asegurar

            localGeneralItems.forEach(item => {
                allResults.push({
                    id: crypto.randomUUID(),
                    title: item.title,
                    description: item.description,
                    url: item.url,
                    source: item.source,
                    publishedAt: item.publishedAt,
                    relevanceScore: 100, // MAXIMA PRIORIDAD - Salen primero
                    category: 'news',
                    imageUrl: undefined,
                    location: { city: mainLocation, distance: 0 }
                });
            });
            // Delay cortés
            await new Promise(r => setTimeout(r, 500));
        } catch (e) { console.error('Error generic local:', e); }

        // 4B. Búsqueda por Intereses (Loop secuencial)
        // Reducimos queries por interés para ser más eficientes
        for (const interest of topInterests) {
            console.log(`Processing interest: ${interest}`);

            // --- RING 1: Búsqueda Local (1 query potentes) ---
            try {
                const localQuery = `${interest} noticias eventos ${mainLocation}`;
                const localItems = await searchDuckDuckGo(localQuery, 'es-es', 5);

                localItems.forEach(item => {
                    allResults.push({
                        ...normalizeItem(item, interest, 'events'),
                        location: { city: mainLocation, distance: 10 },
                        relevanceScore: 95
                    });
                });
                // Delay cortés
                await new Promise(r => setTimeout(r, 800));
            } catch (e) {
                console.error(`Error fetching local for ${interest}:`, e);
            }

            // --- RING 2: Búsqueda Nacional (1 query) ---
            try {
                const nationalQuery = `${interest} novedades ${mainCountry}`;
                const nationalItems = await searchDuckDuckGo(nationalQuery, 'es-es', 4);

                nationalItems.forEach(item => {
                    allResults.push({
                        ...normalizeItem(item, interest, 'news'),
                        location: { city: mainCountry, distance: 500 },
                        relevanceScore: 70
                    });
                });
                await new Promise(r => setTimeout(r, 800));
            } catch (e) { console.error(e); }

            // --- RING 3: Búsqueda Global (2 queries variadas) ---
            try {
                // Alternamos queries para dar variedad sin explotar
                const varietyOptions = [
                    `${interest} últimas noticias`,
                    `${interest} curiosidades`,
                    `${interest} guía`,
                    `mejor sobre ${interest}`
                ];
                // Elegimos 1 query aleatoria
                const randomQuery = varietyOptions[Math.floor(Math.random() * varietyOptions.length)];

                const globalItems = await searchDuckDuckGo(randomQuery, 'es-es', 4);

                globalItems.forEach(item => {
                    allResults.push({
                        ...normalizeItem(item, interest, 'news'),
                        location: { city: 'Global', distance: 5000 },
                        relevanceScore: 60
                    });
                });
                await new Promise(r => setTimeout(r, 800));
            } catch (e) { console.error(e); }
        }



        // API 2: NewsAPI (Volumen masivo en Inglés - como pidió el usuario)
        // Esto garantiza que siempre haya ~20-30 noticias frescas aunque fallen las búsquedas locales
        try {
            console.log('Fetching high-volume English news from NewsAPI...');
            const newsApiResults = await fetchInterestNews(interests, 30);

            newsApiResults.forEach(item => {
                allResults.push({
                    id: crypto.randomUUID(),
                    title: item.title,
                    description: item.description,
                    url: item.url,
                    source: item.source,
                    publishedAt: item.publishedAt,
                    relevanceScore: 65, // Score medio aceptable
                    category: mapInterestToCategory(interests[0] || 'general'), // Aproximación
                    imageUrl: item.socialimage,
                    location: { city: 'Global (EN)', distance: 8000 }
                });
            });
        } catch (error) {
            console.error('NewsAPI error:', error);
        }

        // 5. DEDUPLICACIÓN por URL
        const uniqueContent = deduplicateByUrl(allResults);

        // 6. Ranking por relevancia + diversidad
        const rankedContent = diversifyAndRank(uniqueContent, interests).slice(0, 50); // Top 50

        // 7. Guardar en cache
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        // Calcular fuentes reales únicas
        const uniqueSourcesCount = new Set(uniqueContent.map(item => item.source)).size;

        // Eliminar cache antiguo
        await db.delete(feedCache).where(eq(feedCache.cacheKey, cacheKey));

        // Insertar nuevo cache
        await db.insert(feedCache).values({
            userId: user.id,
            feedData: rankedContent,
            cacheKey: cacheKey,
            expiresAt: expiresAt,
            apiVersion: 3, // CURRENT_API_VERSION
        });

        // 8. Retornar feed
        return NextResponse.json({
            items: rankedContent,
            generatedAt: new Date().toISOString(),
            userLocation: location.city,
            totalSources: uniqueSourcesCount, // Número real de fuentes
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

// Mapeo simple de categorías a imágenes placeholder de alta calidad
const PLACEHOLDER_IMAGES: Record<string, string[]> = {
    'gaming': [
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1538481199705-c710db4e963f?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=800&q=80'
    ],
    'tech': [
        'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=800&q=80'
    ],
    'music': [
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80'
    ],
    'news': [
        'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80', // Newspaper
        'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=800&q=80'  // News generic
    ],
    'default': [
        'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80'
    ]
};

function getPlaceholder(category: string): string {
    const images = PLACEHOLDER_IMAGES[category] || PLACEHOLDER_IMAGES['default'];
    return images[Math.floor(Math.random() * images.length)];
}

// Normalizar item individual
function normalizeItem(item: any, interest: string, category: string): ContentItem {
    return {
        id: crypto.randomUUID(),
        title: item.title || '',
        description: item.description || '',
        url: item.url || '',
        source: item.source || 'Web',
        publishedAt: item.publishedAt || new Date().toISOString(),
        relevanceScore: 50, // Score base, se ajusta luego
        category: category,
        imageUrl: item.socialimage || getPlaceholder(category) // Fallback a placeholder visual
    };
}

// Generar cache key único
function generateCacheKey(userId: string, interests: string[]): string {
    const content = `${userId}-${interests.sort().join(',')}`;
    return crypto.createHash('md5').update(content).digest('hex');
}

// Detectar si un interés es potencialmente un artista/banda
function isPotentialArtist(interest: string): boolean {
    const lower = interest.toLowerCase();
    // Heurística simple: si contiene palabras clave de música o es una banda conocida
    const musicKeywords = ['band', 'música', 'music', 'singer', 'cantante', 'artista'];
    return musicKeywords.some(keyword => lower.includes(keyword));
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

    // Los primeros 5 items SIEMPRE respetan el score estricto (para garantizar local)
    // El resto se diversifica
    const topPriority = sorted.slice(0, 5);
    const rest = sorted.slice(5);

    const diversified: ContentItem[] = [...topPriority];
    const categoryCount: Record<string, number> = {};
    const MAX_CONSECUTIVE = 3; // Reducimos a 3 para más mezcla en el resto

    for (const item of rest) {
        const cat = item.category;
        // Limitamos consecutivos
        if ((categoryCount[cat] || 0) >= MAX_CONSECUTIVE) {
            // Si ya hay muchos de esta categoría, intentamos ponerlo al final o saltarlo temporalmente (simple push for now)
            // Para simplificar, lo añadimos igual pero el sort original ya ayudó
        }

        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        diversified.push(item);
    }

    return diversified;
}
