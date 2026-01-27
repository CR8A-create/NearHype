/**
 * Utility functions for detecting and extracting IDs from media URLs
 */

/**
 * Detecta si una URL es de YouTube
 */
export function isYouTubeUrl(url: string): boolean {
    return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)/.test(url);
}

/**
 * Detecta si una URL es de Spotify
 */
export function isSpotifyUrl(url: string): boolean {
    return /^(https?:\/\/)?(open\.)?spotify\.com/.test(url);
}

/**
 * Extrae el video ID de una URL de YouTube
 * Soporta formatos:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 */
export function extractYouTubeId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/  // Direct ID
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
}

/**
 * Extrae el track/playlist/album ID de una URL de Spotify
 * Soporta formatos:
 * - https://open.spotify.com/track/TRACK_ID
 * - https://open.spotify.com/playlist/PLAYLIST_ID
 * - https://open.spotify.com/album/ALBUM_ID
 */
export function extractSpotifyId(url: string): { type: 'track' | 'playlist' | 'album'; id: string } | null {
    const match = url.match(/spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)/);

    if (match && match[1] && match[2]) {
        return {
            type: match[1] as 'track' | 'playlist' | 'album',
            id: match[2],
        };
    }

    return null;
}
