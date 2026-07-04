// lib/apis/reddit.ts
// Fetches popular Reddit posts from subreddits related to user interests (no API key needed)

// Forma cruda de un post en la respuesta JSON pública de Reddit
interface RedditRawChild {
    data: {
        id: string;
        title: string;
        selftext?: string;
        url?: string;
        url_overridden_by_dest?: string;
        subreddit: string;
        author: string;
        score: number;
        num_comments: number;
        thumbnail?: string;
        preview?: { images?: Array<{ source?: { url?: string } }> };
        created_utc: number;
        is_video?: boolean;
        media?: { reddit_video?: { fallback_url?: string } };
        permalink: string;
        stickied?: boolean;
        over_18?: boolean;
    };
}

interface RedditPost {
    id: string;
    title: string;
    description: string;
    url: string;
    subreddit: string;
    author: string;
    score: number;
    numComments: number;
    thumbnailUrl?: string;
    publishedAt: string;
    isVideo: boolean;
    videoUrl?: string;
    permalink: string;
}

// Map user interests to relevant subreddits
const INTEREST_SUBREDDITS: Record<string, string[]> = {
    'gaming': ['gaming', 'Games', 'pcgaming', 'PS5', 'NintendoSwitch'],
    'videojuegos': ['gaming', 'Games', 'pcgaming', 'PS5', 'NintendoSwitch'],
    'música': ['Music', 'listentothis', 'hiphopheads', 'indieheads', 'popheads'],
    'music': ['Music', 'listentothis', 'hiphopheads', 'indieheads', 'popheads'],
    'tecnología': ['technology', 'gadgets', 'programming', 'tech'],
    'technology': ['technology', 'gadgets', 'programming', 'tech'],
    'ciencia': ['science', 'space', 'askscience', 'EverythingScience'],
    'deportes': ['sports', 'soccer', 'nba', 'tennis'],
    'sports': ['sports', 'soccer', 'nba', 'formula1'],
    'cine': ['movies', 'MovieSuggestions', 'CinematicShots'],
    'películas': ['movies', 'MovieSuggestions', 'CinematicShots'],
    'anime': ['anime', 'animesuggest', 'manga'],
    'arte': ['Art', 'DigitalArt', 'drawing', 'painting'],
    'cocina': ['Cooking', 'food', 'FoodPorn', 'recipes'],
    'fitness': ['Fitness', 'bodyweightfitness', 'running'],
    'fotografía': ['photography', 'itookapicture', 'EarthPorn'],
    'viajes': ['travel', 'backpacking', 'solotravel'],
    'programación': ['programming', 'webdev', 'learnprogramming'],
    'moda': ['fashion', 'streetwear', 'malefashionadvice'],
    'naturaleza': ['NatureIsFuckingLit', 'EarthPorn', 'nature'],
    'humor': ['funny', 'memes', 'dankmemes'],
    'default': ['popular', 'all'],
};

function getSubredditsForInterest(interest: string): string[] {
    const key = interest.toLowerCase();
    if (INTEREST_SUBREDDITS[key]) return INTEREST_SUBREDDITS[key];
    for (const [k, v] of Object.entries(INTEREST_SUBREDDITS)) {
        if (key.includes(k) || k.includes(key)) return v;
    }
    return INTEREST_SUBREDDITS['default'];
}

/**
 * Fetch top posts from a subreddit using Reddit's JSON API (no auth needed)
 */
export async function fetchSubredditPosts(subreddit: string, limit: number = 5): Promise<RedditPost[]> {
    try {
        const res = await fetch(
            `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}&raw_json=1`,
            {
                headers: { 'User-Agent': 'NearHype/1.0' },
                signal: AbortSignal.timeout(5000),
            }
        );

        if (!res.ok) return [];
        const data = await res.json();

        return (data.data?.children || [])
            .filter((child: RedditRawChild) => !child.data.stickied && !child.data.over_18)
            .map((child: RedditRawChild) => {
                const post = child.data;
                return {
                    id: post.id,
                    title: post.title,
                    description: post.selftext?.slice(0, 300) || '',
                    url: post.url_overridden_by_dest || post.url || `https://reddit.com${post.permalink}`,
                    subreddit: post.subreddit,
                    author: post.author,
                    score: post.score,
                    numComments: post.num_comments,
                    thumbnailUrl: post.thumbnail && !['self', 'default', 'nsfw'].includes(post.thumbnail)
                        ? post.thumbnail
                        : post.preview?.images?.[0]?.source?.url || undefined,
                    publishedAt: new Date(post.created_utc * 1000).toISOString(),
                    isVideo: post.is_video || false,
                    videoUrl: post.media?.reddit_video?.fallback_url,
                    permalink: `https://reddit.com${post.permalink}`,
                };
            });
    } catch (error) {
        console.error(`Error fetching r/${subreddit}:`, error);
        return [];
    }
}

/**
 * Fetch Reddit content for a list of interests
 */
export async function fetchRedditForInterests(interests: string[], maxTotal: number = 15): Promise<RedditPost[]> {
    const allPosts: RedditPost[] = [];
    const perInterest = Math.ceil(maxTotal / interests.length);

    for (const interest of interests.slice(0, 4)) {
        const subreddits = getSubredditsForInterest(interest);
        const selected = subreddits.sort(() => Math.random() - 0.5).slice(0, 2);

        for (const sub of selected) {
            const posts = await fetchSubredditPosts(sub, Math.ceil(perInterest / 2));
            allPosts.push(...posts);
            await new Promise(r => setTimeout(r, 300));
        }
    }

    return allPosts.slice(0, maxTotal);
}
