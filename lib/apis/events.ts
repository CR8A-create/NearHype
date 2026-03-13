/**
 * Local Events API client
 * Sources: Eventbrite public endpoint (Fuente A), Meetup HTML scraper (Fuente B)
 *
 * Both sources are best-effort and may be unavailable — see individual TODO comments.
 * fetchLocalEvents() always returns [] on failure, never throws.
 */

import crypto from 'crypto';

export interface LocalEventItem {
    id: string;
    title: string;
    description: string;
    url: string;
    imageUrl?: string;
    location?: string;  // venue name / address string
    city?: string;
    startDate?: string; // ISO 8601 or YYYY-MM-DDTHH:mm:ss
    endDate?: string;
    category?: string;
    source: string;
    externalId?: string;
}

// ─────────────────────────────────────────────────────────────
// Fuente A — Eventbrite undocumented public destination endpoint
//
// TODO: This endpoint (/api/v3/destination/search/) is an internal Eventbrite
//       API used by their own frontend. It may:
//       - Return 401/403 if Eventbrite enforces OAuth on server-side requests
//       - Change structure without notice (undocumented)
//       - Rate-limit by IP
//       If it fails consistently, replace with Ticketmaster Discovery API
//       (free tier, 5000 req/day) or a public Google News RSS for event keywords.
// ─────────────────────────────────────────────────────────────
async function fetchEventbrite(
    city: string,
    interests: string[],
    limit: number,
): Promise<LocalEventItem[]> {
    const q = encodeURIComponent(interests[0] || 'eventos');
    const cityEnc = encodeURIComponent(city);
    const url =
        `https://www.eventbrite.com/api/v3/destination/search/` +
        `?dedup=true&place.address.city=${cityEnc}&page_size=${limit}` +
        `&expand=event_description,primary_venue&q=${q}`;

    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NearHype/1.0)',
            'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
        console.warn(`[events] Eventbrite returned ${res.status} — skipping`);
        return [];
    }

    const data = await res.json();

    // Undocumented endpoint: events may be under different keys depending on response version
    const events: any[] = data.events?.results ?? data.events ?? [];

    return events.slice(0, limit).map((e: any) => ({
        id: crypto.randomUUID(),
        externalId: `eventbrite-${e.id}`,
        title: e.name?.text ?? e.name ?? 'Sin título',
        description: (e.description?.text ?? e.summary ?? '').slice(0, 300),
        url: e.url ?? `https://www.eventbrite.com/e/${e.id}`,
        imageUrl: e.logo?.url ?? e.logo?.original?.url,
        location: e.primary_venue?.name ?? e.venue?.name ?? city,
        city,
        startDate: e.start?.local ?? e.start?.utc,
        endDate: e.end?.local ?? e.end?.utc,
        category: (e.category?.name ?? 'event').toLowerCase(),
        source: 'Eventbrite',
    }));
}

// ─────────────────────────────────────────────────────────────
// Fuente B — Meetup HTML scraper
//
// TODO: Meetup is a React SPA. The /find/ page may return minimal SSR HTML with
//       little or no event data-event-id attributes, as most content is injected
//       client-side after hydration. Additionally:
//       - Meetup may return 403 for non-browser User-Agents
//       - data-event-id attributes are present in older page versions only
//       - data-event-name may not appear in the same element as data-event-id
//       If this source consistently returns [], consider using:
//         • Meetup public RSS: https://www.meetup.com/{group}/events.rss
//         • Meetup GraphQL (no auth for public groups)
// ─────────────────────────────────────────────────────────────
async function fetchMeetup(
    city: string,
    interests: string[],
    limit: number,
): Promise<LocalEventItem[]> {
    const interest = encodeURIComponent(interests[0] || 'tech');
    const cityEnc = encodeURIComponent(city);
    const url = `https://www.meetup.com/find/?keywords=${interest}&location=${cityEnc}&source=EVENTS`;

    const res = await fetch(url, {
        headers: {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'es-ES,es;q=0.9',
        },
        signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
        console.warn(`[events] Meetup returned ${res.status} — skipping`);
        return [];
    }

    const html = await res.text();
    const events: LocalEventItem[] = [];

    // Extract data-event-id attributes
    const idMatches = [...html.matchAll(/data-event-id="([^"]+)"/g)];

    for (const match of idMatches.slice(0, limit)) {
        const eventId = match[1];

        // Try to find event name in an adjacent data-event-name attribute on the same element
        const nameMatch = html.match(
            new RegExp(`data-event-id="${eventId}"[^>]*data-event-name="([^"]+)"`),
        ) ?? html.match(
            new RegExp(`data-event-name="([^"]+)"[^>]*data-event-id="${eventId}"`),
        );
        const title = nameMatch
            ? decodeURIComponent(nameMatch[1].replace(/\+/g, ' '))
            : `Evento en ${city}`;

        events.push({
            id: crypto.randomUUID(),
            externalId: `meetup-${eventId}`,
            title,
            description: '',
            url: `https://www.meetup.com/events/${eventId}/`,
            city,
            category: (interests[0] ?? 'event').toLowerCase(),
            source: 'Meetup',
        });
    }

    return events;
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────
export async function fetchLocalEvents(
    city: string,
    interests: string[],
    limit: number,
): Promise<LocalEventItem[]> {
    const [eventbriteResult, meetupResult] = await Promise.allSettled([
        fetchEventbrite(city, interests, limit).catch((): LocalEventItem[] => []),
        fetchMeetup(city, interests, limit).catch((): LocalEventItem[] => []),
    ]);

    const all: LocalEventItem[] = [
        ...(eventbriteResult.status === 'fulfilled' ? eventbriteResult.value : []),
        ...(meetupResult.status === 'fulfilled' ? meetupResult.value : []),
    ];

    // Deduplicate by externalId or title prefix
    const seen = new Set<string>();
    const unique = all.filter((e) => {
        const key = e.externalId ?? e.title.toLowerCase().slice(0, 60);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return unique.slice(0, limit);
}
