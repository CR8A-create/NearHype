import { getOrCreateUser } from "@/lib/getOrCreateUser";
import { db } from "@/lib/db";
import { users, userInterests, userLocations, feedCache } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { fetchInterestNews } from "@/lib/apis/newsapi";
import { fetchWikipediaForInterests } from "@/lib/apis/wikipedia";
import crypto from "crypto";
import { searchDuckDuckGo, searchGoogleNewsRSS } from "@/lib/apis/free_search";
import { searchYouTubeVideos } from "@/lib/apis/youtube";
import { fetchRedditForInterests } from "@/lib/apis/reddit";
import { getGamesByInterests } from "@/lib/apis/gaming";
import { getAIRecommendations, generateFunFacts } from "@/lib/apis/recommendations";

// ====== ENHANCED CONTENT TYPES ======
interface ContentItem {
    id: string;
    type: 'article' | 'video' | 'music' | 'image' | 'game' | 'fact' | 'recommendation' | 'reddit';
    title: string;
    description: string;
    url: string;
    embedUrl?: string;
    thumbnailUrl?: string;
    source: string;
    publishedAt: string;
    relevanceScore: number;
    category: string;
    imageUrl?: string;
    // Enhanced fields
    mediaType?: 'youtube' | 'spotify' | 'reddit' | 'image' | 'link' | 'game';
    duration?: string;
    interactionCount?: number;
    isRecommendation?: boolean;
    reason?: string;
    icon?: string;
    location?: { city: string; distance: number };
    subreddit?: string;
    score?: number;
    numComments?: number;
}

// Placeholder images by category
const PLACEHOLDER_IMAGES: Record<string, string[]> = {
    'gaming': ['https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80'],
    'music': ['https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=800&q=80'],
    'technology': ['https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80'],
    'sports': ['https://images.unsplash.com/photo-1461896836934-bd45ba6343c8?auto=format&fit=crop&w=800&q=80'],
    'science': ['https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80'],
    'movies': ['https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80'],
    'food': ['https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&w=800&q=80'],
    'travel': ['https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'],
    'default': ['https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80'],
};

function getPlaceholder(category: string): string {
    const imgs = PLACEHOLDER_IMAGES[category] || PLACEHOLDER_IMAGES['default'];
    return imgs[Math.floor(Math.random() * imgs.length)];
}

function mapInterestToCategory(interest: string): string {
    const map: Record<string, string> = {
        'gaming': 'gaming', 'videojuegos': 'gaming', 'juegos': 'gaming',
        'música': 'music', 'music': 'music', 'rap': 'music', 'rock': 'music', 'pop': 'music',
        'tecnología': 'technology', 'technology': 'technology', 'programación': 'technology',
        'deportes': 'sports', 'football': 'sports', 'fútbol': 'sports',
        'ciencia': 'science', 'science': 'science',
        'cine': 'movies', 'películas': 'movies', 'anime': 'movies',
        'cocina': 'food', 'comida': 'food',
        'viajes': 'travel',
        'arte': 'art', 'fotografía': 'art',
    };
    const key = interest.toLowerCase();
    for (const [k, v] of Object.entries(map)) {
        if (key.includes(k)) return v;
    }
    return 'default';
}

