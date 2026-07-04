
// lib/apis/free_search.ts - Búsqueda gratuita usando DuckDuckGo HTML
// Alternativa a Google Custom Search para usuarios sin API Keys de pago

interface SearchResult {
    title: string;
    description: string;
    url: string;
    source: string;
    publishedAt: string;
    socialimage?: string;
}

export async function searchDuckDuckGo(query: string, region: string = 'es-es', limit: number = 10): Promise<SearchResult[]> {
    try {
        // Usamos la versión HTML que es más fácil de parsear y no requiere JS
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=${region}`;

        // Rotación de User-Agents
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.101 Safari/537.36'
        ];
        const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];

        // Pequeño delay aleatorio (100-500ms) para parecer más humano
        await new Promise(r => setTimeout(r, 100 + Math.random() * 400));

        const res = await fetch(url, {
            headers: {
                'User-Agent': randomUA,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3',
            }
        });

        if (!res.ok) {
            console.error('DuckDuckGo error:', res.status);
            return [];
        }

        const html = await res.text();
        return parseDuckDuckGoHTML(html).slice(0, limit);

    } catch (error) {
        console.error('Error searching DuckDuckGo:', error);
        return [];
    }
}

function parseDuckDuckGoHTML(html: string): SearchResult[] {
    const results: SearchResult[] = [];

    // Regex simples para extraer resultados del HTML de DDG
    // Estructura típica: <div class="result__body">...<a class="result__a" href="...">Title</a>...<a class="result__snippet" ...>Snippet</a>

    // NOTA: El parsing de HTML con Regex no es ideal, pero evita dependencias pesadas como cheerio.
    // Buscamos bloques que parecen resultados

    // Dividir por resultados
    const rawResults = html.split('class="result__body"');

    // Saltamos el primero que suele ser basura antes del primer resultado
    for (let i = 1; i < rawResults.length; i++) {
        const block = rawResults[i];

        // Extraer URL y Título
        // <a class="result__a" href="//duckduckgo.com/l/?uddg=..." >Título</a>
        const linkMatch = block.match(/class="result__a" href="([^"]+)">(.*?)<\/a>/);
        if (!linkMatch) continue;

        let url = linkMatch[1];
        const title = linkMatch[2].replace(/<[^>]+>/g, ''); // Limpiar tags HTML

        // Decodificar URL de redirección de DDG si es necesario
        if (url.includes('uddg=')) {
            try {
                const urlParams = new URLSearchParams(url.split('?')[1]);
                url = decodeURIComponent(urlParams.get('uddg') || url);
            } catch (e) {
                // Fallback si falla el parseo
            }
        }

        // Extraer Snippet
        // <a class="result__snippet" ...>Snippet</a>
        const snippetMatch = block.match(/class="result__snippet"[^>]*>(.*?)<\/a>/);
        const description = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '') : '';

        // Extraer Icono/Imagen si hay (DDG a veces pone favicons)
        // <img ... src="...">
        const imgMatch = block.match(/<img[^>]+src="([^"]+)"/);
        const image = imgMatch && !imgMatch[1].includes('duckduckgo.com') ? imgMatch[1] : undefined;

        // Intentar adivinar la fuente por el dominio
        let source = 'Web';
        try {
            source = new URL(url).hostname.replace('www.', '');
        } catch (e) { }

        results.push({
            title,
            description,
            url,
            source,
            publishedAt: new Date().toISOString(), // DDG no da fechas exactas fácilmente en HTML
            socialimage: image
        });
    }

    return results;
}

export async function searchGoogleNewsRSS(query: string, limit: number = 10): Promise<SearchResult[]> {
    try {
        // Google News RSS Feed (mucho más robusto y sin rate limits agresivos)
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=es&gl=ES&ceid=ES:es`;
        console.log(`[GoogleRSS] Searching: ${url}`);

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Google News RSS error: ${res.status}`);

        const xml = await res.text();
        console.log(`[GoogleRSS] XML Length: ${xml.length}`);

        const results: SearchResult[] = [];

        // Parseo simple de XML con Regex para no añadir dependencias
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        const titleRegex = /<title>(.*?)<\/title>/;
        const linkRegex = /<link>(.*?)<\/link>/;
        const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
        const sourceRegex = /<source url=".*?">(.*?)<\/source>/;

        let match;
        while ((match = itemRegex.exec(xml)) !== null && results.length < limit) {
            const itemContent = match[1];

            const titleMatch = titleRegex.exec(itemContent);
            const linkMatch = linkRegex.exec(itemContent);
            const dateMatch = pubDateRegex.exec(itemContent);
            const sourceMatch = sourceRegex.exec(itemContent);

            if (titleMatch && linkMatch) {
                results.push({
                    title: titleMatch[1].replace(' - ' + (sourceMatch?.[1] || ''), ''), // Limpiar título
                    description: titleMatch[1], // RSS a veces no tiene descripción, usamos título
                    url: linkMatch[1],
                    source: sourceMatch?.[1] || 'Google News',
                    publishedAt: dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString(),
                    socialimage: undefined // RSS no trae imagen, el cliente usará placeholder
                });
            }
        }
        console.log(`[GoogleRSS] Found ${results.length} items for "${query}"`);

        return results;

    } catch (error) {
        console.error('Error searching Google News:', error);
        return [];
    }
}
