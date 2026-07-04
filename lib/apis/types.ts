// lib/apis/types.ts
// Forma común que devuelven las fuentes externas de artículos (NewsAPI, Google
// Search, Wikipedia, Google News RSS…). El feed la consume en app/api/feed/generate.

export interface ExternalArticle {
    title: string;
    description: string;
    url: string;
    source: string;
    publishedAt: string;
    /** URL de imagen social/thumbnail si la fuente la proporciona */
    socialimage?: string;
}