// ====== MAIN FEED GENERATOR ======
export async function GET() {
    try {
        const user = await getOrCreateUser();
        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

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
            return NextResponse.json({
                items: [],
                message: "Completa el onboarding para ver tu feed personalizado",
                needsOnboarding: true,
            });
        }

        // Check cache (version 5 = multimedia feed)
        const CURRENT_API_VERSION = 5;
        const interests = fullUser.interests.map((i: { topic: string }) => i.topic);
        const cacheKey = generateCacheKey(fullUser.id, interests);

        const existingCache = await db.query.feedCache.findFirst({
            where: eq(feedCache.cacheKey, cacheKey),
        });

        if (existingCache && existingCache.expiresAt > new Date() &&
            existingCache.feedData.length > 10 && existingCache.apiVersion === CURRENT_API_VERSION) {
            return NextResponse.json({
                items: existingCache.feedData,
                generatedAt: existingCache.generatedAt?.toISOString() || new Date().toISOString(),
                userLocation: fullUser.locations[0].city,
                totalSources: 7,
                cached: true,
            });
        }

        // ====== PARALLEL CONTENT FETCHING ======
        console.log(`🎯 Generating multimedia feed for interests: ${interests.join(', ')}`);

        const location = {
            city: fullUser.locations[0].city || "España",
            country: fullUser.locations[0].countryCode || "ES"
        };

        const topInterests = interests.slice(0, 4);
        const allContent: ContentItem[] = [];

        // Fetch all content sources IN PARALLEL for speed
        const [
            newsResults,
            youtubeResults,
            redditResults,
            gamingResults,
            aiRecommendations,
            funFacts,
            localNews,
            wikiResults,
        ] = await Promise.allSettled([
            // 1. News (articles)
            fetchInterestNews(interests, 15).catch(() => []),
            // 2. YouTube videos
            Promise.all(topInterests.slice(0, 2).map(i => searchYouTubeVideos(i, 4))).then(r => r.flat()).catch(() => []),
            // 3. Reddit posts
            fetchRedditForInterests(topInterests, 12).catch(() => []),
            // 4. Gaming content
            getGamesByInterests(interests, 6).catch(() => []),
            // 5. AI Recommendations
            getAIRecommendations(interests, 3).catch(() => []),
            // 6. Fun Facts
            generateFunFacts(interests, 4).catch(() => []),
            // 7. Local news
            searchGoogleNewsRSS(`Noticias ${location.city}`, 8).catch(() => []),
            // 8. Wikipedia
            fetchWikipediaForInterests(interests).catch(() => []),
        ]);

        // ====== PROCESS NEWS ======
        if (newsResults.status === 'fulfilled') {
            for (const item of (newsResults.value as any[])) {
                allContent.push({
                    id: crypto.randomUUID(),
                    type: 'article',
                    title: item.title,
                    description: item.description,
                    url: item.url,
                    source: item.source,
                    publishedAt: item.publishedAt,
                    relevanceScore: 65,
                    category: mapInterestToCategory(interests[0] || 'general'),
                    imageUrl: item.socialimage || getPlaceholder('default'),
                    mediaType: 'link',
                    location: { city: 'Global', distance: 5000 },
                });
            }
        }

        // ====== PROCESS YOUTUBE ======
        if (youtubeResults.status === 'fulfilled') {
            for (const video of (youtubeResults.value as any[])) {
                allContent.push({
                    id: crypto.randomUUID(),
                    type: 'video',
                    title: video.title,
                    description: video.description?.slice(0, 200) || '',
                    url: video.url,
                    embedUrl: video.embedUrl,
                    thumbnailUrl: video.thumbnailUrl,
                    source: `YouTube · ${video.channelName}`,
                    publishedAt: video.publishedAt,
                    relevanceScore: 85,
                    category: 'video',
                    imageUrl: video.thumbnailUrl,
                    mediaType: 'youtube',
                    duration: video.duration,
                    interactionCount: video.viewCount,
                    icon: '🎬',
                });
            }
        }

        // ====== PROCESS REDDIT ======
        if (redditResults.status === 'fulfilled') {
            for (const post of (redditResults.value as any[])) {
                allContent.push({
                    id: crypto.randomUUID(),
                    type: 'reddit',
                    title: post.title,
                    description: post.description?.slice(0, 200) || '',
                    url: post.permalink || post.url,
                    thumbnailUrl: post.thumbnailUrl,
                    source: `Reddit · r/${post.subreddit}`,
                    publishedAt: post.publishedAt,
                    relevanceScore: 75,
                    category: 'community',
                    imageUrl: post.thumbnailUrl,
                    mediaType: 'reddit',
                    subreddit: post.subreddit,
                    score: post.score,
                    numComments: post.numComments,
                    icon: '💬',
                });
            }
        }

        // ====== PROCESS GAMING ======
        if (gamingResults.status === 'fulfilled') {
            for (const game of (gamingResults.value as any[])) {
                if (!game.name) continue;
                allContent.push({
                    id: crypto.randomUUID(),
                    type: 'game',
                    title: game.name,
                    description: game.description || `${game.genres?.join(', ')} — Rating: ${game.rating}/5`,
                    url: game.url || '#',
                    thumbnailUrl: game.backgroundImage,
                    source: 'RAWG',
                    publishedAt: game.released || new Date().toISOString(),
                    relevanceScore: 70,
                    category: 'gaming',
                    imageUrl: game.backgroundImage || getPlaceholder('gaming'),
                    mediaType: 'game',
                    interactionCount: game.metacritic || 0,
                    icon: '🎮',
                });
            }
        }

        // ====== PROCESS AI RECOMMENDATIONS ======
        if (aiRecommendations.status === 'fulfilled') {
            for (const rec of (aiRecommendations.value as any[])) {
                allContent.push({
                    id: crypto.randomUUID(),
                    type: 'recommendation',
                    title: rec.title,
                    description: rec.description,
                    url: `https://www.google.com/search?q=${encodeURIComponent(rec.searchQuery || rec.title)}`,
                    source: 'NearHype IA',
                    publishedAt: new Date().toISOString(),
                    relevanceScore: 90,
                    category: rec.category || 'recommendation',
                    imageUrl: getPlaceholder(rec.category || 'default'),
                    isRecommendation: true,
                    reason: rec.reason,
                    icon: rec.icon || '🎯',
                });
            }
        }

        // ====== PROCESS FUN FACTS ======
        if (funFacts.status === 'fulfilled') {
            for (const fact of (funFacts.value as any[])) {
                allContent.push({
                    id: crypto.randomUUID(),
                    type: 'fact',
                    title: fact.title,
                    description: fact.fact,
                    url: `https://www.google.com/search?q=${encodeURIComponent(fact.title)}`,
                    source: 'NearHype Facts',
                    publishedAt: new Date().toISOString(),
                    relevanceScore: 80,
                    category: 'fact',
                    imageUrl: getPlaceholder(mapInterestToCategory(fact.category || '')),
                    icon: fact.icon || '💡',
                });
            }
        }

        // ====== PROCESS LOCAL NEWS ======
        if (localNews.status === 'fulfilled') {
            for (const item of (localNews.value as any[])) {
                allContent.push({
                    id: crypto.randomUUID(),
                    type: 'article',
                    title: item.title,
                    description: item.description,
                    url: item.url,
                    source: item.source || 'Local',
                    publishedAt: item.publishedAt,
                    relevanceScore: 95,
                    category: 'news',
                    imageUrl: getPlaceholder('default'),
                    location: { city: location.city, distance: 0 },
                    icon: '📍',
                });
            }
        }

        // ====== PROCESS WIKIPEDIA ======
        if (wikiResults.status === 'fulfilled') {
            for (const item of (wikiResults.value as any[])) {
                allContent.push({
                    id: crypto.randomUUID(),
                    type: 'article',
                    title: item.title,
                    description: item.extract || item.description || '',
                    url: item.url,
                    source: 'Wikipedia',
                    publishedAt: new Date().toISOString(),
                    relevanceScore: 50,
                    category: 'knowledge',
                    imageUrl: item.thumbnail || getPlaceholder('default'),
                    icon: '📖',
                });
            }
        }

        // ====== DEDUPLICATE ======
        const seen = new Set<string>();
        const unique = allContent.filter(item => {
            const key = item.title.toLowerCase().slice(0, 60);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // ====== DIVERSIFICATION ALGORITHM ======
        // This is the "TikTok/YouTube algorithm" — ensures variety in the feed
        const diversified = diversifyFeed(unique, interests);

        // ====== CACHE ======
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min
        await db.delete(feedCache).where(eq(feedCache.cacheKey, cacheKey));
        await db.insert(feedCache).values({
            userId: user.id,
            feedData: diversified,
            cacheKey: cacheKey,
            expiresAt: expiresAt,
            apiVersion: CURRENT_API_VERSION,
        });

        const uniqueSourcesCount = new Set(diversified.map(item => item.source)).size;

        return NextResponse.json({
            items: diversified,
            generatedAt: new Date().toISOString(),
            userLocation: location.city,
            totalSources: uniqueSourcesCount,
            cached: false,
        });

    } catch (error) {
        console.error('Error generating feed:', error);
        return NextResponse.json({ error: "Error al generar el feed" }, { status: 500 });
    }
}

// ====== DIVERSIFICATION ALGORITHM ======
// Ensures the feed feels like TikTok/YouTube — varied, engaging, never boring
function diversifyFeed(items: ContentItem[], interests: string[]): ContentItem[] {
    // Group by type
    const byType: Record<string, ContentItem[]> = {};
    for (const item of items) {
        const type = item.type;
        if (!byType[type]) byType[type] = [];
        byType[type].push(item);
    }

    // Sort each group by relevanceScore
    for (const type of Object.keys(byType)) {
        byType[type].sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    // Build the feed using round-robin with weights
    // Target distribution: 
    //   30% articles/news, 20% videos, 15% reddit, 15% games/facts, 10% recommendations, 10% other
    const typeWeights: [string, number][] = [
        ['article', 3],
        ['video', 2],
        ['reddit', 1.5],
        ['game', 1],
        ['fact', 1],
        ['recommendation', 1],
    ];

    const result: ContentItem[] = [];
    const maxItems = 60;
    let round = 0;

    while (result.length < maxItems && round < 20) {
        for (const [type, weight] of typeWeights) {
            const pool = byType[type] || [];
            const take = Math.ceil(weight);
            for (let i = 0; i < take && pool.length > 0; i++) {
                const item = pool.shift();
                if (item) result.push(item);
            }
        }
        round++;
    }

    // Insert "Discover something new" cards every 10 items
    const recommendations = byType['recommendation'] || [];
    const finalFeed: ContentItem[] = [];
    let recIndex = 0;

    for (let i = 0; i < result.length; i++) {
        finalFeed.push(result[i]);
        // Every 10 items, insert a recommendation if available
        if ((i + 1) % 10 === 0 && recIndex < recommendations.length) {
            const rec = recommendations[recIndex];
            if (rec && !finalFeed.includes(rec)) {
                finalFeed.push(rec);
                recIndex++;
            }
        }
    }

    return finalFeed.slice(0, maxItems);
}

// ====== UTILITIES ======
function generateCacheKey(userId: string, interests: string[]): string {
    const raw = userId + interests.sort().join(',');
    return crypto.createHash('md5').update(raw).digest('hex');
}
