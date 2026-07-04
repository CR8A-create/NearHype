/**
 * Gemini AI Orchestrator
 * Genera queries optimizadas basadas en intereses y ubicación del usuario
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface OrchestratedQuery {
    source: 'gdelt' | 'reddit' | 'eventbrite';
    params: Record<string, unknown>;
    priority: 1 | 2 | 3;
    expected_results: number;
}

export interface OrchestrationResponse {
    queries: OrchestratedQuery[];
    search_strategy: {
        localization_tiers: string[];
        temporal_focus: string;
        expansion_needed: boolean;
    };
    metadata: {
        total_queries: number;
        estimated_api_calls: number;
        cache_duration_minutes: number;
    };
}

const ORCHESTRATOR_PROMPT = `You are NearHype's Content Discovery AI. Generate diverse, optimized queries to find content for ALL user interests.

# User Context
- **Interests**: {topics}
- **Location**: {city}, {country}
- **Language**: {language}
- **Current Time**: {current_datetime}

# CRITICAL RULES
1. **Create 2-3 queries for EACH interest** (one GDELT, one Reddit, optionally one more specialized)
2. **HIGH volume**: User wants MANY results (30-50+), not just 10
3. **Diversity is KEY**: Every interest must be represented in the results
4. **Smart keywords**: For music → "conciertos, nuevos lanzamientos, festivales"; For sports → "partidos,resultados, fichajes"

# Available Data Sources
1. **GDELT Project** (news, events, articles) - Set maxResults: 10-15 per query
2. **Reddit JSON** (communities) - Set limit: 10-15 per query

# Task
Generate 10-20 queries total that cover ALL user interests proportionally.

## Example for 5 interests: ["Videojuegos", "Música", "Tecnología", "Cine", "Deportes"]
You should generate ~2-3 queries PER interest = 10-15 queries total

- Query 1: GDELT gaming (videojuegos, lanzamientos, esports) - maxResults: 12
- Query 2: Reddit r/gaming + r/pcgaming - limit: 12
- Query 3: GDELT music (música, conciertos, festivales, artistas) - maxResults: 12
- Query 4: Reddit r/Music + r/spotify + r/concerts - limit: 12
- Query 5: GDELT tech (tecnología, gadgets, IA, apps) - maxResults: 12
- Query 6: Reddit r/technology + r/tech - limit: 12
- Query 7: GDELT movies (cine, estrenos, películas, series) - maxResults: 12
- Query 8: Reddit r/movies + r/NetflixBestOf - limit: 12
- Query 9: GDELT sports (deportes, partidos, fichajes) - maxResults: 12
- Query 10: Reddit r/sports + r/soccer - limit: 12

## Output Format (strict JSON, no markdown)
{
  "queries": [
    {
      "source": "gdelt",
      "params": {
        "keywords": ["videojuegos", "gaming", "lanzamientos"],
        "language": "spanish",
        "maxResults": 12
      },
      "priority": 1,
      "expected_results": 12,
      "interest_category": "gaming"
    },
    {
      "source": "reddit",
      "params": {
        "subreddits": ["gaming", "pcgaming"],
        "limit": 12
      },
      "priority": 1,
      "expected_results": 12,
      "interest_category": "gaming"
    }
  ],
  "search_strategy": {
    "localization_tiers": ["city", "region", "country", "global"],
    "temporal_focus": "last_72h",
    "expansion_needed": true
  },
  "metadata": {
    "total_queries": 10,
    "estimated_api_calls": 10,
    "cache_duration_minutes": 20
  }
}

# Constraints
- Generate 10-20 queries TOTAL (covering all interests equally)
- Each interest MUST have at least 2 queries (1 GDELT + 1 Reddit minimum)
- maxResults/limit should be 10-15 per query (we want VOLUME)
- Priority 1 = main interests, Priority 2 = secondary
- Output ONLY valid JSON, no extra text

# Now generate diverse queries covering ALL user interests with HIGH volume.`;

export async function orchestrateQueries(
    interests: string[],
    location: { city: string; country: string },
    language: string = "es"
): Promise<OrchestrationResponse> {
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            generationConfig: {
                temperature: 0.3,
                responseMimeType: "application/json"
            }
        });

        const context = {
            topics: interests.join(", "),
            city: location.city,
            country: location.country,
            language: language,
            current_datetime: new Date().toISOString(),
        };

        const prompt = ORCHESTRATOR_PROMPT.replace(/{(\w+)}/g, (_, key) => context[key as keyof typeof context] || key);

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        // Parse JSON response
        const orchestration = JSON.parse(response) as OrchestrationResponse;

        // Validate response
        if (!orchestration.queries || !Array.isArray(orchestration.queries)) {
            throw new Error('Invalid orchestration response');
        }

        return orchestration;
    } catch (error) {
        console.error('Gemini orchestration error:', error);

        // Fallback: generate simple queries without AI
        return generateFallbackQueries(interests);
    }
}

// Fallback cuando la IA falla - genera queries para CADA interés
function generateFallbackQueries(interests: string[]): OrchestrationResponse {
    const queries: OrchestratedQuery[] = [];

    // Para cada interés, crear 2 queries (1 GDELT + 1 Reddit)
    interests.forEach((interest, index) => {
        const priority = index < 3 ? 1 : 2; // Primeros 3 son priority 1

        // Query GDELT para este interés
        queries.push({
            source: 'gdelt',
            params: {
                keywords: [interest],
                language: 'spanish',
                maxResults: 12
            },
            priority,
            expected_results: 12
        });

        // Query Reddit para este interés
        const subreddits = getSubredditsFromInterest(interest);
        if (subreddits.length > 0) {
            queries.push({
                source: 'reddit',
                params: {
                    subreddits: subreddits,
                    limit: 12
                },
                priority,
                expected_results: 12
            });
        }
    });

    return {
        queries,
        search_strategy: {
            localization_tiers: ['city', 'region', 'country', 'global'],
            temporal_focus: 'last_week',
            expansion_needed: true
        },
        metadata: {
            total_queries: queries.length,
            estimated_api_calls: queries.length,
            cache_duration_minutes: 20
        }
    };
}

// Mapeo mejorado de intereses a subreddits
function getSubredditsFromInterest(interest: string): string[] {
    const mapping: Record<string, string[]> = {
        // Gaming
        "videojuegos": ["gaming", "pcgaming", "Games"],
        "gaming": ["gaming", "pcgaming"],

        // Música
        "música": ["Music", "spotify", "concerts"],
        "music": ["Music", "ListenToThis"],

        // Tecnología
        "tecnología": ["technology", "tech", "gadgets"],
        "tech": ["technology", "gadgets"],

        // Deportes
        "deportes": ["sports", "soccer", "nba"],
        "sports": ["sports", "soccer"],

        // Gastronomía
        "gastronomía": ["food", "Cooking", "recipes"],
        "food": ["food", "Cooking"],

        // Cine & Cultura
        "cine": ["movies", "NetflixBestOf", "television"],
        "movies": ["movies", "cinema"],
        "cultura": ["books", "art", "museum"],

        // Fotografía & Arte
        "fotografía": ["photography", "itookapicture"],
        "photography": ["photography"],
        "arte": ["Art", "museum"],
        "art": ["Art"],

        // Moda
        "moda": ["fashion", "streetwear"],
        "fashion": ["fashion"],

        // Lectura
        "lectura": ["books", "booksuggestions"],
        "books": ["books", "reading"],
    };

    const normalized = interest.toLowerCase();
    return mapping[normalized] || [];
}

function getSubredditsFromInterests(interests: string[]): string[] {
    const subs = new Set<string>();
    interests.forEach(interest => {
        const found = getSubredditsFromInterest(interest);
        found.forEach(sub => subs.add(sub));
    });
    return Array.from(subs).slice(0, 10); // Aumentado de 5 a 10
}
