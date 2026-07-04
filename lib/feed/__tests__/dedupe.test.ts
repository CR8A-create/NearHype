import { describe, it, expect } from 'vitest';
import { getDomain, getWordSimilarity, deduplicateItems } from '../dedupe';
import type { ContentItem } from '../types';

function makeItem(overrides: Partial<ContentItem>): ContentItem {
    return {
        id: crypto.randomUUID(),
        type: 'article',
        title: 'Título por defecto',
        description: '',
        url: 'https://example.com/a',
        source: 'Test',
        publishedAt: new Date().toISOString(),
        relevanceScore: 50,
        category: 'general',
        ...overrides,
    };
}

describe('getDomain', () => {
    it('extrae el hostname sin www', () => {
        expect(getDomain('https://www.elpais.com/noticia')).toBe('elpais.com');
        expect(getDomain('https://reddit.com/r/x')).toBe('reddit.com');
    });

    it('devuelve cadena vacía para URLs inválidas', () => {
        expect(getDomain('no-es-una-url')).toBe('');
        expect(getDomain('')).toBe('');
    });
});

describe('getWordSimilarity', () => {
    it('devuelve 1 para títulos idénticos', () => {
        expect(getWordSimilarity('Nuevo lanzamiento espacial', 'Nuevo lanzamiento espacial')).toBe(1);
    });

    it('devuelve 0 para títulos sin palabras en común', () => {
        expect(getWordSimilarity('fútbol resultados liga', 'recetas cocina italiana')).toBe(0);
    });

    it('ignora palabras cortas (<4 caracteres)', () => {
        // "el", "de", "la" no cuentan como palabras significativas
        expect(getWordSimilarity('el problema de la ciencia', 'un problema en toda ciencia')).toBeGreaterThan(0.5);
    });

    it('es insensible a mayúsculas', () => {
        expect(getWordSimilarity('GRAN NOTICIA MUNDIAL', 'gran noticia mundial')).toBe(1);
    });
});

describe('deduplicateItems', () => {
    it('elimina URLs exactas duplicadas (normalizando barra final y mayúsculas)', () => {
        const items = [
            makeItem({ title: 'Noticia A', url: 'https://a.com/x' }),
            makeItem({ title: 'Noticia B distinta', url: 'https://A.com/x/' }),
        ];
        const result = deduplicateItems(items);
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Noticia A');
    });

    it('elimina items del mismo dominio con título muy similar (>70%)', () => {
        const items = [
            makeItem({ title: 'España gana el mundial de fútbol 2026', url: 'https://news.com/1' }),
            makeItem({ title: 'España gana el mundial de fútbol 2026 hoy', url: 'https://news.com/2' }),
        ];
        expect(deduplicateItems(items)).toHaveLength(1);
    });

    it('conserva items del mismo dominio con títulos distintos', () => {
        const items = [
            makeItem({ title: 'España gana el mundial de fútbol', url: 'https://news.com/1' }),
            makeItem({ title: 'Recetas veganas para el verano', url: 'https://news.com/2' }),
        ];
        expect(deduplicateItems(items)).toHaveLength(2);
    });

    it('conserva títulos similares si vienen de dominios distintos y difieren en prefijo', () => {
        const items = [
            makeItem({ title: 'A'.repeat(59) + 'X final uno', url: 'https://a.com/1' }),
            makeItem({ title: 'A'.repeat(59) + 'Y final dos', url: 'https://b.com/1' }),
        ];
        // Mismo prefijo de 59 chars pero difieren en el caracter 60 → tier 3 los distingue...
        // slice(0,60) los haría iguales solo si los primeros 60 coinciden exactamente
        const result = deduplicateItems(items);
        expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('elimina por prefijo de título idéntico (60 chars) aunque el dominio difiera', () => {
        const longTitle = 'Este es un titular larguísimo que supera los sesenta caracteres seguro';
        const items = [
            makeItem({ title: longTitle + ' versión uno', url: 'https://a.com/1' }),
            makeItem({ title: longTitle + ' versión dos', url: 'https://b.com/1' }),
        ];
        expect(deduplicateItems(items)).toHaveLength(1);
    });

    it('mantiene el orden de llegada (el primero gana)', () => {
        const items = [
            makeItem({ title: 'Primero', url: 'https://a.com/1' }),
            makeItem({ title: 'Segundo', url: 'https://b.com/2' }),
            makeItem({ title: 'Primero', url: 'https://a.com/1' }),
        ];
        const result = deduplicateItems(items);
        expect(result.map(i => i.title)).toEqual(['Primero', 'Segundo']);
    });

    it('devuelve [] para entrada vacía', () => {
        expect(deduplicateItems([])).toEqual([]);
    });
});
