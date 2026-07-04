// lib/apis/youtube.ts
// Fetches YouTube videos related to user interests using the free oEmbed + search approach

// Forma cruda de un resultado de búsqueda del API de Invidious
interface InvidiousRawVideo {
    videoId: string;
    title?: string;
    description?: string;
    descriptionHtml?: string;
    videoThumbnails?: Array<{ url?: string }>;
    author?: string;
    published: number;
    viewCount?: number;
    lengthSeconds: number;
}

interface YouTubeVideo {
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    channelName: string;
    publishedAt: string;
    viewCount?: number;
    duration?: string;
    embedUrl: string;
    url: string;
}

/**
 * Search YouTube for videos related to interests using Google RSS (no API key needed)
 * Falls back to Invidious API if RSS fails
 */
export async function searchYouTubeVideos(query: string, maxResults: number = 5): Promise<YouTubeVideo[]> {
    try {
        // Approach 1: Use Invidious (privacy-respecting YouTube frontend with free API)
        const instances = [
            'https://vid.puffyan.us',
            'https://invidious.snopyta.org',
            'https://yewtu.be',
            'https://inv.nadeko.net',
        ];

        for (const instance of instances) {
            try {
                const res = await fetch(
                    `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance&region=ES`,
                    { signal: AbortSignal.timeout(5000) }
                );
                if (!res.ok) continue;

                const data = await res.json();
                return (data as InvidiousRawVideo[]).slice(0, maxResults).map((item) => ({
                    id: item.videoId,
                    title: item.title || 'Video',
                    description: item.description || item.descriptionHtml?.replace(/<[^>]*>/g, '') || '',
                    thumbnailUrl: item.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
                    channelName: item.author || 'YouTube',
                    publishedAt: new Date(item.published * 1000).toISOString(),
                    viewCount: item.viewCount,
                    duration: formatDuration(item.lengthSeconds),
                    embedUrl: `https://www.youtube.com/embed/${item.videoId}`,
                    url: `https://www.youtube.com/watch?v=${item.videoId}`,
                }));
            } catch {
                continue;
            }
        }

        // Sin Invidious disponible no hay alternativa gratuita fiable server-side
        return [];
    } catch (error) {
        console.error('YouTube search error:', error);
        return [];
    }
}

function formatDuration(seconds: number): string {
    if (!seconds) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Get trending/popular videos for a category
 */
export async function getTrendingVideos(category: string, maxResults: number = 5): Promise<YouTubeVideo[]> {
    return searchYouTubeVideos(`${category} trending 2024`, maxResults);
}
