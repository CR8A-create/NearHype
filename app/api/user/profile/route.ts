import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, userInterests, userLocations, userSettings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

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
            bio: user.bio,
            onboardingCompleted: user.onboardingCompleted,
            interests: user.interests,
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

        const body = await req.json();
        const { interests, city, radiusKm, bio, avatarUrl } = body;

        // Actualizar datos básicos de perfil (bio, avatar)
        if (bio !== undefined || avatarUrl !== undefined) {
            await db.update(users).set({
                ...(bio !== undefined ? { bio } : {}),
                ...(avatarUrl !== undefined ? { avatarUrl } : {}),
            }).where(eq(users.id, user.id));
        }

        // Actualizar intereses (eliminar viejos, agregar nuevos)
        if (interests) {
            // Eliminar todos los intereses actuales
            await db.delete(userInterests).where(eq(userInterests.userId, user.id));

            // Agregar nuevos intereses
            if (interests.length > 0) {
                await db.insert(userInterests).values(
                    interests.map((topic: string) => ({
                        userId: user.id,
                        topic: topic.trim(),
                        relevanceWeight: 1.0,
                    }))
                );
            }
        }

        // Actualizar ubicación
        if (city) {
            // Geocoding simple con Nominatim
            try {
                const geoRes = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
                    {
                        headers: {
                            "User-Agent": "NearHype/1.0"
                        }
                    }
                );
                const geoData = await geoRes.json();

                if (geoData && geoData[0]) {
                    const { lat, lon, address } = geoData[0];

                    // Marcar ubicaciones previas como no actuales
                    await db
                        .update(userLocations)
                        .set({ isCurrent: false })
                        .where(eq(userLocations.userId, user.id));

                    // Insertar nueva ubicación
                    await db.insert(userLocations).values({
                        userId: user.id,
                        latitude: parseFloat(lat),
                        longitude: parseFloat(lon),
                        city: city,
                        countryCode: address?.country_code?.toUpperCase() || "ES",
                        radiusKm: radiusKm || 20,
                        isCurrent: true,
                    });
                }
            } catch (geoError) {
                console.error("Error geocoding:", geoError);
                // Continuar sin error crítico
            }
        } else if (radiusKm) {
            // Si solo cambia el radio pero no la ciudad, actualizar el radio de la ubicación actual
            await db.update(userLocations)
                .set({ radiusKm })
                .where(and(eq(userLocations.userId, user.id), eq(userLocations.isCurrent, true)));
        }

        return NextResponse.json({ success: true, message: "Perfil actualizado" });
    } catch (error) {
        console.error("Error updating profile:", error);
        return NextResponse.json(
            { error: "Error al actualizar el perfil" },
            { status: 500 }
        );
    }
}

