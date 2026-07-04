// lib/feed/types.ts
// Tipo central de los items del feed. Lo consumen el generador
// (app/api/feed/generate) y la lógica pura de lib/feed/.

export interface ContentItem {
    id: string;
    type: 'article' | 'video' | 'music' | 'image' | 'game' | 'fact' | 'recommendation' | 'reddit' | 'community_post' | 'event';
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
    // Community post fields
    author?: string;
    community?: string;
    communitySlug?: string;
    // Event fields
    startDate?: string;
    eventLocation?: string;
}
