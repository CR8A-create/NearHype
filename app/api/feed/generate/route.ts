import { getOrCreateUser } from "@/lib/getOrCreateUser";
import { db } from "@/lib/db";
import { users, feedCache, communityPosts, communities } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { fetchInterestNews } from "@/lib/apis/newsapi";
import { fetchWikipediaForInterests } from "@/lib/apis/wikipedia";
import crypto from "crypto";
import { searchGoogleNewsRSS } from "@/lib/apis/free_search";
import { searchYouTubeVideos } from "@/lib/apis/youtube";
import { fetchRedditForInterests } from "@/lib/apis/reddit";
import { getGamesByInterests } from "@/lib/apis/gaming";
import { getAIRecommendations, generateFunFacts } from "@/lib/apis/recommendations";
import { fetchGDELTNews } from "@/lib/apis/gdelt";
import { fetchLocalEvents } from "@/lib/apis/events";
import type { ContentItem } from "@/lib/feed/types";
import { deduplicateItems } from "@/lib/feed/dedupe";
import { diversifyFeed } from "@/lib/feed/diversify";

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

        // Check cache (version 7 = multimedia feed + GDELT + local events)
        const CURRENT_API_VERSION = 7;
        // Read interests WITH weights
        const weightedInterests = fullUser.interests.map((i: { topic: string; relevanceWeight: number | null }) => ({
            topic: i.topic,
            weight: i.relevanceWeight ?? 1.0,
        }));
        // Sort by weight descending — highest-weight interests get priority
        weightedInterests.sort((a, b) => b.weight - a.weight);

        const interests = weightedInterests.map(i => i.topic);
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
                totalSources: 8,
                cached: true,
            });
        }

        // ====== COMPUTE WEIGHTED SLOTS ======
        const avgWeight = weightedInterests.reduce((sum, i) => sum + i.weight, 0) / weightedInterests.length;
        const BASE_SLOTS = 3; // baseline items per interest
        const slotsMap = new Map<string, number>();
        for (const { topic, weight } of weightedInterests) {
            const slots = Math.max(1, Math.min(5, Math.round(BASE_SLOTS * weight / avgWeight)));
            slotsMap.set(topic, slots);
        }
        console.log(`🎯 Weighted interests: ${weightedInterests.map(i => `${i.topic}(w=${i.weight.toFixed(2)},s=${slotsMap.get(i.topic)})`).join(', ')}`);

        // ====== PARALLEL CONTENT FETCHING ======
        const location = {
            city: fullUser.locations[0].city || "España",
            country: fullUser.locations[0].countryCode || "ES"
        };

        // Top interests (already sorted by weight desc)
        const topInterests = interests.slice(0, 4);
        const totalNewsSlots = interests.reduce((sum, t) => sum + (slotsMap.get(t) || BASE_SLOTS), 0);
        const allContent: ContentItem[] = [];

        // YouTube: top 2 interests by weight, weighted slots each
        const ytInterests = topInterests.slice(0, 2);
        const ytSlots = ytInterests.map(t => slotsMap.get(t) || BASE_SLOTS);

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
            gdeltResults,
            eventsResults,
        ] = await Promise.allSettled([
            // 1. News (articles) — total slots based on sum of weights
            fetchInterestNews(interests, Math.min(totalNewsSlots, 20)).catch(() => []),
            // 2. YouTube videos — weighted slots per interest
            Promise.all(ytInterests.map((interest, idx) => searchYouTubeVideos(interest, ytSlots[idx] + 1))).then(r => r.flat()).catch(() => []),
            // 3. Reddit posts — weighted total
            fetchRedditForInterests(topInterests, Math.min(totalNewsSlots, 15)).catch(() => []),
            // 4. Gaming content
            getGamesByInterests(interests, 6).catch(() => []),
            // 5. AI Recommendations
            getAIRecommendations(interests, 3).catch(() => []),
            // 6. Fun Facts
            generateFunFacts(interests, 4).catch(() => []),
            // 7. Local news
            searchGoogleNewsRSS(`Noticias ${location.city}`, 8).catch(() => []),
            // 8. Wikipedia — top interests by weight
            fetchWikipediaForInterests(topInterests).catch(() => []),
            // 9. GDELT — global event news filtered by interests + user location
            // NOTE: keywords include city/country for geographic relevance since GDELT has no
            // native geo-filter; passing them as OR terms alongside interests.
            fetchGDELTNews([...topInterests, location.city, location.country], "spanish", 10).catch(() => []),
            // 10. Local events — Eventbrite + Meetup, city-specific
            fetchLocalEvents(location.city, topInterests, 8).catch(() => []),
        ]);

        // ====== PROCESS NEWS ======
        if (newsResults.status === 'fulfilled') {
            for (const item of newsResults.value) {
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
                    // Only use a real image URL — no placeholder fallback for text articles
                    imageUrl: item.socialimage || undefined,
                    mediaType: 'link',
                    location: { city: 'Global', distance: 5000 },
                });
            }
        }

        // ====== PROCESS YOUTUBE ======
        if (youtubeResults.status === 'fulfilled') {
            for (const video of youtubeResults.value) {
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
            for (const post of redditResults.value) {
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
            for (const game of gamingResults.value) {
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
            for (const rec of aiRecommendations.value) {
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
            for (const fact of funFacts.value) {
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
            for (const item of localNews.value) {
                allContent.push({
                    id: crypto.randomUUID(),
                    type: 'article',
                    title: item.title,
                    // Google News RSS sets description = title (no real snippet); leave blank
                    description: '',
                    url: item.url,
                    source: item.source || 'Local',
                    publishedAt: item.publishedAt,
                    relevanceScore: 95,
                    category: 'news',
                    // RSS feed carries no images — undefined is better than a repeated placeholder
                    imageUrl: undefined,
                    location: { city: location.city, distance: 0 },
                    icon: '📍',
                });
            }
        }

        // ====== PROCESS WIKIPEDIA ======
        if (wikiResults.status === 'fulfilled') {
            for (const item of wikiResults.value) {
                allContent.push({
                    id: crypto.randomUUID(),
                    type: 'article',
                    title: item.title,
                    description: item.description || '',
                    url: item.url,
                    source: 'Wikipedia',
                    publishedAt: new Date().toISOString(),
                    relevanceScore: 50,
                    category: 'knowledge',
                    // wikipedia.ts returns the thumbnail as `socialimage`, not `thumbnail`
                    imageUrl: item.socialimage || undefined,
                    icon: '📖',
                });
            }
        }

        // ====== PROCESS GDELT ======
        // NOTE: gdelt.ts maps article.socialimage to the 'description' field instead of a text
        // description — this is a quirk of the current implementation. We use item.title as
        // the visible description and treat item.description as the image URL.
        if (gdeltResults.status === 'fulfilled') {
            for (const item of gdeltResults.value) {
                if (!item.title || !item.url) continue;
                allContent.push({
                    id: crypto.randomUUID(),
                    type: 'article',
                    title: item.title,
                    // item.description holds the socialimage URL, not text — use title as fallback
                    description: item.title,
                    url: item.url,
                    source: `GDELT · ${item.source}`,
                    publishedAt: item.publishedAt,
                    relevanceScore: 72,
                    category: mapInterestToCategory(topInterests[0] || 'general'),
                    // item.description from gdelt.ts is `socialimage || title` — only use it as
                    // imageUrl when it's actually a URL (starts with http), otherwise undefined
                    imageUrl: item.description?.startsWith('http') ? item.description : undefined,
                    mediaType: 'link',
                    location: item.location
                        ? { city: item.location, distance: 100 }
                        : { city: location.city, distance: 50 },
                    icon: '🌍',
                });
            }
        }

        // ====== PROCESS LOCAL EVENTS ======
        if (eventsResults.status === 'fulfilled') {
            for (const event of eventsResults.value) {
                if (!event.title || !event.url) continue;
                allContent.push({
                    id: event.id || crypto.randomUUID(),
                    type: 'event',
                    title: event.title,
                    description: event.description || '',
                    url: event.url,
                    source: event.source,
                    publishedAt: event.startDate || new Date().toISOString(),
                    relevanceScore: 88,
                    category: event.category || mapInterestToCategory(topInterests[0] || 'general'),
                    imageUrl: event.imageUrl || getPlaceholder('default'),
                    location: { city: location.city, distance: 0 },
                    startDate: event.startDate,
                    eventLocation: event.location,
                    icon: '📅',
                });
            }
        }

        // ====== FETCH COMMUNITY POSTS ======
        try {
            const lowerInterests = interests.map(i => i.toLowerCase());
            let communityPostsResult = await db
                .select({
                    id: communityPosts.id,
                    title: communityPosts.title,
                    content: communityPosts.content,
                    upvotes: communityPosts.upvotes,
                    commentCount: communityPosts.commentCount,
                    mediaUrl: communityPosts.mediaUrl,
                    createdAt: communityPosts.createdAt,
                    communityName: communities.name,
                    communitySlug: communities.slug,
                    communityIcon: communities.iconUrl,
                    authorUsername: users.username,
                    authorAvatar: users.avatarUrl,
                })
                .from(communityPosts)
                .innerJoin(communities, eq(communityPosts.communityId, communities.id))
                .innerJoin(users, eq(communityPosts.userId, users.id))
                .where(
                    sql`LOWER(${communities.category}) IN (${sql.join(
                        lowerInterests.map(i => sql`${i}`), sql`, `
                    )})`
                )
                .orderBy(
                    desc(sql`(COALESCE(${communityPosts.upvotes}, 0) * 2 + COALESCE(${communityPosts.commentCount}, 0))`)
                )
                .limit(10);

            // Fallback: if no matching communities, get top posts from any public community
            if (communityPostsResult.length === 0) {
                communityPostsResult = await db
                    .select({
                        id: communityPosts.id,
                        title: communityPosts.title,
                        content: communityPosts.content,
                        upvotes: communityPosts.upvotes,
                        commentCount: communityPosts.commentCount,
                        mediaUrl: communityPosts.mediaUrl,
                        createdAt: communityPosts.createdAt,
                        communityName: communities.name,
                        communitySlug: communities.slug,
                        communityIcon: communities.iconUrl,
                        authorUsername: users.username,
                        authorAvatar: users.avatarUrl,
                    })
                    .from(communityPosts)
                    .innerJoin(communities, eq(communityPosts.communityId, communities.id))
                    .innerJoin(users, eq(communityPosts.userId, users.id))
                    .where(eq(communities.isPublic, true))
                    .orderBy(
                        desc(sql`(COALESCE(${communityPosts.upvotes}, 0) * 2 + COALESCE(${communityPosts.commentCount}, 0))`)
                    )
                    .limit(5);
            }

            for (const post of communityPostsResult) {
                allContent.push({
                    id: post.id,
                    type: 'community_post',
                    title: post.title,
                    description: post.content?.slice(0, 200) || '',
                    url: `/communities/${post.communitySlug}`,
                    source: post.communityName,
                    publishedAt: post.createdAt?.toISOString() || new Date().toISOString(),
                    relevanceScore: 88,
                    category: 'community',
                    imageUrl: post.mediaUrl || post.communityIcon || undefined,
                    author: post.authorUsername,
                    community: post.communityName,
                    communitySlug: post.communitySlug,
                    score: post.upvotes || 0,
                    numComments: post.commentCount || 0,
                    icon: '👥',
                });
            }
            console.log(`👥 Community posts added: ${communityPostsResult.length}`);
        } catch (err) {
            console.error('Error fetching community posts for feed:', err);
        }

        // ====== ENHANCED DEDUPLICATE ======
        // Three-tier deduplication: URL → domain+word-similarity → title-prefix
        const unique = deduplicateItems(allContent);

        // ====== DIVERSIFICATION ALGORITHM ======
        // This is the "TikTok/YouTube algorithm" — ensures variety in the feed
        const diversified = diversifyFeed(unique);

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

// ====== UTILITIES ======
function generateCacheKey(userId: string, interests: string[]): string {
    const raw = userId + interests.sort().join(',');
    return crypto.createHash('md5').update(raw).digest('hex');
}
