// lib/feed/dedupe.ts
// Deduplicación del feed en 3 niveles:
//   1. URL exacta (normalizada)
//   2. Mismo dominio + similitud de título (Jaccard sobre palabras significativas) > 70%
//   3. Prefijo de título (primeros 60 caracteres)

import type { ContentItem } from './types';

export function getDomain(url: string): string {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return '';
    }
}

export function getSignificantWords(text: string): Set<string> {
    return new Set(
        text.toLowerCase()
            .split(/\s+/)
            .filter(w => w.length >= 4)
    );
}

export function getWordSimilarity(title1: string, title2: string): number {
    const words1 = getSignificantWords(title1);
    const words2 = getSignificantWords(title2);
    if (words1.size === 0 && words2.size === 0) return 1;
    if (words1.size === 0 || words2.size === 0) return 0;

    let shared = 0;
    for (const w of words1) {
        if (words2.has(w)) shared++;
    }

    // Jaccard-style: shared / total unique words
    const totalUnique = new Set([...words1, ...words2]).size;
    return totalUnique > 0 ? shared / totalUnique : 0;
}

export function deduplicateItems(items: ContentItem[]): ContentItem[] {
    const seenUrls = new Set<string>();
    const seenTitlePrefixes = new Set<string>();
    const kept: ContentItem[] = [];

    for (const item of items) {
        // Tier 1: Exact URL match
        const normalizedUrl = item.url.toLowerCase().replace(/\/+$/, '');
        if (seenUrls.has(normalizedUrl)) continue;

        // Tier 2: Same domain + word similarity > 70%
        const domain = getDomain(item.url);
        let isDomainDupe = false;
        if (domain) {
            for (const existing of kept) {
                if (getDomain(existing.url) === domain) {
                    if (getWordSimilarity(item.title, existing.title) > 0.7) {
                        isDomainDupe = true;
                        break;
                    }
                }
            }
        }
        if (isDomainDupe) continue;

        // Tier 3: Title prefix (original 60-char check)
        const titleKey = item.title.toLowerCase().slice(0, 60);
        if (seenTitlePrefixes.has(titleKey)) continue;

        seenUrls.add(normalizedUrl);
        seenTitlePrefixes.add(titleKey);
        kept.push(item);
    }

    return kept;
}
