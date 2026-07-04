import { getOrCreateUser } from "@/lib/getOrCreateUser";
import { db } from "@/lib/db";
import { users, userInterests, userLocations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { updateProfileSchema, parseBody } from "@/lib/validation";

export async function GET() {
    try {
        const user = await getOrCreateUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        // Load user with relations
        const fullUser = await db.query.users.findFirst({
            where: eq(users.id, user.id),
            with: {
                interests: true,
                locations: {
                    where: (locations, { eq }) => eq(locations.isCurrent, true),
                    limit: 1,
                },
                settings: true,
            },
        });

        if (!fullUser) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        return NextResponse.json({
            id: fullUser.id,
            email: fullUser.email,
            username: fullUser.username,
            avatarUrl: fullUser.avatarUrl,
            bio: fullUser.bio,
            onboardingCompleted: fullUser.onboardingCompleted,
            interests: fullUser.interests,
            location: fullUser.locations[0] || null,
            settings: fullUser.settings,
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
        const user = await getOrCreateUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const parsed = await parseBody(req, updateProfileSchema);
        if (parsed.error) return parsed.error;
        const { interests, city, radiusKm, bio, avatarUrl } = parsed.data;

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

