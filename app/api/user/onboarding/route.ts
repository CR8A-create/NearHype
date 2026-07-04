import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, userInterests, userLocations, userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { onboardingSchema, parseBody } from "@/lib/validation";

export async function POST(req: NextRequest) {
    try {
        const { userId: clerkId } = await auth();
        const user = await currentUser();

        if (!clerkId || !user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const parsed = await parseBody(req, onboardingSchema);
        if (parsed.error) return parsed.error;
        const { interests, location, locationConsent } = parsed.data;

        // Verificar si el usuario ya existe
        let dbUser = await db.query.users.findFirst({
            where: eq(users.clerkId, clerkId),
        });

        // Si no existe, crearlo
        if (!dbUser) {
            const [newUser] = await db.insert(users).values({
                clerkId: clerkId,
                email: user.emailAddresses[0]?.emailAddress || "",
                username: user.username || user.firstName || `user_${clerkId.slice(0, 8)}`,
                avatarUrl: user.imageUrl,
                onboardingCompleted: false,
            }).returning();

            dbUser = newUser;
        }

        // Guardar intereses (primero borrar los existentes)
        await db.delete(userInterests).where(eq(userInterests.userId, dbUser.id));

        const interestsToInsert = interests.map(topic => ({
            userId: dbUser!.id,
            topic: topic,
            relevanceWeight: 1.0,
        }));

        await db.insert(userInterests).values(interestsToInsert);

        // Guardar ubicación solo si se proporcionó
        if (location && location.city && locationConsent) {
            // Desactivar ubicaciones anteriores
            await db
                .update(userLocations)
                .set({ isCurrent: false })
                .where(eq(userLocations.userId, dbUser.id));

            // Guardar nueva ubicación
            await db.insert(userLocations).values({
                userId: dbUser.id,
                latitude: location.lat || 0,
                longitude: location.lon || 0,
                city: location.city,
                countryCode: "ES", // Por defecto España, se puede mejorar
                radiusKm: 20,
                isCurrent: true,
            });
        }

        // Crear o actualizar settings
        const existingSettings = await db.query.userSettings.findFirst({
            where: eq(userSettings.userId, dbUser.id),
        });

        if (!existingSettings) {
            await db.insert(userSettings).values({
                userId: dbUser.id,
                locationConsent: locationConsent,
                preferences: {
                    darkMode: true,
                    notificationsEnabled: false,
                    contentLanguage: ["es"],
                    distanceUnit: "km",
                    feedRefreshInterval: 3600,
                },
            });
        } else {
            await db
                .update(userSettings)
                .set({ locationConsent: locationConsent })
                .where(eq(userSettings.userId, dbUser.id));
        }

        // Marcar onboarding como completado
        await db
            .update(users)
            .set({
                onboardingCompleted: true,
                lastLogin: new Date(),
            })
            .where(eq(users.id, dbUser.id));

        return NextResponse.json({
            success: true,
            message: "Onboarding completado",
        });
    } catch (error) {
        console.error("Error completing onboarding:", error);
        return NextResponse.json(
            { error: "Error al completar el onboarding" },
            { status: 500 }
        );
    }
}
