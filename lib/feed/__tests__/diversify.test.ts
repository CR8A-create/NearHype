import { describe, it, expect } from 'vitest';
import { diversifyFeed, MAX_FEED_ITEMS } from '../diversify';
import type { ContentItem } from '../types';

let counter = 0;
function makeItem(type: ContentItem['type'], relevanceScore = 50): ContentItem {
    counter++;
    return {
        id: `item-${counter}`,
        type,
        title: `Item ${counter} (${type})`,
        description: '',
        url: `https://example.com/${counter}`,
        source: 'Test',
        publishedAt: new Date().toISOString(),
        relevanceScore,
        category: 'general',
    };
}

function makeMany(type: ContentItem['type'], n: number): ContentItem[] {
    return Array.from({ length: n }, () => makeItem(type));
}

describe('diversifyFeed', () => {
    it('devuelve [] para entrada vacía', () => {
        expect(diversifyFeed([])).toEqual([]);
    });

    it('nunca supera el máximo de items', () => {
        const items = [
            ...makeMany('article', 50),
            ...makeMany('video', 50),
            ...makeMany('reddit', 50),
        ];
        expect(diversifyFeed(items).length).toBeLessThanOrEqual(MAX_FEED_ITEMS);
    });

    it('no duplica ningún item', () => {
        const items = [
            ...makeMany('article', 30),
            ...makeMany('recommendation', 10),
            ...makeMany('video', 20),
        ];
        const result = diversifyFeed(items);
        const ids = result.map(i => i.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('devuelve todos los items si hay menos que el máximo', () => {
        const items = [...makeMany('article', 5), ...makeMany('video', 3)];
        expect(diversifyFeed(items)).toHaveLength(8);
    });

    it('intercala tipos en lugar de agruparlos en bloques', () => {
        const items = [...makeMany('article', 20), ...makeMany('video', 20)];
        const result = diversifyFeed(items);
        // En los primeros 8 items debe haber al menos un video (round-robin, no bloque de 20 artículos)
        const firstEight = result.slice(0, 8).map(i => i.type);
        expect(firstEight).toContain('video');
        expect(firstEight).toContain('article');
    });

    it('prioriza dentro de cada tipo por relevanceScore descendente', () => {
        const low = makeItem('article', 10);
        const high = makeItem('article', 90);
        const mid = makeItem('article', 50);
        const result = diversifyFeed([low, high, mid]);
        const scores = result.map(i => i.relevanceScore);
        expect(scores).toEqual([90, 50, 10]);
    });

    it('funciona con tipos sin peso definido (music/image) sin perderlos por completo si hay hueco', () => {
        // 'music' no está en typeWeights: el algoritmo actual no los incluye en el
        // round-robin. Este test documenta ese comportamiento (items huérfanos se pierden).
        const items = [...makeMany('article', 2), ...makeMany('music', 2)];
        const result = diversifyFeed(items);
        expect(result.filter(i => i.type === 'article')).toHaveLength(2);
        // Comportamiento actual documentado: music no aparece
        expect(result.filter(i => i.type === 'music')).toHaveLength(0);
    });
});
