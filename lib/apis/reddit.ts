/**
 * Reddit JSON API Client
 * No auth required for public posts
 */

export interface RedditPost {
    title: string;
    url: string;
    selftext: string;
    subreddit: string;
    author: string;
    created: number;
    score: number;
    num_comments: number;
    permalink: string;
}

export async function fetchRedditPosts(
    subreddits: string[],
    limit: number = 10
): Promise<RedditPost[]> {
    try {
        const results: RedditPost[] = [];

        for (const subreddit of subreddits.slice(0, 3)) { // Limit to 3 subreddits to avoid rate limit
            try {
                const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`;

                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'NearHype:v1.0.0 (by /u/nearhype)'
                    }
                });

                if (!response.ok) {
                    console.warn(`Reddit API error for r/${subreddit}:`, response.status);
                    continue;
                }

                const data = await response.json();

                if (data.data && data.data.children) {
                    const posts = data.data.children.map((child: any) => child.data);
                    results.push(...posts);
                }
            } catch (error) {
                console.warn(`Error fetching r/${subreddit}:`, error);
            }
        }

        return results.slice(0, limit);
    } catch (error) {
        console.error('Error fetching Reddit posts:', error);
        return [];
    }
}

// Mapping de intereses a subreddits populares en español
export const interestToSubreddits: Record<string, string[]> = {
    "videojuegos": ["gaming", "Games", "pcgaming", "nintendo", "playstation", "xbox"],
    "gaming": ["gaming", "Games", "pcgaming"],
    "música": ["Music", "spotify", "concerts", "hiphopheads"],
    "music": ["Music", "spotify", "concerts"],
    "tecnología": ["technology", "tech", "gadgets", "programming"],
    "tech": ["technology", "tech", "gadgets"],
    "deportes": ["sports", "soccer", "nba", "nfl", "fitness"],
    "sports": ["sports", "soccer", "nba"],
    "gastronomía": ["food", "Cooking", "recipes", "FoodPorn"],
    "food": ["food", "Cooking", "recipes"],
    "cine": ["movies", "television", "netflix"],
    "cultura": ["books", "Art", "movies"],
    "viajes": ["travel", "solotravel", "EarthPorn"],
};

export function getSubredditsForInterests(interests: string[]): string[] {
    const subreddits = new Set<string>();

    interests.forEach(interest => {
        const normalized = interest.toLowerCase();
        const subs = interestToSubreddits[normalized] || [];
        subs.forEach(sub => subreddits.add(sub));
    });

    return Array.from(subreddits).slice(0, 5); // Max 5 subreddits
}
