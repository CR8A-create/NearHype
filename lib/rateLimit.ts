// lib/rateLimit.ts
// Rate limiting en memoria por ventana deslizante (coste 0 €, sin servicios externos).
//
// Limitación conocida: el estado vive en la memoria de cada instancia
// (en Vercel serverless cada lambda tiene la suya), así que el límite efectivo
// es por instancia. Suficiente como primera barrera contra abuso y bucles;
// si el proyecto escala, migrar a un almacén compartido (p. ej. Upstash free tier).
//
// Límites por usuario (o IP si no está autenticado):
//   - Lecturas (GET): generosas, porque las llamadas WebRTC hacen polling ~75 req/min.
//   - Escrituras (POST/PUT/PATCH/DELETE): más estrictas.

const WINDOW_MS = 60_000;
export const READ_LIMIT_PER_MINUTE = 300;
export const WRITE_LIMIT_PER_MINUTE = 60;

type Bucket = {
    /** timestamps (ms) de las peticiones dentro de la ventana */
    hits: number[];
};

const buckets = new Map<string, Bucket>();

// Evitar crecimiento sin límite: purga periódica de claves inactivas
let lastSweep = 0;
function sweep(now: number) {
    if (now - lastSweep < WINDOW_MS) return;
    lastSweep = now;
    for (const [key, bucket] of buckets) {
        if (bucket.hits.length === 0 || bucket.hits[bucket.hits.length - 1] < now - WINDOW_MS) {
            buckets.delete(key);
        }
    }
}

export type RateLimitResult =
    | { ok: true }
    | { ok: false; retryAfterSeconds: number };

/**
 * Registra una petición para `key` y devuelve si está dentro del límite.
 * `now` es inyectable para tests.
 */
export function checkRateLimit(key: string, isWrite: boolean, now: number = Date.now()): RateLimitResult {
    sweep(now);

    const limit = isWrite ? WRITE_LIMIT_PER_MINUTE : READ_LIMIT_PER_MINUTE;
    const bucketKey = `${key}:${isWrite ? 'w' : 'r'}`;

    let bucket = buckets.get(bucketKey);
    if (!bucket) {
        bucket = { hits: [] };
        buckets.set(bucketKey, bucket);
    }

    // Descartar hits fuera de la ventana
    const windowStart = now - WINDOW_MS;
    while (bucket.hits.length > 0 && bucket.hits[0] <= windowStart) {
        bucket.hits.shift();
    }

    if (bucket.hits.length >= limit) {
        const oldest = bucket.hits[0];
        const retryAfterSeconds = Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000));
        return { ok: false, retryAfterSeconds };
    }

    bucket.hits.push(now);
    return { ok: true };
}

/** Solo para tests: vacía el estado. */
export function resetRateLimiter() {
    buckets.clear();
    lastSweep = 0;
}
