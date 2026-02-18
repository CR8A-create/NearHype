"use client";

// Link Embed Component
export function LinkEmbed({ url }: { url: string }) {
    const isYouTube = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)/.test(url);
    const isSpotify = /^(https?:\/\/)?(open\.)?spotify\.com/.test(url);

    if (isYouTube) {
        return <YouTubeEmbed url={url} />;
    }

    if (isSpotify) {
        return <SpotifyEmbed url={url} />;
    }

    // Fallback para otros links
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 bg-white/5 border border-white/10 rounded-lg hover:border-indigo-500/50 transition mb-3"
        >
            <div className="flex items-center gap-2 text-indigo-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span className="text-sm truncate">{url}</span>
            </div>
        </a>
    );
}

// YouTube Embed Component
export function YouTubeEmbed({ url }: { url: string }) {
    const extractYouTubeId = (url: string): string | null => {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        return null;
    };

    const videoId = extractYouTubeId(url);

    if (!videoId) {
        return null;
    }

    return (
        <div className="mb-3 rounded-lg overflow-hidden">
            <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                className="w-full aspect-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="YouTube video"
            />
        </div>
    );
}

// Spotify Embed Component
export function SpotifyEmbed({ url }: { url: string }) {
    const extractSpotifyId = (url: string): { type: string; id: string } | null => {
        const match = url.match(/spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)/);

        if (match && match[1] && match[2]) {
            return {
                type: match[1],
                id: match[2],
            };
        }
        return null;
    };

    const spotifyData = extractSpotifyId(url);

    if (!spotifyData) {
        return null;
    }

    const height = spotifyData.type === 'track' ? '152' : '352';

    return (
        <div className="mb-3 rounded-lg overflow-hidden">
            <iframe
                src={`https://open.spotify.com/embed/${spotifyData.type}/${spotifyData.id}`}
                width="100%"
                height={height}
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                title="Spotify embed"
            />
        </div>
    );
}
