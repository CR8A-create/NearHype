// lib/feed/diversify.ts
// Diversificación del feed: round-robin ponderado por tipo de contenido para
// que el feed se sienta variado (estilo TikTok/YouTube), con tarjetas de
// recomendación intercaladas cada 10 items. Máximo 60 items.

import type { ContentItem } from './types';

export const MAX_FEED_ITEMS = 60;

export function diversifyFeed(items: ContentItem[]): ContentItem[] {
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
    //   25% articles, 20% community_post, 15% videos, 15% reddit, 7.5% games, 7.5% facts, 10% recommendations
    const typeWeights: [string, number][] = [
        ['article', 2.5],
        ['community_post', 2],
        ['video', 1.5],
        ['reddit', 1.5],
        ['event', 1.5],
        ['game', 0.75],
        ['fact', 0.75],
        ['recommendation', 1],
    ];

    const result: ContentItem[] = [];
    let round = 0;

    while (result.length < MAX_FEED_ITEMS && round < 20) {
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

    return finalFeed.slice(0, MAX_FEED_ITEMS);
}
