// lib/apis/recommendations.ts
// AI-powered recommendation engine using Gemini API
// Generates "Discover something new" suggestions based on user interests

import { GoogleGenerativeAI } from "@google/generative-ai";

interface Recommendation {
    title: string;
    description: string;
    category: string;
    reason: string;
    searchQuery: string; // Used to find actual content
    icon: string; // emoji
}

// Related interests graph — maps interests to discovery opportunities
const INTEREST_GRAPH: Record<string, string[]> = {
    'gaming': ['esports', 'game development', 'retro gaming', 'board games', 'VR'],
    'videojuegos': ['esports', 'desarrollo de juegos', 'juegos retro', 'juegos de mesa', 'realidad virtual'],
    'música': ['producción musical', 'festivales', 'instrumentos', 'teoría musical', 'podcasts musicales'],
    'tecnología': ['inteligencia artificial', 'ciberseguridad', 'startups', 'open source', 'robótica'],
    'deportes': ['nutrición deportiva', 'psicología deportiva', 'entrenamiento funcional', 'deportes extremos'],
    'cine': ['series', 'documentales', 'cine independiente', 'cinematografía', 'crítica de cine'],
    'anime': ['manga', 'light novels', 'cosplay', 'cultura japonesa', 'animación'],
    'cocina': ['gastronomía molecular', 'cocina internacional', 'repostería', 'comida saludable'],
    'fotografía': ['edición de fotos', 'fotografía callejera', 'drones', 'time-lapse'],
    'viajes': ['mochilero', 'gastronomía local', 'cultura', 'aventura', 'nómada digital'],
    'programación': ['machine learning', 'web3', 'devops', 'game development', 'open source'],
    'fitness': ['yoga', 'calistenia', 'nutrición', 'meditación', 'deportes de combate'],
    'arte': ['NFT art', 'street art', 'diseño gráfico', 'escultura', 'arte digital'],
    'naturaleza': ['astronomía', 'geología', 'biología marina', 'senderismo', 'jardinería'],
    'moda': ['diseño textil', 'moda sostenible', 'estilismo', 'tendencias', 'vintage'],
};

/**
 * Get AI-powered recommendations using Gemini
 */
export async function getAIRecommendations(
    interests: string[],
    count: number = 3
): Promise<Recommendation[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return getStaticRecommendations(interests, count);

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `Eres un motor de recomendación de contenido tipo TikTok/YouTube. 
El usuario tiene estos intereses: ${interests.join(', ')}.

Genera exactamente ${count} recomendaciones de contenido nuevo que podría gustarle pero que sea DIFERENTE a sus intereses actuales. 
Cada recomendación debe ser algo que DESCUBRA, algo nuevo, sorprendente e interesante.

Responde SOLO en JSON válido, sin markdown, sin backticks:
[
  {
    "title": "Título corto y atractivo",
    "description": "Descripción de 1 línea, enganchante",
    "category": "categoría simple (ej: ciencia, arte, música, tech, cultura)",
    "reason": "Por qué le puede gustar basado en sus intereses",
    "searchQuery": "query para buscar contenido real sobre esto",
    "icon": "emoji relevante"
  }
]`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        // Parse JSON (handle potential markdown wrapping)
        const jsonStr = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        const recommendations = JSON.parse(jsonStr) as Recommendation[];
        return recommendations.slice(0, count);
    } catch (error) {
        console.error('Gemini recommendation error:', error);
        return getStaticRecommendations(interests, count);
    }
}

/**
 * Static fallback recommendations based on interest graph
 */
function getStaticRecommendations(interests: string[], count: number): Recommendation[] {
    const recommendations: Recommendation[] = [];

    for (const interest of interests) {
        const key = interest.toLowerCase();
        const related = INTEREST_GRAPH[key] || [];

        for (const suggestion of related) {
            // Skip if user already has this interest
            if (interests.some(i => i.toLowerCase() === suggestion.toLowerCase())) continue;

            recommendations.push({
                title: `Descubre: ${suggestion}`,
                description: `Basado en tu interés en ${interest}, te puede gustar ${suggestion}`,
                category: 'recommendation',
                reason: `Relacionado con ${interest}`,
                searchQuery: `${suggestion} trending 2024`,
                icon: '🎯',
            });
        }
    }

    // Shuffle and return
    return recommendations.sort(() => Math.random() - 0.5).slice(0, count);
}

/**
 * Generate fun facts related to interests using Gemini
 */
export async function generateFunFacts(
    interests: string[],
    count: number = 3
): Promise<{ title: string; fact: string; category: string; icon: string }[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return [];

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `Genera ${count} datos curiosos/facts fascinantes sobre estos temas: ${interests.join(', ')}.
Que sean SORPRENDENTES, poco conocidos, y escritos de forma enganchante como un post viral.

Responde SOLO en JSON válido sin markdown:
[
  {
    "title": "Título tipo clickbait pero real",
    "fact": "El dato curioso completo en 2-3 frases máximo",
    "category": "el tema principal",
    "icon": "emoji"
  }
]`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const jsonStr = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error('Fun facts error:', error);
        return [];
    }
}
