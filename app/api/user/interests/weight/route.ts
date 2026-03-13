import { getOrCreateUser } from "@/lib/getOrCreateUser";
import { db } from "@/lib/db";
import { userInterests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const CLICK_DELTA = 0.15;
const MIN_WEIGHT = 0.1;
const MAX_WEIGHT = 5.0;

// Mirrors mapInterestToCategory in the feed generator — used for reverse lookup
function mapInterestToCategory(interest: string): string {
    const map: Record<string, string> = {
        'gaming': 'gaming', 'videojuegos': 'gaming', 'juegos': 'gaming',
        'música': 'music', 'music': 'music', 'rap': 'music', 'rock': 'music', 'pop': 'music',
        'tecnología': 'technology', 'technology': 'technology', 'programación': 'technology',
        'deportes': 'sports', 'football': 'sports', 'fútbol': 'sports',
        'ciencia': 'science', 'science': 'science',
        'cine': 'movies', 'películas': 'movies', 'anime': 'movies',
        'cocina': 'food', 'comida': 'food',
        'viajes': 'travel',
        'arte': 'art', 'fotografía': 'art',
    };
    const key = interest.toLowerCase();
    for (const [k, v] of Object.entries(map)) {
        if (key.includes(k)) return v;
    }
    return 'default';
}

export async function POST(req: NextRequest) {
    try {
        const user = await getOrCreateUser();
        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const body = await req.json();
        const { topic, action } = body;

        if (!topic || typeof topic !== "string") {
            return NextResponse.json({ error: "topic es requerido" }, { status: 400 });
        }

        if (action !== "click") {
            return NextResponse.json({ error: "action debe ser 'click'" }, { status: 400 });
        }

        // Fetch all user interests and find the one matching this category
        const allInterests = await db.query.userInterests.findMany({
            where: eq(userInterests.userId, user.id),
        });

        // Match by exact topic name first, then by category reverse-mapping
        const interest = allInterests.find(
            (i) =>
                i.topic.toLowerCase() === topic.toLowerCase() ||
                mapInterestToCategory(i.topic) === topic.toLowerCase()
        );

        if (!interest) {
            return NextResponse.json({ ok: true, matched: false });
        }

        const currentWeight = interest.relevanceWeight ?? 1.0;
        const newWeight = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, currentWeight + CLICK_DELTA));

        await db
            .update(userInterests)
            .set({ relevanceWeight: newWeight })
            .where(eq(userInterests.id, interest.id));

        return NextResponse.json({
            ok: true,
            matched: true,
            topic: interest.topic,
            previousWeight: Number(currentWeight.toFixed(2)),
            newWeight: Number(newWeight.toFixed(2)),
        });
    } catch (error) {
        console.error("Error updating interest weight:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
