// app/api/user/preferences/route.ts - Theme preferences API

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// GET /api/user/preferences - Obtener preferencias de tema
export async function GET() {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, clerkId),
        });

        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        const settings = await db.query.userSettings.findFirst({
            where: eq(userSettings.userId, user.id),
        });

        // Extraer tema de las preferencias existentes
        const preferences = settings?.preferences as Record<string, unknown> | null;
        const theme = preferences?.theme || null;

        return NextResponse.json({ theme });
    } catch (error) {
        console.error('Error fetching preferences:', error);
        return NextResponse.json(
            { error: "Error al cargar preferencias" },
            { status: 500 }
        );
    }
}

// PUT /api/user/preferences - Guardar preferencias de tema
export async function PUT(req: NextRequest) {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, clerkId),
        });

        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        const { theme } = await req.json();

        // Buscar settings existentes
        const existingSettings = await db.query.userSettings.findFirst({
            where: eq(userSettings.userId, user.id),
        });

        if (existingSettings) {
            // Merge theme into existing preferences
            const currentPrefs = (existingSettings.preferences as Record<string, unknown>) || {};
            const updatedPrefs = { ...currentPrefs, theme };

            await db
                .update(userSettings)
                .set({
                    preferences: updatedPrefs as unknown as typeof existingSettings.preferences,
                    updatedAt: new Date(),
                })
                .where(eq(userSettings.id, existingSettings.id));
        } else {
            // Create new settings record with theme
            await db.insert(userSettings).values({
                userId: user.id,
                preferences: {
                    darkMode: true,
                    notificationsEnabled: false,
                    contentLanguage: ["es"],
                    distanceUnit: "km" as const,
                    feedRefreshInterval: 3600,
                    theme,
                } as unknown as typeof userSettings.$inferInsert.preferences,
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving preferences:', error);
        return NextResponse.json(
            { error: "Error al guardar preferencias" },
            { status: 500 }
        );
    }
}
