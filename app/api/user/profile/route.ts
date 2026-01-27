import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, userInterests, userLocations, userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        // Buscar usuario en la DB
        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, clerkId),
            with: {
                interests: true,
                locations: {
                    where: (locations, { eq }) => eq(locations.isCurrent, true),
                    limit: 1,
                },
                settings: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        return NextResponse.json({
            id: user.id,
            email: user.email,
            username: user.username,
            avatarUrl: user.avatarUrl,
            onboardingCompleted: user.onboardingCompleted,
            interests: user.interests.map(i => i.topic),
            location: user.locations[0] || null,
            settings: user.settings,
        });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return NextResponse.json(
            { error: "Error al obtener el perfil" },
            { status: 500 }
        );
    }
}
